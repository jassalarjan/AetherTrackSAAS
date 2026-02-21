import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date,
    default: null
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'leave', 'holiday'],
    default: 'absent'
  },
  workingHours: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  isOverride: {
    type: Boolean,
    default: false
  },
  overrideBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ── Shift-aware fields ─────────────────────────────────────────────────
  shift_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    default: null
  },
  expected_hours: {
    type: Number,
    default: null  // populated from shift.total_hours at save time
  },
  late_minutes: {
    type: Number,
    default: 0
  },
  early_exit_minutes: {
    type: Number,
    default: 0
  },
  overtime_hours: {
    type: Number,
    default: 0
  },
  // Granular time-quality tag for this record
  shift_status: {
    type: String,
    enum: ['on_time', 'late', 'early_exit', 'late_and_early_exit', null],
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ shift_id: 1 });

// Calculate working hours before saving.
// When a shift is attached the route layer calls shiftService and populates
// late_minutes, early_exit_minutes, overtime_hours, shift_status BEFORE save,
// so the pre-save hook only needs to handle the generic (no-shift) fallback.
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const hours = (this.checkOut - this.checkIn) / (1000 * 60 * 60);
    this.workingHours = Math.round(hours * 100) / 100;

    // Only use generic thresholds when there is no shift context
    if (!this.isOverride && !this.shift_id) {
      if (hours >= 8) {
        this.status = 'present';
      } else if (hours >= 4) {
        this.status = 'half_day';
      }
    }
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
