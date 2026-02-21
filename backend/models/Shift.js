/**
 * Shift Model
 *
 * Represents a single shift template (Morning, Evening, Night, etc.)
 * Used as the building block for ShiftPolicy, EmployeeShiftAssignment,
 * and ShiftRotationRule.
 *
 * Cross-day (night) shifts are handled by setting end_time < start_time
 * and toggling is_night_shift = true.
 */
import mongoose from 'mongoose';

const breakPolicySchema = new mongoose.Schema({
  break_duration_minutes: { type: Number, default: 30 },
  paid_break: { type: Boolean, default: true },
  max_breaks: { type: Number, default: 1 },
  break_after_hours: { type: Number, default: 4 }, // break allowed after N hours
}, { _id: false });

const shiftSchema = new mongoose.Schema(
  {
    shift_name: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
      maxlength: 80,
    },
    // HH:MM string — e.g. "09:00", "22:30"
    start_time: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'start_time must be HH:MM format'],
    },
    end_time: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'end_time must be HH:MM format'],
    },
    total_hours: {
      type: Number,
      required: true,
      enum: {
        values: [8, 10, 12],
        message: 'total_hours must be 8, 10, or 12',
      },
    },
    // Minutes allowed after shift start_time before marking "late"
    grace_period_minutes: {
      type: Number,
      default: 10,
      min: 0,
      max: 60,
    },
    // Minutes before shift end_time that still counts as "early exit"
    early_exit_threshold_minutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    // Minimum hours for "present" status (defaults to total_hours * 0.9)
    min_hours_for_present: {
      type: Number,
      default: null, // null = use default calculation
    },
    // Minimum hours for "half_day" status (defaults to total_hours * 0.5)
    min_hours_for_half_day: {
      type: Number,
      default: null,
    },
    is_night_shift: {
      type: Boolean,
      default: false, // true when end_time falls on next calendar day
    },
    break_policy: {
      type: breakPolicySchema,
      default: () => ({}),
    },
    // Visual identifier on calendar
    shift_color: {
      type: String,
      default: '#3b82f6', // hex
    },
    shift_type: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'flexible', 'custom'],
      default: 'custom',
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    // The org that owns this shift config
    created_by: {
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

shiftSchema.index({ shift_name: 1 });
shiftSchema.index({ is_active: 1 });
shiftSchema.index({ shift_type: 1 });

// Virtual: effective present threshold
shiftSchema.virtual('present_threshold').get(function () {
  return this.min_hours_for_present ?? this.total_hours * 0.9;
});

// Virtual: effective half-day threshold
shiftSchema.virtual('half_day_threshold').get(function () {
  return this.min_hours_for_half_day ?? this.total_hours * 0.5;
});

export default mongoose.model('Shift', shiftSchema);
