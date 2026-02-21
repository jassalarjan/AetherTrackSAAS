/**
 * shiftService.js
 *
 * Core business-logic layer bridging Shifts, EmployeeShiftAssignments,
 * and ShiftRotationRules.  All attendance-related computations that
 * require shift knowledge live here to keep routes thin.
 */
import EmployeeShiftAssignment from '../models/EmployeeShiftAssignment.js';
import ShiftRotationRule from '../models/ShiftRotationRule.js';
import Shift from '../models/Shift.js';
import ShiftPolicy from '../models/ShiftPolicy.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse an "HH:MM" string into minutes since midnight.
 * @param {string} timeStr
 * @returns {number}
 */
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Return the number of minutes between checkIn and checkOut, accounting
 * for night shifts that cross midnight.
 * @param {Date} checkIn - actual check-in Date
 * @param {Date} checkOut - actual check-out Date
 * @returns {number} minutes worked
 */
function minutesWorked(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, diff / 60_000);
}

/**
 * Build a full Date for a wall-clock time string on a given calendar date.
 * For night shifts the end time belongs to the NEXT calendar day.
 *
 * @param {Date} baseDate   - the calendar date (used for year/month/day)
 * @param {string} timeStr  - "HH:MM"
 * @param {boolean} nextDay - whether the time belongs to baseDate + 1
 * @returns {Date}
 */
function buildDateTime(baseDate, timeStr, nextDay = false) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  if (nextDay) d.setDate(d.getDate() + 1);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── Rotation Resolution ─────────────────────────────────────────────────────

/**
 * Compute which shift a user should be on for `targetDate` given a rotation rule.
 *
 * @param {import('../models/ShiftRotationRule.js')} rule
 * @param {Date} targetDate
 * @returns {mongoose.Types.ObjectId} shift_id
 */
function resolveRotationShiftId(rule, targetDate) {
  const { cadence, shift_sequence, rotation_start } = rule;

  const startMs = new Date(rotation_start).setHours(0, 0, 0, 0);
  const targetMs = new Date(targetDate).setHours(0, 0, 0, 0);
  const diffMs = targetMs - startMs;

  if (diffMs < 0) return null; // target is before rotation started

  let units;
  switch (cadence) {
    case 'daily':
      units = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      break;
    case 'weekly':
      units = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      break;
    case 'monthly': {
      const start = new Date(rotation_start);
      const target = new Date(targetDate);
      units =
        (target.getFullYear() - start.getFullYear()) * 12 +
        (target.getMonth() - start.getMonth());
      break;
    }
    default:
      units = 0;
  }

  const seqLen = shift_sequence.length;
  const idx = ((units % seqLen) + seqLen) % seqLen; // ensure positive
  const sorted = [...shift_sequence].sort((a, b) => a.slot_order - b.slot_order);
  return sorted[idx].shift_id;
}

// ─── Main Public API ─────────────────────────────────────────────────────────

/**
 * Find the effective Shift for an employee on a given date.
 *
 * Lookup priority:
 *   1. Active rotation rule that covers this employee
 *   2. Fixed EmployeeShiftAssignment
 *   3. First shift slot in the active ShiftPolicy
 *
 * @param {string|ObjectId} userId
 * @param {Date} date
 * @returns {Promise<{shift: Shift|null, source: string}>}
 */
export async function getActiveShiftForEmployee(userId, date) {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  // 1. Check rotation rules
  const rotationRule = await ShiftRotationRule.findOne({
    user_ids: userId,
    is_active: true,
    rotation_start: { $lte: date },
    $or: [{ rotation_end: null }, { rotation_end: { $gte: date } }],
  }).populate('shift_sequence.shift_id');

  if (rotationRule) {
    const shiftId = resolveRotationShiftId(rotationRule, date);
    if (shiftId) {
      const shift = await Shift.findById(shiftId);
      if (shift) return { shift, source: 'rotation', ruleId: rotationRule._id };
    }
  }

  // 2. Check fixed assignment
  const assignment = await EmployeeShiftAssignment.findOne({
    user_id: userId,
    effective_from: { $lte: date },
    $or: [{ effective_to: null }, { effective_to: { $gte: date } }],
  })
    .sort({ effective_from: -1 })
    .populate('shift_id');

  if (assignment?.shift_id) {
    return { shift: assignment.shift_id, source: 'assignment', assignmentId: assignment._id };
  }

  // 3. Fallback: first slot in active policy
  const policy = await ShiftPolicy.findOne({ is_active: true })
    .sort({ effective_from: -1 })
    .populate('shift_slots.shift_id');

  if (policy?.shift_slots?.length) {
    const slot = policy.shift_slots[0];
    if (slot.shift_id) return { shift: slot.shift_id, source: 'policy_default' };
  }

  return { shift: null, source: 'none' };
}

/**
 * Compute attendance status + penalty metrics for a given shift.
 *
 * @param {Date|null} checkIn
 * @param {Date|null} checkOut
 * @param {Shift} shift
 * @param {Date} recordDate - the calendar date of the attendance record
 * @returns {{
 *   status: string,
 *   working_hours: number,
 *   late_minutes: number,
 *   early_exit_minutes: number,
 *   overtime_hours: number,
 *   shift_status: string
 * }}
 */
export function computeAttendanceMetrics(checkIn, checkOut, shift, recordDate) {
  const defaults = {
    status: 'absent',
    working_hours: 0,
    late_minutes: 0,
    early_exit_minutes: 0,
    overtime_hours: 0,
    shift_status: null,
  };

  if (!checkIn && !checkOut) return defaults;

  const shiftStart = buildDateTime(recordDate, shift.start_time, false);
  const shiftEnd = buildDateTime(
    recordDate,
    shift.end_time,
    shift.is_night_shift // night shift end belongs to next day
  );

  // Compute lateness
  const graceCutoff = new Date(shiftStart.getTime() + shift.grace_period_minutes * 60_000);
  const late_minutes = checkIn
    ? Math.max(0, Math.floor((checkIn.getTime() - graceCutoff.getTime()) / 60_000))
    : 0;

  // Compute early exit
  const earlyExitCutoff = new Date(shiftEnd.getTime() - shift.early_exit_threshold_minutes * 60_000);
  const early_exit_minutes = checkOut
    ? Math.max(0, Math.floor((earlyExitCutoff.getTime() - checkOut.getTime()) / 60_000))
    : 0;

  // Net working minutes (deduct paid breaks)
  const rawMinutes = minutesWorked(checkIn, checkOut);
  const breakMinutes = shift.break_policy?.paid_break
    ? 0
    : shift.break_policy?.break_duration_minutes ?? 0;
  const netMinutes = Math.max(0, rawMinutes - breakMinutes);
  const working_hours = parseFloat((netMinutes / 60).toFixed(2));

  // Thresholds
  const presentThreshold =
    shift.min_hours_for_present ?? shift.total_hours * 0.9;
  const halfDayThreshold =
    shift.min_hours_for_half_day ?? shift.total_hours * 0.5;

  let status;
  if (working_hours >= presentThreshold) {
    status = 'present';
  } else if (working_hours >= halfDayThreshold) {
    status = 'half_day';
  } else if (working_hours > 0) {
    status = 'half_day'; // some hours but below threshold → still half day
  } else {
    status = 'absent';
  }

  // Overtime: anything above total_hours
  const overtime_hours = parseFloat(
    Math.max(0, working_hours - shift.total_hours).toFixed(2)
  );

  // Shift status tag
  let shift_status = null;
  if (status !== 'absent') {
    if (late_minutes > 0 && early_exit_minutes > 0) {
      shift_status = 'late_and_early_exit';
    } else if (late_minutes > 0) {
      shift_status = 'late';
    } else if (early_exit_minutes > 0) {
      shift_status = 'early_exit';
    } else {
      shift_status = 'on_time';
    }
  }

  return {
    status,
    working_hours,
    late_minutes,
    early_exit_minutes,
    overtime_hours,
    shift_status,
  };
}

/**
 * Convenience wrapper: resolve shift and compute metrics in one call.
 *
 * @param {string} userId
 * @param {Date} recordDate
 * @param {Date|null} checkIn
 * @param {Date|null} checkOut
 */
export async function resolveShiftAndComputeMetrics(userId, recordDate, checkIn, checkOut) {
  const { shift } = await getActiveShiftForEmployee(userId, recordDate);
  if (!shift) {
    // No shift config — fall back to generic hour-based logic
    const rawHours = minutesWorked(checkIn, checkOut) / 60;
    const working_hours = parseFloat(rawHours.toFixed(2));
    let status = 'absent';
    if (working_hours >= 7.2) status = 'present';
    else if (working_hours >= 4) status = 'half_day';
    return {
      shift: null,
      status,
      working_hours,
      late_minutes: 0,
      early_exit_minutes: 0,
      overtime_hours: 0,
      shift_status: null,
    };
  }

  const metrics = computeAttendanceMetrics(checkIn, checkOut, shift, recordDate);
  return { shift, ...metrics };
}
