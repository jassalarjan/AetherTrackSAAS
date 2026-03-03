/**
 * AttendanceAudit Model
 * 
 * Audit logging for attendance records with verification events.
 * Tracks all actions related to attendance verification including:
 * - Check-in/check-out events
 * - Verification status changes
 * - Admin approvals/rejections
 * - Override actions
 * - Security events (photo reuse, location validation)
 */

import mongoose from 'mongoose';

const attendanceAuditSchema = new mongoose.Schema({
  // Reference to workspace
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Workspace ID is required'],
    index: true
  },

  // Reference to the attendance record
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: [true, 'Attendance ID is required'],
    index: true
  },

  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Type of action performed
  action: {
    type: String,
    required: [true, 'Action type is required'],
    enum: [
      'CHECKIN',
      'CHECKOUT',
      'APPROVE',
      'REJECT',
      'OVERRIDE',
      'VERIFICATION_FAILED',
      'LOCATION_VALIDATED',
      'PHOTO_CAPTURED'
    ],
    index: true
  },

  // Additional details about the action
  details: {
    // Verification status at the time of action
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_approved', 'auto_rejected', null],
      default: null
    },

    // Flags that were present
    flags: [{
      type: String,
      enum: [
        'PHOTO_MANDATORY',
        'GPS_MANDATORY',
        'GPS_INACCURATE',
        'LOCATION_OUTSIDE_GEOFENCE',
        'PHOTO_REUSE_DETECTED'
      ]
    }],

    // Previous status (for status change tracking)
    previousStatus: {
      type: String,
      default: null
    },

    // New status (for status change tracking)
    newStatus: {
      type: String,
      default: null
    },

    // Reason or notes for the action
    reason: {
      type: String,
      default: null
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // User who performed the audit action (could be different from userId for admin actions)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performed by user ID is required']
  },

  // IP address of the request
  ipAddress: {
    type: String,
    default: null
  },

  // Server-authoritative timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We use our own timestamp field
});

// Compound indexes for efficient queries
attendanceAuditSchema.index({ attendanceId: 1, timestamp: -1 });
attendanceAuditSchema.index({ workspaceId: 1, timestamp: -1 });
attendanceAuditSchema.index({ userId: 1, timestamp: -1 });
attendanceAuditSchema.index({ performedBy: 1, timestamp: -1 });
attendanceAuditSchema.index({ action: 1, timestamp: -1 });

/**
 * Static method to log an audit event
 * @param {Object} data - Audit event data
 * @returns {Promise<AttendanceAudit>} - Created audit document
 */
attendanceAuditSchema.statics.logEvent = async function(data) {
  const {
    workspaceId,
    attendanceId,
    userId,
    action,
    details = {},
    performedBy,
    ipAddress
  } = data;

  const auditEntry = new this({
    workspaceId,
    attendanceId,
    userId,
    action,
    details,
    performedBy: performedBy || userId,
    ipAddress,
    timestamp: new Date()
  });

  return auditEntry.save();
};

/**
 * Static method to get audit history for an attendance record
 * @param {mongoose.Types.ObjectId} attendanceId - Attendance record ID
 * @param {Object} options - Query options
 * @returns {Promise<Array<AttendanceAudit>>} - Audit history
 */
attendanceAuditSchema.statics.getAttendanceHistory = async function(attendanceId, options = {}) {
  const { limit = 50, skip = 0, action } = options;
  
  const query = { attendanceId };
  if (action) {
    query.action = action;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'name email')
    .populate('userId', 'name email');
};

const AttendanceAudit = mongoose.model('AttendanceAudit', attendanceAuditSchema);

export default AttendanceAudit;
