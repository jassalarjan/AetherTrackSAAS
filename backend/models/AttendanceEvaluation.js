/**
 * AttendanceEvaluation Model
 * 
 * Stores the result of evaluating an attendance record against applicable policies.
 * This provides:
 * - Audit trail of policy decisions
 * - Explanation for status changes
 * - Data for analytics and reporting
 */

import mongoose from 'mongoose';

const attendanceEvaluationSchema = new mongoose.Schema({
  // Reference to the attendance record
  attendance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true,
    index: true
  },

  // Reference to the policy used for evaluation
  policy_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendancePolicy',
    default: null // null if no specific policy found (uses defaults)
  },

  policy_name: {
    type: String,
    default: 'Default Policy'
  },

  // User being evaluated
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Date of attendance
  date: {
    type: Date,
    required: true
  },

  // Evaluation input data
  input: {
    check_in_time: {
      type: Date,
      default: null
    },
    check_out_time: {
      type: Date,
      default: null
    },
    expected_check_in_time: {
      type: String,
      default: null // HH:MM format
    },
    work_mode: {
      type: String,
      enum: ['onsite', 'wfh', 'hybrid', null],
      default: null
    },
    shift_start_time: {
      type: String,
      default: null
    },
    shift_end_time: {
      type: String,
      default: null
    },
    total_working_hours: {
      type: Number,
      default: 0
    }
  },

  // Evaluation results
  result: {
    // Final status after evaluation
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'leave', 'wfh', 'late', 'early_exit', 'on_time'],
      required: true
    },

    // Whether this status was auto-determined by policy
    is_auto_determined: {
      type: Boolean,
      default: false
    },

    // Late minutes (negative if early)
    late_minutes: {
      type: Number,
      default: 0
    },

    // Early exit minutes (negative if stayed late)
    early_exit_minutes: {
      type: Number,
      default: 0
    },

    // Overtime hours
    overtime_hours: {
      type: Number,
      default: 0
    },

    // Whether within grace period
    within_grace_period: {
      type: Boolean,
      default: true
    },

    // Whether minimum hours requirement met
    met_minimum_hours: {
      type: Boolean,
      default: true
    },

    // Working hours after evaluation
    working_hours: {
      type: Number,
      default: 0
    }
  },

  // Flags and warnings
  flags: {
    // List of flags triggered
    triggered: [{
      type: String,
      enum: [
        'LATE_CHECKIN',
        'MISSING_CHECKOUT',
        'EARLY_EXIT',
        'INSUFFICIENT_HOURS',
        'CONSECUTIVE_ABSENCES',
        'LATE_AFTER_THRESHOLD',
        'OVERTIME',
        'WEEKEND_ATTENDANCE',
        'HOLIDAY_ATTENDANCE',
        'BACKDATED_ENTRY',
        'NO_SHIFT_ASSIGNED'
      ]
    }],

    // Warnings that don't block but should be noted
    warnings: [{
      type: String,
      enum: [
        'NEAR_LATE_THRESHOLD',
        'NEAR_MINIMUM_HOURS',
        'MULTIPLE_SHIFTS',
        'OVERLAPPING_RECORDS'
      ]
    }],

    // Whether approval is required
    approval_required: {
      type: Boolean,
      default: false
    },

    // Type of approval needed
    approval_type: {
      type: String,
      enum: ['late_checkin', 'early_exit', 'wfh', 'exception', null],
      default: null
    }
  },

  // Policy rules that were evaluated
  evaluated_rules: {
    grace_period_minutes: {
      type: Number,
      default: 15
    },
    minimum_working_hours: {
      type: Number,
      default: 8
    },
    half_day_hours_threshold: {
      type: Number,
      default: 4
    },
    max_late_minutes: {
      type: Number,
      default: 60
    }
  },

  // Additional context
  context: {
    is_override: {
      type: Boolean,
      default: false
    },
    override_reason: {
      type: String,
      default: null
    },
    override_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    is_weekend: {
      type: Boolean,
      default: false
    },
    is_holiday: {
      type: Boolean,
      default: false
    },
    holiday_name: {
      type: String,
      default: null
    }
  },

  // Timestamp of evaluation
  evaluated_at: {
    type: Date,
    default: Date.now
  },

  // Who triggered the evaluation
  evaluated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null means system-evaluated
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for efficient queries
attendanceEvaluationSchema.index({ user_id: 1, date: -1 });
attendanceEvaluationSchema.index({ policy_id: 1 });
attendanceEvaluationSchema.index({ date: 1 });
attendanceEvaluationSchema.index({ 'flags.triggered': 1 });
attendanceEvaluationSchema.index({ 'flags.approval_required': 1 });
attendanceEvaluationSchema.index({ evaluated_at: -1 });

// Prevent duplicate evaluations for same attendance record
attendanceEvaluationSchema.index({ attendance_id: 1, evaluated_at: 1 }, { unique: true });

const AttendanceEvaluation = mongoose.model('AttendanceEvaluation', attendanceEvaluationSchema);

export default AttendanceEvaluation;
