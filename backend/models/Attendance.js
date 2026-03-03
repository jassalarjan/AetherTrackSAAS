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
    enum: ['present', 'absent', 'half_day', 'leave', 'wfh', 'holiday'],
    default: 'absent'
  },
  // Work mode: onsite, wfh (Work From Home), hybrid
  workMode: {
    type: String,
    enum: ['onsite', 'wfh', 'hybrid', null],
    default: null
  },
  // Reason for attendance (optional)
  reason: {
    type: String,
    default: '',
    maxlength: 1000
  },
  // Attachment URL (for medical certificate, approval, notes)
  attachmentUrl: {
    type: String,
    default: null
  },
  // Attachment type
  attachmentType: {
    type: String,
    enum: ['medical', 'approval', 'note', 'other', null],
    default: null
  },
  // Original check-in time (before any edits)
  originalCheckIn: {
    type: Date,
    default: null
  },
  // Original check-out time (before any edits)
  originalCheckOut: {
    type: Date,
    default: null
  },
  workingHours: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  // Linked project (optional)
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  // Exception request ID (if this attendance is tied to an exception)
  exceptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceException',
    default: null
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
  overrideReason: {
    type: String,
    default: ''
  },
  overrideTimestamp: {
    type: Date,
    default: null
  },

  // ── Verification fields for enterprise attendance tracking ─────────────────
  // Verification data (photo, GPS, device info)
  verification: {
    // Photo verification
    photoUrl: {
      type: String,
      default: null
    },
    photoPublicId: {
      type: String,
      default: null
    },
    photoHash: {
      type: String,
      default: null,
      index: true
    },
    // GPS location data
    gpsLocation: {
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      },
      accuracy: {
        type: Number,
        default: null
      },
      timestamp: {
        type: Date,
        default: null
      },
      address: {
        type: String,
        default: null
      }
    },
    // Device information
    deviceInfo: {
      userAgent: {
        type: String,
        default: null
      },
      deviceId: {
        type: String,
        default: null
      },
      platform: {
        type: String,
        default: null
      },
      ipAddress: {
        type: String,
        default: null
      }
    },
    // Server-authoritative timestamp for the check-in/check-out
    serverTimestamp: {
      type: Date,
      default: null
    }
  },

  // Verification status
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved', 'auto_rejected'],
    default: 'pending'
  },

  // Verification flags for issues detected
  verificationFlags: [{
    type: String,
    enum: [
      'PHOTO_MANDATORY',
      'GPS_MANDATORY',
      'GPS_INACCURATE',
      'LOCATION_OUTSIDE_GEOFENCE',
      'PHOTO_REUSE_DETECTED'
    ]
  }],

  // Admin review information
  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      default: null
    },
    reviewAction: {
      type: String,
      enum: ['approved', 'rejected', null],
      default: null
    }
  },

  // Override flag (additional alias for isOverride for clarity)
  isOverridden: {
    type: Boolean,
    default: false
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

// Verification-related indexes
attendanceSchema.index({ verificationStatus: 1 });
attendanceSchema.index({ 'verification.photoHash': 1 });
attendanceSchema.index({ 'verification.gpsLocation': '2dsphere' });
attendanceSchema.index({ isOverridden: 1 });
attendanceSchema.index({ 'adminReview.reviewedBy': 1 });

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
