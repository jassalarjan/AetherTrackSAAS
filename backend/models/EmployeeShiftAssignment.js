/**
 * EmployeeShiftAssignment Model
 *
 * Links an employee to a specific Shift for a given date range.
 * A fixed assignment has no rotation rule. A rotated employee
 * references a ShiftRotationRule that overrides this record
 * according to the rotation schedule.
 *
 * Lookup priority (in shiftService):
 *   1. Active ShiftRotationRule for the employee on that date  (rotation)
 *   2. Active EmployeeShiftAssignment for the employee          (fixed)
 *   3. Default shift from the active ShiftPolicy                (fallback)
 */
import mongoose from 'mongoose';

const employeeShiftAssignmentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shift_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },

    // Inclusive date range for this assignment
    effective_from: {
      type: Date,
      required: true,
    },
    effective_to: {
      type: Date,
      default: null, // null = open-ended / current
    },

    // Whether this is managed by a rotation rule
    is_rotation_managed: {
      type: Boolean,
      default: false,
    },
    rotation_rule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShiftRotationRule',
      default: null,
    },

    assignment_type: {
      type: String,
      enum: ['fixed', 'rotated', 'temporary'],
      default: 'fixed',
    },

    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

employeeShiftAssignmentSchema.index({ user_id: 1, effective_from: -1 });
employeeShiftAssignmentSchema.index({ user_id: 1, effective_to: 1 });
employeeShiftAssignmentSchema.index({ shift_id: 1 });

export default mongoose.model('EmployeeShiftAssignment', employeeShiftAssignmentSchema);
