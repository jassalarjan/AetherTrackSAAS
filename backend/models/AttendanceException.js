/**
 * AttendanceException Model
 * 
 * Manages attendance exceptions that require approval or have been flagged:
 * - Late check-in requests
 * - Early exit requests
 * - WFH requests
 * - Manual attendance corrections
 * - Flagged irregular patterns
 */

import mongoose from 'mongoose';

const attendanceExceptionSchema = new mongoose.Schema({
  // Type of exception
  exception_type: {
    type: String,
    enum: [
      'LATE_CHECKIN',
      'EARLY_EXIT',
      'MISSING_CHECKOUT',
      'WFH_REQUEST',
      'MANUAL_CORRECTION',
      'ABSENCE_JUSTIFICATION',
      'IRREGULAR_PATTERN',
      'BACKDATED_ENTRY',
      'OVERTIME_APPROVAL'
    ],
    required: true
  },

  // Reference to the attendance record (if exists)
  attendance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    default: null
  },

  // Reference to the evaluation record
  evaluation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceEvaluation',
    default: null
  },

  // User requesting/affected by the exception
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Date of the exception
  date: {
    type: Date,
    required: true
  },

  // Exception details
  details: {
    // Expected check-in time (for late checkin)
    expected_check_in_time: {
      type: String,
      default: null
    },
    // Actual check-in time
    actual_check_in_time: {
      type: Date,
      default: null
    },
    // Expected checkout time (for early exit)
    expected_check_out_time: {
      type: String,
      default: null
    },
    // Actual checkout time
    actual_check_out_time: {
      type: Date,
      default: null
    },
    // Late minutes
    late_minutes: {
      type: Number,
      default: 0
    },
    // Early exit minutes
    early_exit_minutes: {
      type: Number,
      default: 0
    },
    // Work mode (for WFH requests)
    work_mode: {
      type: String,
      enum: ['onsite', 'wfh', 'hybrid'],
      default: 'onsite'
    },
    // Reason for the exception
    reason: {
      type: String,
      default: '',
      maxlength: 1000
    },
    // Attachment URL (medical certificate, approval, etc.)
    attachment_url: {
      type: String,
      default: null
    },
    // Attachment type
    attachment_type: {
      type: String,
      enum: ['medical', 'approval', 'note', 'other', null],
      default: null
    },
    // Original values (for corrections)
    original_values: {
      check_in: Date,
      check_out: Date,
      status: String
    },
    // Requested values
    requested_values: {
      check_in: Date,
      check_out: Date,
      status: String
    }
  },

  // Status of the exception request
  status: {
    type: String,
    enum: [
      'PENDING',      // Awaiting approval
      'APPROVED',     // Approved
      'REJECTED',     // Rejected
      'CANCELLED',    // Cancelled by requester
      'AUTO_APPROVED' // Automatically approved by policy
    ],
    default: 'PENDING'
  },

  // Approval details
  approval: {
    // Who approved/rejected
    processed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // When it was processed
    processed_at: {
      type: Date,
      default: null
    },
    // Approval/rejection reason
    response_reason: {
      type: String,
      default: '',
      maxlength: 500
    }
  },

  // Flag info (if auto-flagged)
  flag: {
    // Type of flag that triggered this exception
    flag_type: {
      type: String,
      enum: [
        'LATE_CHECKIN',
        'MISSING_CHECKOUT',
        'EARLY_EXIT',
        'INSUFFICIENT_HOURS',
        'CONSECUTIVE_ABSENCES',
        'IRREGULAR_PATTERN',
        'BACKDATED_ENTRY'
      ],
      default: null
    },
    // Whether the flag was acknowledged
    acknowledged: {
      type: Boolean,
      default: false
    },
    // When the flag was acknowledged
    acknowledged_at: {
      type: Date,
      default: null
    },
    // Acknowledgment comment
    acknowledged_comment: {
      type: String,
      default: ''
    }
  },

  // Notification tracking
  notifications: {
    // Whether user has been notified
    user_notified: {
      type: Boolean,
      default: false
    },
    // Whether HR/admin has been notified
    admin_notified: {
      type: Boolean,
      default: false
    }
  },

  // Requested by (for audit)
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // When the exception was requested
  requested_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for efficient queries
attendanceExceptionSchema.index({ user_id: 1, date: -1 });
attendanceExceptionSchema.index({ status: 1 });
attendanceExceptionSchema.index({ exception_type: 1 });
attendanceExceptionSchema.index({ attendance_id: 1 });
attendanceExceptionSchema.index({ requested_by: 1 });
attendanceExceptionSchema.index({ 'approval.processed_by': 1 });
attendanceExceptionSchema.index({ date: 1 });
attendanceExceptionSchema.index({ created_at: -1 });

const AttendanceException = mongoose.model('AttendanceException', attendanceExceptionSchema);

export default AttendanceException;
