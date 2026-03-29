/**
 * VerificationSettings Model
 * 
 * Workspace-level settings for attendance verification including:
 * - Photo verification requirements
 * - GPS/Location verification requirements
 * - Security settings for preventing fraud
 * 
 * Each workspace can have its own verification settings.
 */

import mongoose from 'mongoose';

const verificationSettingsSchema = new mongoose.Schema({
  // Reference to workspace
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Workspace ID is required'],
    unique: true,
    index: true
  },

  // Photo verification settings
  photoVerification: {
    enabled: {
      type: Boolean,
      default: false
    },
    mandatory: {
      type: Boolean,
      default: false
    },
    allowRetake: {
      type: Boolean,
      default: true
    },
    maxRetakes: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    }
  },

  // GPS/Location verification settings
  gpsVerification: {
    enabled: {
      type: Boolean,
      default: false
    },
    mandatory: {
      type: Boolean,
      default: false
    },
    accuracyThresholdMeters: {
      type: Number,
      default: 100,
      min: 10,
      max: 1000
    },
    requireFreshLocation: {
      type: Boolean,
      default: true
    },
    locationFreshnessSeconds: {
      type: Number,
      default: 300, // 5 minutes
      min: 60,
      max: 3600
    }
  },

  // Security settings
  security: {
    preventPhotoReuse: {
      type: Boolean,
      default: true
    },
    captureDeviceInfo: {
      type: Boolean,
      default: true
    },
    enforceServerTimestamp: {
      type: Boolean,
      default: true
    }
  },

  // Attendance ownership and lock rules
  attendanceGovernance: {
    // Who should mark regular daily attendance
    regularAttendanceMarkedBy: {
      type: String,
      enum: ['self', 'hr', 'admin'],
      default: 'self'
    },
    // Calendar days where attendance is explicitly controlled by HR (e.g., meeting days)
    specialDays: [{
      date: {
        type: Date,
        required: true
      },
      type: {
        type: String,
        enum: ['meeting', 'special'],
        default: 'meeting'
      },
      markedBy: {
        type: String,
        enum: ['hr', 'admin'],
        default: 'hr'
      },
      note: {
        type: String,
        default: ''
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }]
  },

  // Creator of the settings
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Last modifier of the settings
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

const VerificationSettings = mongoose.model('VerificationSettings', verificationSettingsSchema);

export default VerificationSettings;
