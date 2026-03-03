/**
 * AttendancePolicy Model
 * 
 * Configurable attendance policies that define rules like:
 * - Grace period for late check-in
 * - Minimum working hours
 * - Auto half-day rules
 * - Auto-absence rules
 * - Approval requirements for exceptions
 * 
 * Policies can be role-aware and team-aware.
 */

import mongoose from 'mongoose';

const attendancePolicySchema = new mongoose.Schema({
  policy_name: {
    type: String,
    required: [true, 'Policy name is required'],
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    default: '',
    maxlength: 500
  },

  // Policy scope - applies to specific roles, teams, or all
  scope: {
    // null/empty means applies to everyone
    roles: {
      type: [String],
      enum: ['admin', 'hr', 'team_lead', 'member'],
      default: []
    },
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }],
    // null means applies to all users
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // Time-based rules
  rules: {
    // Grace period for late check-in (in minutes)
    grace_period_minutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 120
    },

    // Minimum working hours to be marked as present
    minimum_working_hours: {
      type: Number,
      default: 8,
      min: 1,
      max: 24
    },

    // Hours threshold for half-day
    half_day_hours_threshold: {
      type: Number,
      default: 4,
      min: 1,
      max: 8
    },

    // Auto half-day: mark as half-day if check-in is after this time (HH:MM format)
    half_day_after_time: {
      type: String,
      default: null, // e.g., "11:00"
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    },

    // Auto absence: mark as absent if no check-in by this time (HH:MM format)
    auto_absent_after_time: {
      type: String,
      default: null, // e.g., "12:00"
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    },

    // Maximum late minutes before marking as absent
    max_late_minutes: {
      type: Number,
      default: 60,
      min: 0,
      max: 240
    },

    // Working days configuration (0 = Sunday, 6 = Saturday)
    working_days: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Monday to Friday
      validate: {
        validator: function(v) {
          return v.every(d => d >= 0 && d <= 6) && [...new Set(v)].length === v.length;
        },
        message: 'Working days must be unique values between 0-6'
      }
    },

    // Whether approval is required for late check-in
    require_approval_for_late: {
      type: Boolean,
      default: false
    },

    // Whether approval is required for early exit
    require_approval_for_early_exit: {
      type: Boolean,
      default: false
    },

    // Whether approval is required for WFH
    require_approval_for_wfh: {
      type: Boolean,
      default: false
    },

    // Consecutive absent days before triggering alert
    consecutive_absence_alert_threshold: {
      type: Number,
      default: 3,
      min: 1,
      max: 30
    },

    // Enable overtime tracking
    enable_overtime: {
      type: Boolean,
      default: true
    },

    // Overtime threshold hours
    overtime_threshold_hours: {
      type: Number,
      default: 9,
      min: 8,
      max: 24
    }
  },

  // Shift-specific configuration
  shift_config: {
    // Apply shift timing rules
    respect_shift_timing: {
      type: Boolean,
      default: true
    },
    // Allow flexible check-in around shift start
    flexible_checkin_window_minutes: {
      type: Number,
      default: 30,
      min: 0,
      max: 120
    }
  },

  // Verification rules for attendance verification
  verification_rules: {
    // Whether photo verification is required
    photoRequired: {
      type: Boolean,
      default: false
    },
    // Whether GPS verification is required
    gpsRequired: {
      type: Boolean,
      default: false
    },
    // Allowed geofence IDs (if empty, all active geofences are allowed)
    allowedGeofenceIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GeofenceLocation'
    }],
    // Roles that bypass verification (e.g., admins may not need photo/GPS)
    bypassVerificationRoles: {
      type: [String],
      enum: ['admin', 'hr', 'team_lead', 'member'],
      default: ['admin']
    }
  },

  // Policy priority (higher priority policies override lower ones)
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Whether this policy is active
  is_active: {
    type: Boolean,
    default: true
  },

  // Policy creator
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // When the policy becomes effective
  effective_from: {
    type: Date,
    default: Date.now
  },

  // When the policy expires (null means never)
  effective_until: {
    type: Date,
    default: null
  },

  // Additional notes
  notes: {
    type: String,
    default: '',
    maxlength: 1000
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for efficient queries
attendancePolicySchema.index({ is_active: 1, priority: -1 });
attendancePolicySchema.index({ 'scope.roles': 1 });
attendancePolicySchema.index({ 'scope.teams': 1 });
attendancePolicySchema.index({ 'scope.users': 1 });
attendancePolicySchema.index({ effective_from: 1 });

/**
 * Check if a policy applies to a given user
 */
attendancePolicySchema.methods.appliesTo = function(user) {
  const userRoles = Array.isArray(user.role) ? user.role : [user.role];
  const userTeamIds = user.teams ? user.teams.map(t => t.toString()) : (user.team_id ? [user.team_id.toString()] : []);
  const userId = user._id.toString();

  // If policy has specific users listed, check if user is in list
  if (this.scope.users && this.scope.users.length > 0) {
    const policyUserIds = this.scope.users.map(u => u.toString());
    if (!policyUserIds.includes(userId)) {
      return false;
    }
    return true;
  }

  // If policy has specific teams listed, check if user is in one of them
  if (this.scope.teams && this.scope.teams.length > 0) {
    const policyTeamIds = this.scope.teams.map(t => t.toString());
    const hasMatchingTeam = userTeamIds.some(t => policyTeamIds.includes(t));
    if (!hasMatchingTeam) {
      return false;
    }
  }

  // If policy has specific roles listed, check if user has one of them
  if (this.scope.roles && this.scope.roles.length > 0) {
    const hasMatchingRole = userRoles.some(r => this.scope.roles.includes(r));
    if (!hasMatchingRole) {
      return false;
    }
  }

  // No specific scope means applies to everyone
  return true;
};

/**
 * Find applicable policy for a user
 */
attendancePolicySchema.statics.findApplicablePolicy = async function(user) {
  const now = new Date();
  
  const policies = await this.find({
    is_active: true,
    effective_from: { $lte: now },
    $or: [
      { effective_until: null },
      { effective_until: { $gte: now } }
    ]
  }).sort({ priority: -1 });

  for (const policy of policies) {
    if (policy.appliesTo(user)) {
      return policy;
    }
  }

  return null;
};

const AttendancePolicy = mongoose.model('AttendancePolicy', attendancePolicySchema);

export default AttendancePolicy;
