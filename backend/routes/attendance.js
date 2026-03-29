import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import Attendance from '../models/Attendance.js';
import AttendanceEvaluation from '../models/AttendanceEvaluation.js';
import AttendanceException from '../models/AttendanceException.js';
import AttendancePolicy from '../models/AttendancePolicy.js';
import User from '../models/User.js';
import { logChange } from '../utils/changeLogService.js';
import getClientIP from '../utils/getClientIP.js';
import { resolveShiftAndComputeMetrics } from '../utils/shiftService.js';
import AttendancePolicyEngine from '../services/attendancePolicyService.js';
import AttendanceAutomationService, { ATTENDANCE_EVENTS } from '../services/attendanceAutomationService.js';
import VerificationService from '../services/verificationService.js';
import AttendanceReviewService from '../services/attendanceReviewService.js';
import AuditService from '../services/auditService.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Holiday from '../models/Holiday.js';

const router = express.Router();
const MARKABLE_STATUSES = new Set(['present', 'absent', 'half_day', 'leave', 'wfh', 'holiday']);

const normalizeAttendanceStatus = (value) => {
  if (typeof value !== 'string') return '';

  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const aliases = {
    halfday: 'half_day',
    work_from_home: 'wfh'
  };

  return aliases[normalized] || normalized;
};

const parseOptionalDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveAttendanceDay = (value) => {
  const input = value ?? new Date();

  // Parse YYYY-MM-DD as local calendar day to avoid UTC date-shift issues.
  if (typeof input === 'string') {
    const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, y, m, d] = match;
      const localDay = new Date(Number(y), Number(m) - 1, Number(d));
      if (!Number.isNaN(localDay.getTime())) {
        const dayStart = new Date(localDay);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return { dayStart, dayEnd };
      }
    }
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dayStart = new Date(parsed);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const toGeoPoint = (gps) => {
  if (!gps) return null;

  const latitude = Number(gps.latitude);
  const longitude = Number(gps.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
};

const getAttendanceGovernance = (settings) => {
  const governance = settings?.attendanceGovernance || {};
  return {
    regularAttendanceMarkedBy: governance.regularAttendanceMarkedBy || 'self',
    specialDays: Array.isArray(governance.specialDays) ? governance.specialDays : []
  };
};

const sameCalendarDay = (left, right) => {
  const l = new Date(left);
  const r = new Date(right);
  return l.getFullYear() === r.getFullYear() && l.getMonth() === r.getMonth() && l.getDate() === r.getDate();
};

const isSpecialGovernedDay = (specialDays, dayStart) => {
  return (specialDays || []).find((d) => d?.isActive !== false && d?.date && sameCalendarDay(d.date, dayStart));
};

const isRecurringHolidayMatch = (holidayDate, dayStart) => {
  const h = new Date(holidayDate);
  return h.getMonth() === dayStart.getMonth() && h.getDate() === dayStart.getDate();
};

// Get attendance records (filtered by month/user)
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, year, userId } = req.query;

    const query = {};

    // HR/Admin can view all; members can view only their own
    if (req.user.role === 'member') {
      query.userId = req.user._id;
    } else if (userId) {
      query.userId = userId;
    }

    // Filter by month/year
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(query)
      .populate('userId', 'full_name email profile_picture')
      .populate('overrideBy', 'full_name email')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, records });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// Get evaluation for a specific attendance record
router.get('/evaluations/:id', authenticate, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Members can only view their own attendance evaluations
    if (req.user.role === 'member' && attendance.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get the evaluation for this attendance
    const evaluation = await AttendanceEvaluation.findOne({ attendanceId: req.params.id });
    
    res.json({ 
      success: true, 
      evaluation 
    });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({ message: 'Failed to fetch evaluation' });
  }
});


router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { date } = req.body;
    const dayWindow = resolveAttendanceDay(date);
    if (!dayWindow) {
      return res.status(400).json({ message: 'Invalid date value for checkout' });
    }
    const { dayStart, dayEnd } = dayWindow;

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: { $gte: dayStart, $lt: dayEnd }
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    const checkOutTime = new Date();
    attendance.checkOut = checkOutTime;

    // Store original times before modification
    attendance.originalCheckIn = attendance.checkIn;
    attendance.originalCheckOut = attendance.checkOut;

    // Compute shift-aware metrics on check-out
    let shift = null;
    try {
      const metrics = await resolveShiftAndComputeMetrics(
        req.user._id, dayStart, attendance.checkIn, checkOutTime
      );
      if (metrics.shift) {
        shift = metrics.shift;
        attendance.shift_id = metrics.shift._id;
        attendance.expected_hours = metrics.shift.total_hours;
      }
      if (!attendance.isOverride) {
        attendance.status = metrics.status;
      }
      attendance.late_minutes = metrics.late_minutes;
      attendance.early_exit_minutes = metrics.early_exit_minutes;
      attendance.overtime_hours = metrics.overtime_hours;
      attendance.shift_status = metrics.shift_status;
      // workingHours is also set by pre-save but let's align with shift calc
      attendance.workingHours = metrics.working_hours;
    } catch (_) { /* silently skip shift resolution on error */ }

    await attendance.save();

    // Evaluate against policy
    let evaluation = null;
    try {
      const evalResult = await AttendancePolicyEngine.evaluate({
        userId: req.user._id,
        date: dayStart,
        checkInTime: attendance.checkIn,
        checkOutTime: attendance.checkOut,
        shift,
        workMode: attendance.workMode,
        attendanceId: attendance._id,
        evaluatedBy: req.user._id
      });
      evaluation = evalResult.evaluation;
      
      // Update attendance with evaluation result
      if (evalResult.status && !attendance.isOverride) {
        attendance.status = evalResult.status;
        await attendance.save();
      }
    } catch (evalError) {
      console.error('Policy evaluation error:', evalError);
    }

    // Trigger automation hooks
    try {
      await AttendanceAutomationService.handleCheckOut(attendance, evaluation);
    } catch (hookError) {
      console.error('Automation hook error:', hookError);
    }

    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance',
      entityId: attendance._id,
      details: { action: 'check-out', time: attendance.checkOut, hours: attendance.workingHours },
      ipAddress: getClientIP(req)
    });

    res.json({ 
      success: true, 
      attendance,
      evaluation,
      flags: evaluation?.flags || {}
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Failed to check out' });
  }
});

// Admin/HR: Mark attendance for any user
router.post('/mark', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { userId, date, status, checkIn, checkOut, notes } = req.body;

    if (!userId || !date || !status) {
      return res.status(400).json({ message: 'userId, date, and status are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const normalizedStatus = normalizeAttendanceStatus(status);
    if (!MARKABLE_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${Array.from(MARKABLE_STATUSES).join(', ')}`
      });
    }

    const dayWindow = resolveAttendanceDay(date);
    if (!dayWindow) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    const { dayStart, dayEnd } = dayWindow;

    const verificationSettings = await VerificationService.getSettings(req.user.workspaceId);
    const attendanceGovernance = getAttendanceGovernance(verificationSettings);
    const regularAttendanceMarkedBy = attendanceGovernance.regularAttendanceMarkedBy;
    const specialDay = isSpecialGovernedDay(attendanceGovernance.specialDays, dayStart);

    const regularStatuses = new Set(['present', 'absent', 'half_day', 'wfh']);
    if (regularStatuses.has(normalizedStatus) && regularAttendanceMarkedBy !== 'self' && req.user.role !== regularAttendanceMarkedBy) {
      return res.status(403).json({
        message: `Regular attendance is configured to be marked by ${regularAttendanceMarkedBy.toUpperCase()} only.`
      });
    }

    // Leave attendance must be marked by HR as requested.
    if (normalizedStatus === 'leave' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Leave attendance can only be marked by HR.' });
    }

    // Holiday attendance must be marked by Admin as requested.
    if (normalizedStatus === 'holiday' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Holiday attendance can only be marked by Admin.' });
    }

    // Special meeting/specified days are controlled by configured role (default HR).
    if (specialDay && req.user.role !== (specialDay.markedBy || 'hr')) {
      return res.status(403).json({
        message: `Attendance for this special day is controlled by ${(specialDay.markedBy || 'hr').toUpperCase()}.`
      });
    }

    const parsedCheckIn = parseOptionalDate(checkIn);
    const parsedCheckOut = parseOptionalDate(checkOut);
    if (checkIn && !parsedCheckIn) {
      return res.status(400).json({ message: 'Invalid checkIn datetime' });
    }
    if (checkOut && !parsedCheckOut) {
      return res.status(400).json({ message: 'Invalid checkOut datetime' });
    }

    // Verify user exists
    const targetUser = await User.findOne({ _id: userId });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      userId,
      date: { $gte: dayStart, $lt: dayEnd }
    });

    if (attendance) {
      // Update existing
      attendance.status = normalizedStatus;
      attendance.checkIn = parsedCheckIn;
      attendance.checkOut = parsedCheckOut;
      attendance.notes = notes || attendance.notes;
      attendance.isOverride = true;
      attendance.overrideBy = req.user._id;
    } else {
      // Create new
      attendance = new Attendance({
        userId,
        date: dayStart,
        status: normalizedStatus,
        checkIn: parsedCheckIn || (normalizedStatus === 'present' ? new Date() : null),
        checkOut: parsedCheckOut,
        notes,
        isOverride: true,
        overrideBy: req.user._id
      });
    }

    try {
      await attendance.save();
    } catch (saveError) {
      // Handle race condition on unique index (userId + date) for concurrent mark calls.
      if (saveError?.code === 11000) {
        attendance = await Attendance.findOne({ userId, date: { $gte: dayStart, $lt: dayEnd } });
        if (!attendance) {
          throw saveError;
        }

        attendance.status = normalizedStatus;
        attendance.checkIn = parsedCheckIn;
        attendance.checkOut = parsedCheckOut;
        attendance.notes = notes || attendance.notes;
        attendance.isOverride = true;
        attendance.overrideBy = req.user._id;
        await attendance.save();
      } else {
        throw saveError;
      }
    }

    await logChange({
      userId: req.user._id,
      action: attendance.isNew ? 'create' : 'update',
      entity: 'attendance',
      entityId: attendance._id,
      details: { action: 'mark-attendance', targetUser: userId, status: normalizedStatus, date },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

// Admin: Override attendance
router.put('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { status, checkIn, checkOut, notes } = req.body;

    const attendance = await Attendance.findOne({
      _id: req.params.id
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.status = status || attendance.status;
    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    attendance.notes = notes || attendance.notes;
    attendance.isOverride = true;
    attendance.overrideBy = req.user._id;

    await attendance.save();

    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance',
      entityId: attendance._id,
      details: { action: 'admin-override', status, notes },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Override attendance error:', error);
    res.status(500).json({ message: 'Failed to override attendance' });
  }
});

// Get attendance summary for the current user or a specific user.
const getAttendanceSummary = async (req, res) => {
  try {
    const targetUserId = (req.params.userId || req.user._id).toString();
    const requesterId = req.user._id.toString();
    const requesterRole = req.user.role;

    // Members can only view their own summary
    if (requesterRole === 'member' && targetUserId !== requesterId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Team leads can only view summaries of members within their own team
    if (requesterRole === 'team_lead' && targetUserId !== requesterId) {
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findOne({ lead_id: requesterId });
      if (!team) return res.status(403).json({ message: 'Unauthorized' });
      const memberIds = team.members.map(id => id.toString());
      if (!memberIds.includes(targetUserId)) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const records = await Attendance.find({
      userId: targetUserId,
      date: { $gte: startDate, $lte: endDate }
    });

    const summary = {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
      leave: records.filter(r => r.status === 'leave').length,
      wfh: records.filter(r => r.status === 'wfh').length,
      totalHours: records.reduce((sum, r) => sum + r.workingHours, 0)
    };

    res.json({ success: true, summary, records });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
};

router.get('/summary', authenticate, getAttendanceSummary);
router.get('/summary/:userId', authenticate, getAttendanceSummary);

// ==================== Policy Management Routes ====================

// Get all attendance policies
router.get('/policies', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const policies = await AttendancePolicy.find()
      .populate('created_by', 'full_name email')
      .sort({ priority: -1, created_at: -1 });
    
    res.json({ success: true, policies });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ message: 'Failed to fetch policies' });
  }
});

// Create attendance policy
router.post('/policies', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { policy_name, description, scope, rules, shift_config, priority, effective_from, effective_until, notes } = req.body;

    const policy = new AttendancePolicy({
      policy_name,
      description,
      scope,
      rules,
      shift_config,
      priority: priority || 0,
      created_by: req.user._id,
      effective_from: effective_from || Date.now(),
      effective_until,
      notes
    });

    await policy.save();

    await logChange({
      userId: req.user._id,
      action: 'create',
      entity: 'attendance_policy',
      entityId: policy._id,
      details: { action: 'create-policy', name: policy_name },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, policy });
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ message: 'Failed to create policy' });
  }
});

// Update attendance policy
router.put('/policies/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const policy = await AttendancePolicy.findById(req.params.id);
    
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    const updates = req.body;
    delete updates._id;
    delete updates.created_by;
    delete updates.created_at;

    Object.assign(policy, updates);
    await policy.save();

    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance_policy',
      entityId: policy._id,
      details: { action: 'update-policy', name: policy.policy_name },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, policy });
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ message: 'Failed to update policy' });
  }
});

// Delete attendance policy
router.delete('/policies/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const policy = await AttendancePolicy.findByIdAndDelete(req.params.id);
    
    if (!policy) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    await logChange({
      userId: req.user._id,
      action: 'delete',
      entity: 'attendance_policy',
      entityId: policy._id,
      details: { action: 'delete-policy', name: policy.policy_name },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, message: 'Policy deleted' });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ message: 'Failed to delete policy' });
  }
});

// ==================== Exception Management Routes ====================

// Get exceptions (for HR/admin)
router.get('/exceptions', authenticate, checkRole(['admin', 'hr', 'team_lead']), async (req, res) => {
  try {
    const { status, exception_type, userId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by exception type
    if (exception_type) {
      query.exception_type = exception_type;
    }

    // Filter by user
    if (userId) {
      query.user_id = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // For team leads, filter to their team members
    if (req.user.role === 'team_lead') {
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findOne({ lead_id: req.user._id });
      if (team) {
        query.user_id = { $in: team.members };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const exceptions = await AttendanceException.find(query)
      .populate('user_id', 'full_name email profile_picture')
      .populate('requested_by', 'full_name email')
      .populate('approval.processed_by', 'full_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AttendanceException.countDocuments(query);

    res.json({ 
      success: true, 
      exceptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get exceptions error:', error);
    res.status(500).json({ message: 'Failed to fetch exceptions' });
  }
});

// Get user's own exceptions
router.get('/my-exceptions', authenticate, async (req, res) => {
  try {
    const exceptions = await AttendanceException.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50);

    res.json({ success: true, exceptions });
  } catch (error) {
    console.error('Get my exceptions error:', error);
    res.status(500).json({ message: 'Failed to fetch exceptions' });
  }
});

// Create exception request
router.post('/exceptions', authenticate, async (req, res) => {
  try {
    const { exception_type, date, details } = req.body;

    const exception = new AttendanceException({
      exception_type,
      user_id: req.user._id,
      date: new Date(date),
      details,
      status: 'PENDING',
      requested_by: req.user._id
    });

    await exception.save();

    // Trigger automation
    await AttendanceAutomationService.handleExceptionCreated(exception);

    await logChange({
      userId: req.user._id,
      action: 'create',
      entity: 'attendance_exception',
      entityId: exception._id,
      details: { action: 'create-exception', type: exception_type },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, exception });
  } catch (error) {
    console.error('Create exception error:', error);
    res.status(500).json({ message: 'Failed to create exception request' });
  }
});

// Approve exception
router.post('/exceptions/:id/approve', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { response_reason } = req.body;

    const exception = await AttendanceException.findById(req.params.id);
    
    if (!exception) {
      return res.status(404).json({ message: 'Exception not found' });
    }

    if (exception.status !== 'PENDING') {
      return res.status(400).json({ message: 'Exception already processed' });
    }

    exception.status = 'APPROVED';
    exception.approval = {
      processed_by: req.user._id,
      processed_at: new Date(),
      response_reason: response_reason || ''
    };

    await exception.save();

    // Trigger automation
    await AttendanceAutomationService.handleExceptionApproved(exception, req.user._id);

    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance_exception',
      entityId: exception._id,
      details: { action: 'approve-exception', type: exception.exception_type },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, exception });
  } catch (error) {
    console.error('Approve exception error:', error);
    res.status(500).json({ message: 'Failed to approve exception' });
  }
});

// Reject exception
router.post('/exceptions/:id/reject', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { response_reason } = req.body;

    const exception = await AttendanceException.findById(req.params.id);
    
    if (!exception) {
      return res.status(404).json({ message: 'Exception not found' });
    }

    if (exception.status !== 'PENDING') {
      return res.status(400).json({ message: 'Exception already processed' });
    }

    exception.status = 'REJECTED';
    exception.approval = {
      processed_by: req.user._id,
      processed_at: new Date(),
      response_reason: response_reason || ''
    };

    await exception.save();

    // Trigger automation
    await AttendanceAutomationService.handleExceptionRejected(exception, req.user._id, response_reason);

    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance_exception',
      entityId: exception._id,
      details: { action: 'reject-exception', type: exception.exception_type },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, exception });
  } catch (error) {
    console.error('Reject exception error:', error);
    res.status(500).json({ message: 'Failed to reject exception' });
  }
});

// ==================== Evaluation Routes ====================

// Get evaluations for a user
router.get('/evaluations', authenticate, async (req, res) => {
  try {
    const { userId, startDate, endDate, flag } = req.query;
    
    const query = {};

    // Members can only view their own evaluations
    if (req.user.role === 'member') {
      query.user_id = req.user._id;
    } else if (userId) {
      query.user_id = userId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Filter by flag
    if (flag) {
      query['flags.triggered'] = flag;
    }

    const evaluations = await AttendanceEvaluation.find(query)
      .populate('user_id', 'full_name email profile_picture')
      .populate('policy_id', 'policy_name')
      .sort({ date: -1 })
      .limit(100);

    res.json({ success: true, evaluations });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({ message: 'Failed to fetch evaluations' });
  }
});

// Get evaluation for specific attendance
router.get('/evaluations/:attendanceId', authenticate, async (req, res) => {
  try {
    const evaluation = await AttendanceEvaluation.findOne({ attendance_id: req.params.attendanceId })
      .populate('user_id', 'full_name email profile_picture')
      .populate('policy_id');

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }

    // Members can only view their own evaluations
    if (req.user.role === 'member' && evaluation.user_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({ message: 'Failed to fetch evaluation' });
  }
});

// ==================== Advanced Admin Routes ====================

// Get attendance dashboard data
router.get('/dashboard', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { startDate, endDate, teamId } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const dateFilter = { $gte: start, $lte: end };

    // Base query
    const attendanceQuery = { date: dateFilter };
    const evaluationQuery = { date: dateFilter };

    // Get attendance stats
    const attendanceStats = await Attendance.aggregate([
      { $match: { date: dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$workingHours' }
        }
      }
    ]);

    // Get flagged records count
    const flaggedCount = await AttendanceEvaluation.countDocuments({
      date: dateFilter,
      'flags.triggered': { $exists: true, $ne: [] }
    });

    // Get pending exceptions
    const pendingExceptions = await AttendanceException.countDocuments({
      status: 'PENDING',
      date: dateFilter
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true }
    });

    const todayAbsent = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      $or: [
        { checkIn: { $exists: false } },
        { checkIn: null }
      ]
    });

    res.json({
      success: true,
      stats: {
        attendanceByStatus: attendanceStats,
        flaggedRecords: flaggedCount,
        pendingExceptions,
        today: {
          present: todayAttendance,
          absent: todayAbsent
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Manual evaluation trigger (for recalculating past records)
router.post('/recalculate', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { attendanceId } = req.body;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Get shift if available
    let shift = null;
    if (attendance.shift_id) {
      const Shift = (await import('../models/Shift.js')).default;
      shift = await Shift.findById(attendance.shift_id);
    }

    const evalResult = await AttendancePolicyEngine.evaluate({
      userId: attendance.userId,
      date: attendance.date,
      checkInTime: attendance.checkIn,
      checkOutTime: attendance.checkOut,
      shift,
      workMode: attendance.workMode,
      attendanceId: attendance._id,
      isOverride: attendance.isOverride,
      overrideBy: attendance.overrideBy,
      overrideReason: attendance.overrideReason,
      evaluatedBy: req.user._id
    });

    // Update attendance with new evaluation
    if (evalResult.status && !attendance.isOverride) {
      attendance.status = evalResult.status;
      await attendance.save();
    }

    res.json({ success: true, evaluation: evalResult.evaluation });
  } catch (error) {
    console.error('Recalculate error:', error);
    res.status(500).json({ message: 'Failed to recalculate' });
  }
});

// ==================== Verification Settings Routes ====================

/**
 * GET /api/attendance/verification-settings
 * Get workspace verification settings
 * @route GET /api/hr/attendance/verification-settings
 * @access Private (Admin/HR only)
 */
router.get('/verification-settings', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const settings = await VerificationService.getSettings(workspaceId);

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get verification settings error:', error);
    res.status(500).json({ message: 'Failed to fetch verification settings' });
  }
});

/**
 * PUT /api/attendance/verification-settings
 * Update verification settings
 * @route PUT /api/hr/attendance/verification-settings
 * @access Private (Admin only)
 */
router.put('/verification-settings', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    
    // Validate workspaceId is present
    if (!workspaceId) {
      console.error('VerificationSettings update error: User has no workspaceId assigned', {
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role
      });
      return res.status(400).json({ 
        message: 'Workspace not assigned. Please contact your administrator to assign a workspace to your account.' 
      });
    }
    
    const { photoVerification, gpsVerification, security, attendanceGovernance } = req.body;
    
    const settings = await VerificationService.updateSettings(
      workspaceId,
      { photoVerification, gpsVerification, security, attendanceGovernance },
      req.user._id
    );
    
    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'verification_settings',
      entityId: settings._id,
      details: { action: 'update-verification-settings' },
      ipAddress: getClientIP(req)
    });
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update verification settings error:', error);
    res.status(500).json({ message: 'Failed to update verification settings' });
  }
});

// ==================== Enhanced Check-in with Verification ====================

/**
 * POST /api/attendance/checkin
 * Enhanced check-in with photo, GPS, and device verification
 * @route POST /api/hr/attendance/checkin
 * @access Private
 */
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { 
      workMode, 
      reason, 
      attachmentUrl, 
      attachmentType, 
      date,
      photo,
      gpsLocation,
      deviceInfo
    } = req.body;
    
    const dayWindow = resolveAttendanceDay(date);
    if (!dayWindow) {
      return res.status(400).json({ message: 'Invalid date value for check-in' });
    }
    const { dayStart, dayEnd } = dayWindow;

    const workspaceId = req.user.workspaceId;
    const verificationSettings = await VerificationService.getSettings(workspaceId);
    const attendanceGovernance = getAttendanceGovernance(verificationSettings);

    // If regular attendance is not self-marked, check-in must be blocked.
    if (attendanceGovernance.regularAttendanceMarkedBy !== 'self') {
      return res.status(403).json({
        message: `Self check-in is disabled. Regular attendance is marked by ${attendanceGovernance.regularAttendanceMarkedBy.toUpperCase()}.`
      });
    }

    // If this is configured as a special governed day (e.g. meeting day), self check-in is blocked.
    const specialDay = isSpecialGovernedDay(attendanceGovernance.specialDays, dayStart);
    if (specialDay) {
      return res.status(403).json({
        message: `Self check-in is disabled for this special day. Attendance is marked by ${(specialDay.markedBy || 'hr').toUpperCase()}.`
      });
    }

    // Approved leave should lock attendance and prevent check-in.
    const approvedLeave = await LeaveRequest.findOne({
      userId: req.user._id,
      status: 'approved',
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    });
    if (approvedLeave) {
      return res.status(403).json({ message: 'You are on approved leave for this date. Attendance is marked by HR.' });
    }

    // Holidays should lock attendance and prevent check-in.
    const oneTimeHoliday = await Holiday.findOne({ isActive: true, date: { $gte: dayStart, $lt: dayEnd } });
    let recurringHoliday = null;
    if (!oneTimeHoliday) {
      const recurringHolidays = await Holiday.find({ isActive: true, isRecurring: true });
      recurringHoliday = recurringHolidays.find((h) => isRecurringHolidayMatch(h.date, dayStart)) || null;
    }
    if (oneTimeHoliday || recurringHoliday) {
      return res.status(403).json({ message: 'Today is a holiday. Attendance is managed by Admin.' });
    }

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: { $gte: dayStart, $lt: dayEnd }
    });

    // If attendance is already manually marked by HR/Admin, self check-in must not override it.
    if (attendance?.isOverride) {
      return res.status(403).json({ message: 'Attendance for this day is already marked by HR/Admin.' });
    }

    if (attendance && attendance.checkIn) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    if (!attendance) {
      attendance = new Attendance({
        userId: req.user._id,
        date: dayStart,
        workspaceId: req.user.workspaceId
      });
    }

    // Use actual current time for check-in; `date` param only controls which day's record to target
    const checkInTime = new Date();
    attendance.checkIn = checkInTime;
    attendance.status = 'present';
    
    // New fields
    if (workMode) attendance.workMode = workMode;
    if (reason) attendance.reason = reason;
    if (attachmentUrl) attendance.attachmentUrl = attachmentUrl;
    if (attachmentType) attendance.attachmentType = attachmentType;

    // Perform verification if photo or GPS data is provided
    let verificationResult = null;
    if (photo || gpsLocation) {
      verificationResult = await VerificationService.verifyCheckIn(
        req.user._id,
        workspaceId,
        photo,
        gpsLocation,
        deviceInfo || { userAgent: req.headers['user-agent'] }
      );
      
      // Store verification data in attendance
      if (verificationResult.data) {
        const geoPoint = toGeoPoint(verificationResult.data.gps);
        attendance.verification = {
          photoUrl: verificationResult.data.photo?.url,
          photoPublicId: verificationResult.data.photo?.publicId,
          photoHash: verificationResult.data.photo?.hash,
          gpsLocation: verificationResult.data.gps,
          ...(geoPoint ? { geoPoint } : {}),
          deviceInfo: verificationResult.data.deviceInfo,
          serverTimestamp: verificationResult.data.serverTimestamp
        };
        
        attendance.verificationStatus = verificationResult.status;
        attendance.verificationFlags = verificationResult.flags;
      }
    }

    // Resolve shift for today and attach shift_id / expected_hours
    let shift = null;
    try {
      const shiftResult = await resolveShiftAndComputeMetrics(req.user._id, dayStart, checkInTime, null);
      if (shiftResult.shift) {
        shift = shiftResult.shift;
        attendance.shift_id = shift._id;
        attendance.expected_hours = shift.total_hours;
      }
    } catch (_) { /* silently skip shift resolution on error */ }

    try {
      await attendance.save();
    } catch (saveError) {
      if (saveError?.code === 11000) {
        const existing = await Attendance.findOne({
          userId: req.user._id,
          date: { $gte: dayStart, $lt: dayEnd }
        });

        if (existing?.checkIn) {
          return res.status(400).json({ message: 'Already checked in today' });
        }
      }
      throw saveError;
    }

    // Evaluate against policy
    let evaluation = null;
    try {
      const evalResult = await AttendancePolicyEngine.evaluate({
        userId: req.user._id,
        date: dayStart,
        checkInTime: attendance.checkIn,
        checkOutTime: null,
        shift,
        workMode: attendance.workMode,
        attendanceId: attendance._id,
        evaluatedBy: req.user._id
      });
      evaluation = evalResult.evaluation;
      
      // Update attendance with evaluation result
      if (evalResult.status && !attendance.isOverride) {
        attendance.status = evalResult.status;
        await attendance.save();
      }
    } catch (evalError) {
      console.error('Policy evaluation error:', evalError);
    }

    // Trigger automation hooks
    try {
      await AttendanceAutomationService.handleCheckIn(attendance, evaluation);
    } catch (hookError) {
      console.error('Automation hook error:', hookError);
    }

    // Log the check-in
    await logChange({
      userId: req.user._id,
      action: 'create',
      entity: 'attendance',
      entityId: attendance._id,
      details: { action: 'check-in', time: attendance.checkIn, workMode: attendance.workMode },
      ipAddress: getClientIP(req)
    });

    // Log verification audit
    if (verificationResult) {
      await AuditService.logCheckIn(
        attendance._id,
        req.user._id,
        workspaceId,
        {
          verificationStatus: verificationResult.status,
          flags: verificationResult.flags,
          gpsLocation,
          deviceInfo
        },
        getClientIP(req)
      );
    }

    // Determine if check-in should be blocked due to verification failure
    const requirements = await VerificationService.getVerificationRequirements(req.user._id, workspaceId);
    const isBlocked = requirements.photo.required && !verificationResult?.data?.photo 
      || requirements.gps.required && !verificationResult?.data?.gps;

    res.json({ 
      success: true, 
      attendance,
      evaluation,
      verification: verificationResult,
      blocked: isBlocked,
      message: isBlocked 
        ? 'Check-in recorded but pending verification approval required'
        : evaluation?.flags?.approval_required 
          ? 'Check-in recorded. Pending approval required.' 
          : 'Successfully checked in'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Failed to check in' });
  }
});

// ==================== Admin Review Routes ====================

/**
 * GET /api/attendance/pending-reviews
 * Get pending attendance reviews
 * @route GET /api/hr/attendance/pending-reviews
 * @access Private (Admin/HR only)
 */
router.get('/pending-reviews', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { userId, startDate, endDate, status, verificationStatus, hasFlags, page = 1, limit = 20 } = req.query;

    const normalizeReviewStatus = (value) => {
      if (!value || typeof value !== 'string') return undefined;
      return value.trim().toLowerCase();
    };

    const normalizedStatus = normalizeReviewStatus(status);
    const normalizedVerificationStatus = normalizeReviewStatus(verificationStatus) || normalizedStatus;

    const verificationStatuses = new Set(['pending', 'approved', 'rejected', 'auto_approved', 'auto_rejected']);
    const attendanceStatuses = new Set(['present', 'absent', 'half_day', 'leave', 'wfh', 'holiday']);
    
    const filters = {
      userId,
      startDate,
      endDate,
      status: verificationStatuses.has(normalizedStatus) ? undefined : (attendanceStatuses.has(normalizedStatus) ? normalizedStatus : undefined),
      verificationStatus: verificationStatuses.has(normalizedVerificationStatus) ? normalizedVerificationStatus : undefined,
      hasFlags: hasFlags === 'true',
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };
    
    const pendingReviews = await AttendanceReviewService.getPendingReviews(workspaceId, filters);
    const stats = await AttendanceReviewService.getReviewStatistics(workspaceId, startDate, endDate);
    
    res.json({ 
      success: true, 
      reviews: pendingReviews,
      statistics: stats
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ message: 'Failed to fetch pending reviews' });
  }
});

/**
 * GET /api/attendance/:id/review
 * Get attendance details for review
 * @route GET /api/hr/attendance/:id/review
 * @access Private (Admin/HR only)
 */
router.get('/:id/review', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const attendanceDetails = await AttendanceReviewService.getReviewableAttendance(req.params.id);
    
    res.json({ success: true, attendance: attendanceDetails });
  } catch (error) {
    console.error('Get review details error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch attendance details' });
  }
});

/**
 * POST /api/attendance/:id/approve
 * Approve attendance record
 * @route POST /api/hr/attendance/:id/approve
 * @access Private (Admin only)
 */
router.post('/:id/approve', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const { notes } = req.body;
    const ipAddress = getClientIP(req);
    
    const attendance = await AttendanceReviewService.approveAttendance(
      req.params.id,
      req.user._id,
      notes,
      ipAddress
    );
    
    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance',
      entityId: req.params.id,
      details: { action: 'approve-attendance', notes },
      ipAddress
    });
    
    res.json({ success: true, attendance, message: 'Attendance approved successfully' });
  } catch (error) {
    console.error('Approve attendance error:', error);
    res.status(500).json({ message: error.message || 'Failed to approve attendance' });
  }
});

/**
 * POST /api/attendance/:id/reject
 * Reject attendance record
 * @route POST /api/hr/attendance/:id/reject
 * @access Private (Admin only)
 */
router.post('/:id/reject', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;
    const ipAddress = getClientIP(req);
    
    const attendance = await AttendanceReviewService.rejectAttendance(
      req.params.id,
      req.user._id,
      reason,
      ipAddress
    );
    
    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance',
      entityId: req.params.id,
      details: { action: 'reject-attendance', reason },
      ipAddress
    });
    
    res.json({ success: true, attendance, message: 'Attendance rejected successfully' });
  } catch (error) {
    console.error('Reject attendance error:', error);
    res.status(500).json({ message: error.message || 'Failed to reject attendance' });
  }
});

/**
 * POST /api/attendance/:id/override
 * Override attendance record
 * @route POST /api/hr/attendance/:id/override
 * @access Private (Admin only)
 */
router.post('/:id/override', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const { checkIn, checkOut, status, notes, workMode, reason, verificationStatus } = req.body;
    const { reason: overrideReason } = req.body;
    const ipAddress = getClientIP(req);
    
    const overrideData = {
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      status,
      notes,
      workMode,
      reason,
      verificationStatus
    };
    
    // Validate override data
    const validation = await AttendanceReviewService.validateOverride(req.params.id, overrideData);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.errors.join(', ') });
    }
    
    const attendance = await AttendanceReviewService.overrideAttendance(
      req.params.id,
      req.user._id,
      overrideData,
      overrideReason,
      ipAddress
    );
    
    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'attendance',
      entityId: req.params.id,
      details: { action: 'override-attendance', overrideData, overrideReason },
      ipAddress
    });
    
    res.json({ success: true, attendance, message: 'Attendance overridden successfully' });
  } catch (error) {
    console.error('Override attendance error:', error);
    res.status(500).json({ message: error.message || 'Failed to override attendance' });
  }
});

/**
 * POST /api/attendance/bulk-review
 * Bulk review multiple attendance records
 * @route POST /api/hr/attendance/bulk-review
 * @access Private (Admin only)
 */
router.post('/bulk-review', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const { attendanceIds, action, notes } = req.body;
    
    if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ message: 'attendanceIds array is required' });
    }
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' });
    }
    
    const ipAddress = getClientIP(req);
    const result = await AttendanceReviewService.bulkReview(
      attendanceIds,
      req.user._id,
      action,
      notes,
      ipAddress
    );
    
    await logChange({
      userId: req.user._id,
      action: 'bulk_update',
      entity: 'attendance',
      entityId: null,
      details: { action: `bulk-${action}`, count: attendanceIds.length },
      ipAddress
    });
    
    res.json({ 
      success: true, 
      result,
      message: `Bulk ${action} completed: ${result.successCount} succeeded, ${result.failedCount} failed`
    });
  } catch (error) {
    console.error('Bulk review error:', error);
    res.status(500).json({ message: 'Failed to process bulk review' });
  }
});

// ==================== Audit Routes ====================

/**
 * GET /api/attendance/:id/audit
 * Get audit trail for attendance
 * @route GET /api/hr/attendance/:id/audit
 * @access Private (Admin/HR only)
 */
router.get('/:id/audit', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { limit = 50, skip = 0, action } = req.query;
    
    const auditTrail = await AuditService.getAttendanceAuditTrail(req.params.id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action
    });
    
    res.json({ success: true, auditTrail });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ message: 'Failed to fetch audit trail' });
  }
});

/**
 * GET /api/attendance/audit-log
 * Get audit logs with filters
 * @route GET /api/hr/attendance/audit-log
 * @access Private (Admin/HR only)
 */
router.get('/audit-log', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { 
      startDate, 
      endDate, 
      action, 
      userId, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build query
    const query = { workspaceId };
    
    if (action) {
      query.action = action;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get audit logs
    const AttendanceAudit = (await import('../models/AttendanceAudit.js')).default;
    const logs = await AttendanceAudit.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('performedBy', 'name email');
    
    const total = await AttendanceAudit.countDocuments(query);
    
    // Get summary
    const summary = await AuditService.getAuditSummary(workspaceId, startDate, endDate);
    
    res.json({ 
      success: true, 
      logs: logs.map(log => ({
        id: log._id,
        attendanceId: log.attendanceId,
        user: log.userId,
        action: log.action,
        performedBy: log.performedBy,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
        details: log.details
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

export default router;
