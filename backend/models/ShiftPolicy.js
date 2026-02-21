/**
 * ShiftPolicy Model
 *
 * Org-level configuration that defines how many shifts the organisation
 * operates (single / double / triple) and which hour presets are allowed.
 *
 * Only one policy should be active at a time; new activations should
 * deactivate the previous one (handled in the route).
 */
import mongoose from 'mongoose';

const shiftPolicySchema = new mongoose.Schema(
  {
    policy_name: {
      type: String,
      required: [true, 'Policy name is required'],
      trim: true,
    },

    // How many concurrent shift slots the org operates
    shift_mode: {
      type: String,
      enum: ['single', 'double', 'triple'],
      required: true,
      default: 'single',
    },

    // Allowed working-hour presets for each shift slot in this mode
    allowed_hours: {
      type: [Number],
      default: [8],
      validate: {
        validator: (arr) => arr.every(h => [8, 10, 12].includes(h)) && arr.length > 0,
        message: 'allowed_hours values must be 8, 10, or 12',
      },
    },

    /**
     * Named shift slots tied to this policy.
     * e.g. for double-shift: [{ slot_label: 'A', shift_id: ObjectId },
     *                          { slot_label: 'B', shift_id: ObjectId }]
     */
    shift_slots: [
      {
        slot_label: { type: String, required: true }, // 'A', 'B', 'C' or named
        shift_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Shift',
          required: true,
        },
        _id: false,
      },
    ],

    // Overtime eligibility — hours worked beyond total_hours
    overtime_enabled: {
      type: Boolean,
      default: false,
    },
    overtime_threshold_hours: {
      type: Number,
      default: 0,
    },
    overtime_rate_multiplier: {
      type: Number,
      default: 1.5,
    },

    // Whether shift rotation is enabled org-wide
    rotation_enabled: {
      type: Boolean,
      default: false,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    effective_from: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

shiftPolicySchema.index({ is_active: 1 });
shiftPolicySchema.index({ effective_from: -1 });

export default mongoose.model('ShiftPolicy', shiftPolicySchema);
