/**
 * ShiftRotationRule Model
 *
 * Defines how a set of employees rotate through a sequence of shifts.
 *
 * Rotation cadences:
 *   daily   — shifts change every day
 *   weekly  — shifts change every week (Mon–Sun)
 *   monthly — shifts change every month
 *
 * Rotation scope:
 *   individual — applies to specific user_ids listed in `user_ids`
 *
 * Algorithm (resolveShiftForDate in shiftService):
 *   1. Compute how many cadence-units have elapsed since rotation_start
 *   2. Index into shift_sequence circularly:
 *      slot_index = floor(elapsed_units) % shift_sequence.length
 *   3. The slot's shift_id is the employee's shift for that date
 *
 * Example:
 *   shift_sequence = [Morning, Evening, Night]
 *   cadence = weekly, rotation_start = 2026-01-05
 *   → Week 0: Morning, Week 1: Evening, Week 2: Night, Week 3: Morning ...
 */
import mongoose from 'mongoose';

const rotationSlotSchema = new mongoose.Schema(
  {
    slot_order: { type: Number, required: true }, // 0-based ordering
    shift_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    slot_label: { type: String, default: '' }, // "Morning", "Evening", "Night"
  },
  { _id: false }
);

const shiftRotationRuleSchema = new mongoose.Schema(
  {
    rule_name: {
      type: String,
      required: true,
      trim: true,
    },

    cadence: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      default: 'weekly',
    },

    // Ordered list of shifts to cycle through
    shift_sequence: {
      type: [rotationSlotSchema],
      validate: {
        validator: (arr) => arr.length >= 2,
        message: 'A rotation must have at least 2 shifts',
      },
    },

    // Date from which rotation cycle counting begins
    rotation_start: {
      type: Date,
      required: true,
    },

    // Employees covered by this rule
    user_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    is_active: {
      type: Boolean,
      default: true,
    },

    // Optional end date for the rotation period
    rotation_end: {
      type: Date,
      default: null,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

shiftRotationRuleSchema.index({ is_active: 1 });
shiftRotationRuleSchema.index({ user_ids: 1 });
shiftRotationRuleSchema.index({ rotation_start: 1 });

export default mongoose.model('ShiftRotationRule', shiftRotationRuleSchema);
