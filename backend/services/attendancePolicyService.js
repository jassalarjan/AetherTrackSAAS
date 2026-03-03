/**
 * Attendance Policy Engine Service
 * 
 * Evaluates attendance records against configurable policies.
 * Handles:
 * - Finding applicable policies for users
 * - Evaluating check-in/check-out times
 * - Detecting abnormal patterns
 * - Generating flags and warnings
 * - Creating audit trail of evaluations
 */

import AttendancePolicy from '../models/AttendancePolicy.js';
import AttendanceEvaluation from '../models/AttendanceEvaluation.js';
import Attendance from '../models/Attendance.js';
import AttendanceException from '../models/AttendanceException.js';
import Holiday from '../models/Holiday.js';
import User from '../models/User.js';
import { logChange } from '../utils/changeLogService.js';
import getClientIP from '../utils/getClientIP.js';

class AttendancePolicyEngine {
  /**
   * Get applicable policy for a user
   */
  static async getApplicablePolicy(userId) {
    const user = await User.findById(userId).populate('teams');
    if (!user) {
      throw new Error('User not found');
    }
    
    const policy = await AttendancePolicy.findApplicablePolicy(user);
    return policy;
  }

  /**
   * Evaluate attendance against policies
   * @param {Object} options - Evaluation options
   * @returns {Object} Evaluation result
   */
  static async evaluate(options) {
    const {
      userId,
      date,
      checkInTime,
      checkOutTime,
      shift,
      isOverride = false,
      overrideBy = null,
      overrideReason = '',
      workMode = null,
      attendanceId = null,
      evaluatedBy = null
    } = options;

    // Get user with teams
    const user = await User.findById(userId).populate('teams');
    if (!user) {
      throw new Error('User not found');
    }

    // Get applicable policy
    const policy = await this.getApplicablePolicy(userId);
    const rules = policy?.rules || this.getDefaultRules();
    
    // Get context (holidays, weekends)
    const context = await this.getContext(date, user);

    // Calculate working hours
    const workingHours = checkInTime && checkOutTime 
      ? (checkOutTime - checkInTime) / (1000 * 60 * 60)
      : 0;

    // Determine expected times
    let expectedCheckInTime = null;
    let shiftStartTime = null;
    let shiftEndTime = null;
    
    if (shift) {
      shiftStartTime = shift.start_time;
      shiftEndTime = shift.end_time;
      expectedCheckInTime = shift.start_time;
    }

    // Calculate lateness
    const lateMinutes = this.calculateLateMinutes(checkInTime, expectedCheckInTime, rules.grace_period_minutes);
    const earlyExitMinutes = this.calculateEarlyExitMinutes(checkOutTime, shiftEndTime);
    
    // Calculate overtime
    const overtimeHours = rules.enable_overtime && workingHours > rules.overtime_threshold_hours
      ? workingHours - rules.overtime_threshold_hours
      : 0;

    // Determine status based on rules
    const statusResult = this.determineStatus({
      checkInTime,
      checkOutTime,
      workingHours,
      lateMinutes,
      earlyExitMinutes,
      rules,
      context,
      workMode
    });

    // Generate flags
    const flags = this.generateFlags({
      checkInTime,
      checkOutTime,
      workingHours,
      lateMinutes,
      earlyExitMinutes,
      overtimeHours,
      rules,
      context,
      isOverride
    });

    // Check if approval required
    const approvalResult = this.checkApprovalRequired({
      flags,
      rules,
      workMode
    });

    // Build evaluation result
    const evaluation = {
      attendance_id: attendanceId,
      policy_id: policy?._id || null,
      policy_name: policy?.policy_name || 'Default Policy',
      user_id: userId,
      date,
      input: {
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        expected_check_in_time: expectedCheckInTime,
        work_mode: workMode,
        shift_start_time: shiftStartTime,
        shift_end_time: shiftEndTime,
        total_working_hours: workingHours
      },
      result: {
        status: statusResult.status,
        is_auto_determined: statusResult.isAutoDetermined,
        late_minutes: lateMinutes,
        early_exit_minutes: earlyExitMinutes,
        overtime_hours: overtimeHours,
        within_grace_period: lateMinutes <= rules.grace_period_minutes,
        met_minimum_hours: workingHours >= rules.minimum_working_hours,
        working_hours: workingHours
      },
      flags: {
        triggered: flags,
        warnings: [],
        approval_required: approvalResult.required,
        approval_type: approvalResult.type
      },
      evaluated_rules: {
        grace_period_minutes: rules.grace_period_minutes,
        minimum_working_hours: rules.minimum_working_hours,
        half_day_hours_threshold: rules.half_day_hours_threshold,
        max_late_minutes: rules.max_late_minutes
      },
      context: {
        is_override: isOverride,
        override_reason: overrideReason,
        override_by: overrideBy,
        is_weekend: context.isWeekend,
        is_holiday: context.isHoliday,
        holiday_name: context.holidayName
      },
      evaluated_at: new Date(),
      evaluated_by: evaluatedBy
    };

    // Save evaluation
    const savedEvaluation = await AttendanceEvaluation.create(evaluation);

    // Create exceptions if needed
    if (approvalResult.required && !isOverride) {
      await this.createException({
        evaluation: savedEvaluation,
        userId,
        date,
        checkInTime,
        checkOutTime,
        lateMinutes,
        earlyExitMinutes,
        workMode,
        requestedBy: evaluatedBy || userId
      });
    }

    return {
      evaluation: savedEvaluation,
      status: evaluation.result.status,
      flags: evaluation.flags,
      approvalRequired: approvalResult.required
    };
  }

  /**
   * Get default rules when no policy is found
   */
  static getDefaultRules() {
    return {
      grace_period_minutes: 15,
      minimum_working_hours: 8,
      half_day_hours_threshold: 4,
      half_day_after_time: null,
      auto_absent_after_time: null,
      max_late_minutes: 60,
      working_days: [1, 2, 3, 4, 5],
      require_approval_for_late: false,
      require_approval_for_early_exit: false,
      require_approval_for_wfh: false,
      consecutive_absence_alert_threshold: 3,
      enable_overtime: true,
      overtime_threshold_hours: 9
    };
  }

  /**
   * Get context for a date (weekend, holiday)
   */
  static async getContext(date, user) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    const rules = this.getDefaultRules();
    const isWeekend = !rules.working_days.includes(dayOfWeek);
    
    // Check for holiday
    const holiday = await Holiday.findOne({
      date: {
        $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        $lte: new Date(dateObj.setHours(23, 59, 59, 999))
      }
    });

    return {
      isWeekend,
      isHoliday: !!holiday,
      holidayName: holiday?.name || null
    };
  }

  /**
   * Calculate late minutes
   */
  static calculateLateMinutes(checkInTime, expectedTime, gracePeriod) {
    if (!checkInTime || !expectedTime) return 0;

    const checkIn = new Date(checkInTime);
    const [hours, minutes] = expectedTime.split(':');
    const expected = new Date(checkIn);
    expected.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const diffMs = checkIn - expected;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Only count as late if beyond grace period
    return diffMinutes > gracePeriod ? diffMinutes - gracePeriod : 0;
  }

  /**
   * Calculate early exit minutes
   */
  static calculateEarlyExitMinutes(checkOutTime, expectedTime) {
    if (!checkOutTime || !expectedTime) return 0;

    const checkOut = new Date(checkOutTime);
    const [hours, minutes] = expectedTime.split(':');
    const expected = new Date(checkOut);
    expected.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const diffMs = expected - checkOut;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes > 0 ? diffMinutes : 0;
  }

  /**
   * Determine status based on rules
   */
  static determineStatus({ checkInTime, checkOutTime, workingHours, lateMinutes, rules, context, workMode }) {
    // If holiday/weekend and checked in, mark appropriately
    if (context.isHoliday && checkInTime) {
      return { status: 'present', isAutoDetermined: true };
    }

    // Handle WFH
    if (workMode === 'wfh') {
      return { status: 'wfh', isAutoDetermined: true };
    }

    // Handle leave status
    if (!checkInTime && !checkOutTime) {
      return { status: 'absent', isAutoDetermined: true };
    }

    // No check-in but has check-out - likely missed check-in
    if (!checkInTime && checkOutTime) {
      return { status: 'present', isAutoDetermined: true }; // Assume present with manual correction
    }

    // Calculate actual working hours
    const hours = workingHours || 0;

    // Check overtime first
    if (hours >= rules.overtime_threshold_hours && rules.enable_overtime) {
      return { status: 'present', isAutoDetermined: true };
    }

    // Check half-day
    if (hours >= rules.half_day_hours_threshold && hours < rules.minimum_working_hours) {
      return { status: 'half_day', isAutoDetermined: true };
    }

    // Check minimum hours
    if (hours >= rules.minimum_working_hours) {
      // Check if late beyond threshold
      if (lateMinutes > rules.max_late_minutes) {
        return { status: 'absent', isAutoDetermined: true };
      }
      return { status: 'present', isAutoDetermined: true };
    }

    // Insufficient hours
    if (hours > 0) {
      return { status: 'half_day', isAutoDetermined: true };
    }

    return { status: 'absent', isAutoDetermined: true };
  }

  /**
   * Generate flags based on evaluation
   */
  static generateFlags({ checkInTime, checkOutTime, workingHours, lateMinutes, rules, context, isOverride }) {
    const flags = [];

    // Late checkin
    if (lateMinutes > 0 && !context.isHoliday && !context.isWeekend) {
      flags.push('LATE_CHECKIN');
    }

    // Missing checkout
    if (checkInTime && !checkOutTime) {
      flags.push('MISSING_CHECKOUT');
    }

    // Early exit
    const earlyExitMinutes = this.calculateEarlyExitMinutes(checkOutTime, null); // Simplified
    if (earlyExitMinutes > 30) { // More than 30 mins early
      flags.push('EARLY_EXIT');
    }

    // Insufficient hours
    if (workingHours > 0 && workingHours < rules.minimum_working_hours) {
      flags.push('INSUFFICIENT_HOURS');
    }

    // Overtime
    if (workingHours > rules.overtime_threshold_hours) {
      flags.push('OVERTIME');
    }

    // Weekend attendance
    if (context.isWeekend && checkInTime) {
      flags.push('WEEKEND_ATTENDANCE');
    }

    // Holiday attendance
    if (context.isHoliday && checkInTime) {
      flags.push('HOLIDAY_ATTENDANCE');
    }

    // Backdated entry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(context.isWeekend ? checkInTime : new Date());
    if (recordDate < today && !isOverride) {
      flags.push('BACKDATED_ENTRY');
    }

    return flags;
  }

  /**
   * Check if approval is required
   */
  static checkApprovalRequired({ flags, rules, workMode }) {
    // Late checkin requires approval
    if (flags.includes('LATE_CHECKIN') && rules.require_approval_for_late) {
      return { required: true, type: 'late_checkin' };
    }

    // Early exit requires approval
    if (flags.includes('EARLY_EXIT') && rules.require_approval_for_early_exit) {
      return { required: true, type: 'early_exit' };
    }

    // WFH requires approval
    if (workMode === 'wfh' && rules.require_approval_for_wfh) {
      return { required: true, type: 'wfh' };
    }

    return { required: false, type: null };
  }

  /**
   * Create exception request if needed
   */
  static async createException({ evaluation, userId, date, checkInTime, checkOutTime, lateMinutes, workMode, requestedBy }) {
    let exceptionType = 'MANUAL_CORRECTION';
    
    if (evaluation.flags.triggered.includes('LATE_CHECKIN')) {
      exceptionType = 'LATE_CHECKIN';
    } else if (evaluation.flags.triggered.includes('EARLY_EXIT')) {
      exceptionType = 'EARLY_EXIT';
    } else if (workMode === 'wfh') {
      exceptionType = 'WFH_REQUEST';
    }

    const exception = await AttendanceException.create({
      exception_type: exceptionType,
      attendance_id: evaluation.attendance_id,
      evaluation_id: evaluation._id,
      user_id: userId,
      date,
      details: {
        actual_check_in_time: checkInTime,
        actual_check_out_time: checkOutTime,
        late_minutes: lateMinutes,
        work_mode: workMode
      },
      status: 'PENDING',
      requested_by: requestedBy
    });

    // Update attendance with exception reference
    if (evaluation.attendance_id) {
      await Attendance.findByIdAndUpdate(evaluation.attendance_id, {
        exceptionId: exception._id
      });
    }

    // Trigger notification (via event service)
    await this.triggerExceptionNotification(exception, userId);

    return exception;
  }

  /**
   * Trigger notification for exception
   */
  static async triggerExceptionNotification(exception, userId) {
    try {
      const { HrEventService } = await import('./hrEventService.js');
      
      await HrEventService.handleEvent('ATTENDANCE_EXCEPTION_REQUESTED', {
        employeeId: userId,
        exceptionId: exception._id,
        exceptionType: exception.exception_type
      });
    } catch (error) {
      console.error('Error triggering exception notification:', error);
    }
  }

  /**
   * Detect consecutive absences for a user
   */
  static async detectConsecutiveAbsences(userId, threshold = 3) {
    const rules = this.getDefaultRules();
    const consecutiveThreshold = threshold || rules.consecutive_absence_alert_threshold;

    // Get recent attendance records
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await Attendance.find({
      userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    // Count consecutive absences
    let consecutiveAbsences = 0;
    const absenceDates = [];

    for (const record of records) {
      if (record.status === 'absent' || !record.checkIn) {
        consecutiveAbsences++;
        absenceDates.push(record.date);
      } else {
        break; // Stop at first present day
      }
    }

    if (consecutiveAbsences >= consecutiveThreshold) {
      // Create exception for irregular pattern
      await AttendanceException.create({
        exception_type: 'IRREGULAR_PATTERN',
        user_id: userId,
        date: new Date(),
        details: {
          reason: `Consecutive absences detected: ${consecutiveAbsences} days`
        },
        status: 'PENDING',
        flag: {
          flag_type: 'CONSECUTIVE_ABSENCES',
          acknowledged: false
        },
        requested_by: userId // System-created
      });

      return {
        detected: true,
        consecutiveDays: consecutiveAbsences,
        dates: absenceDates
      };
    }

    return { detected: false };
  }

  /**
   * Log audit entry for evaluation
   */
  static async logAudit(userId, action, details, ipAddress) {
    await logChange({
      userId,
      action,
      entity: 'attendance_evaluation',
      entityId: details.evaluationId,
      details,
      ipAddress
    });
  }
}

export default AttendancePolicyEngine;
