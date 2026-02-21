/**
 * shifts.js — /api/hr/shifts
 *
 * Mounted as:  app.use('/api/hr/shifts', authenticate, shiftsRoutes)
 *
 * Sub-resources:
 *   /                         Shift CRUD
 *   /policy                   ShiftPolicy (single active document)
 *   /assignments              EmployeeShiftAssignment CRUD
 *   /rotations                ShiftRotationRule CRUD
 *   /my-shift                 Authenticated employee's current shift
 */
import express from 'express';
import Shift from '../models/Shift.js';
import ShiftPolicy from '../models/ShiftPolicy.js';
import EmployeeShiftAssignment from '../models/EmployeeShiftAssignment.js';
import ShiftRotationRule from '../models/ShiftRotationRule.js';
import { checkRole } from '../middleware/roleCheck.js';
import { getActiveShiftForEmployee } from '../utils/shiftService.js';

const router = express.Router();
const HR_ADMIN = checkRole(['admin', 'hr']);

// ═══════════════════════════════════════════════════════════════════════════
//  SHIFTS
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/hr/shifts — list all active shifts */
router.get('/', async (req, res) => {
  try {
    const filter = { is_active: true };
    if (req.query.include_inactive === 'true') delete filter.is_active;

    const shifts = await Shift.find(filter)
      .populate('created_by', 'name email')
      .sort({ shift_type: 1, shift_name: 1 });
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** GET /api/hr/shifts/:id */
router.get('/:id', async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).populate('created_by', 'name email');
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /api/hr/shifts — create shift (admin/hr) */
router.post('/', HR_ADMIN, async (req, res) => {
  try {
    const {
      shift_name, start_time, end_time, total_hours,
      grace_period_minutes, early_exit_threshold_minutes,
      min_hours_for_present, min_hours_for_half_day,
      is_night_shift, break_policy, shift_color, shift_type, notes,
    } = req.body;

    const shift = new Shift({
      shift_name, start_time, end_time, total_hours,
      grace_period_minutes, early_exit_threshold_minutes,
      min_hours_for_present, min_hours_for_half_day,
      is_night_shift, break_policy, shift_color, shift_type, notes,
      created_by: req.user._id,
    });

    await shift.save();
    res.status(201).json(shift);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

/** PUT /api/hr/shifts/:id — update shift (admin/hr) */
router.put('/:id', HR_ADMIN, async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/** DELETE /api/hr/shifts/:id — soft-delete (admin/hr) */
router.delete('/:id', HR_ADMIN, async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json({ message: 'Shift deactivated', shift });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SHIFT POLICY
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/hr/shifts/policy — get active policy */
router.get('/policy/active', async (req, res) => {
  try {
    const policy = await ShiftPolicy.findOne({ is_active: true })
      .sort({ effective_from: -1 })
      .populate('shift_slots.shift_id')
      .populate('created_by', 'name email');
    res.json(policy || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** GET /api/hr/shifts/policy/all — list all policies */
router.get('/policy/all', HR_ADMIN, async (req, res) => {
  try {
    const policies = await ShiftPolicy.find()
      .sort({ effective_from: -1 })
      .populate('shift_slots.shift_id')
      .populate('created_by', 'name email');
    res.json(policies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /api/hr/shifts/policy — create/activate a new policy (deactivates all previous) */
router.post('/policy', HR_ADMIN, async (req, res) => {
  try {
    const {
      policy_name, shift_mode, allowed_hours, shift_slots,
      overtime_enabled, overtime_threshold_hours, overtime_rate_multiplier,
      rotation_enabled, effective_from, notes,
    } = req.body;

    // Deactivate previous active policies
    await ShiftPolicy.updateMany({ is_active: true }, { is_active: false });

    const policy = new ShiftPolicy({
      policy_name, shift_mode, allowed_hours, shift_slots,
      overtime_enabled, overtime_threshold_hours, overtime_rate_multiplier,
      rotation_enabled, effective_from, notes,
      created_by: req.user._id,
      is_active: true,
    });

    await policy.save();
    res.status(201).json(policy);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

/** PUT /api/hr/shifts/policy/:id — update policy */
router.put('/policy/:id', HR_ADMIN, async (req, res) => {
  try {
    const policy = await ShiftPolicy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('shift_slots.shift_id');
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  EMPLOYEE SHIFT ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/hr/shifts/assignments
 * admin/hr: all assignments (filterable by user_id, shift_id)
 * member:   own assignments only
 */
router.get('/assignments', async (req, res) => {
  try {
    const isAdminOrHr = ['admin', 'hr'].includes(req.user.role);

    const filter = {};
    if (!isAdminOrHr) {
      filter.user_id = req.user._id;
    } else {
      if (req.query.user_id) filter.user_id = req.query.user_id;
      if (req.query.shift_id) filter.shift_id = req.query.shift_id;
    }

    const assignments = await EmployeeShiftAssignment.find(filter)
      .populate('user_id', 'name email department')
      .populate('shift_id')
      .populate('assigned_by', 'name email')
      .sort({ effective_from: -1 });

    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** GET /api/hr/shifts/assignments/:id */
router.get('/assignments/:id', async (req, res) => {
  try {
    const assignment = await EmployeeShiftAssignment.findById(req.params.id)
      .populate('user_id', 'name email')
      .populate('shift_id')
      .populate('assigned_by', 'name email');

    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    // Members can only view own
    if (
      req.user.role === 'member' &&
      assignment.user_id._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /api/hr/shifts/assignments — assign shift to employee (admin/hr) */
router.post('/assignments', HR_ADMIN, async (req, res) => {
  try {
    const { user_id, shift_id, effective_from, effective_to, assignment_type, notes } = req.body;

    // Optionally close any currently open fixed assignments for this user
    if (effective_from) {
      await EmployeeShiftAssignment.updateMany(
        {
          user_id,
          assignment_type: 'fixed',
          effective_to: null,
          effective_from: { $lt: new Date(effective_from) },
        },
        { effective_to: new Date(new Date(effective_from).getTime() - 86_400_000) }
      );
    }

    const assignment = new EmployeeShiftAssignment({
      user_id,
      shift_id,
      effective_from: effective_from ? new Date(effective_from) : new Date(),
      effective_to: effective_to ? new Date(effective_to) : null,
      assignment_type: assignment_type || 'fixed',
      assigned_by: req.user._id,
      notes,
    });

    await assignment.save();
    await assignment.populate(['user_id', 'shift_id', 'assigned_by']);
    res.status(201).json(assignment);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

/** PUT /api/hr/shifts/assignments/:id — update assignment (admin/hr) */
router.put('/assignments/:id', HR_ADMIN, async (req, res) => {
  try {
    const assignment = await EmployeeShiftAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('user_id', 'name email')
      .populate('shift_id')
      .populate('assigned_by', 'name email');

    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/** DELETE /api/hr/shifts/assignments/:id — remove assignment (admin/hr) */
router.delete('/assignments/:id', HR_ADMIN, async (req, res) => {
  try {
    const assignment = await EmployeeShiftAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SHIFT ROTATION RULES
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/hr/shifts/rotations */
router.get('/rotations', HR_ADMIN, async (req, res) => {
  try {
    const rules = await ShiftRotationRule.find()
      .populate('user_ids', 'name email department')
      .populate('shift_sequence.shift_id')
      .populate('created_by', 'name email')
      .sort({ created_at: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** GET /api/hr/shifts/rotations/:id */
router.get('/rotations/:id', HR_ADMIN, async (req, res) => {
  try {
    const rule = await ShiftRotationRule.findById(req.params.id)
      .populate('user_ids', 'name email')
      .populate('shift_sequence.shift_id')
      .populate('created_by', 'name email');
    if (!rule) return res.status(404).json({ message: 'Rotation rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** POST /api/hr/shifts/rotations — create rotation rule (admin/hr) */
router.post('/rotations', HR_ADMIN, async (req, res) => {
  try {
    const {
      rule_name, cadence, shift_sequence, rotation_start,
      user_ids, rotation_end, notes,
    } = req.body;

    const rule = new ShiftRotationRule({
      rule_name, cadence, shift_sequence, rotation_start,
      user_ids, rotation_end, notes,
      created_by: req.user._id,
    });

    await rule.save();
    await rule.populate(['user_ids', 'shift_sequence.shift_id', 'created_by']);
    res.status(201).json(rule);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

/** PUT /api/hr/shifts/rotations/:id */
router.put('/rotations/:id', HR_ADMIN, async (req, res) => {
  try {
    const rule = await ShiftRotationRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('user_ids', 'name email')
      .populate('shift_sequence.shift_id')
      .populate('created_by', 'name email');

    if (!rule) return res.status(404).json({ message: 'Rotation rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/** DELETE /api/hr/shifts/rotations/:id — soft delete */
router.delete('/rotations/:id', HR_ADMIN, async (req, res) => {
  try {
    const rule = await ShiftRotationRule.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rotation rule not found' });
    res.json({ message: 'Rotation rule deactivated', rule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  MY SHIFT (employee self-service)
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/hr/shifts/my-shift — current authenticated user's shift */
router.get('/my-shift', async (req, res) => {
  try {
    const today = new Date();
    const result = await getActiveShiftForEmployee(req.user._id, today);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
