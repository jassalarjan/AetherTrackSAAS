import mongoose from 'mongoose';

/**
 * Meeting Model
 * Core entity for the Meeting Management system embedded in the HR Calendar.
 *
 * RBAC notes:
 *  - Visibility scope is enforced at query time in routes/meetings.js
 *  - Super Admin / Admin / HR: full CRUD
 *  - team_lead / member: read-only, filtered by visibility_scope + participant list
 */

const recurrenceRuleSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'],
    required: true
  },
  interval: { type: Number, default: 1 },           // every N frequency units
  days_of_week: [{ type: Number, min: 0, max: 6 }], // 0=Sun … 6=Sat (for weekly)
  end_date: { type: Date, default: null },           // null = no end
  occurrences: { type: Number, default: null }       // alternative: stop after N
}, { _id: false });

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      default: '',
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    agenda: {
      type: String,
      default: '',
      maxlength: [10000, 'Agenda cannot exceed 10 000 characters']
    },

    // ── Scheduling ──────────────────────────────────────────────────────────
    start_time: {
      type: Date,
      required: [true, 'Start time is required']
    },
    end_time: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function (v) { return v > this.start_time; },
        message: 'end_time must be after start_time'
      }
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    is_all_day: {
      type: Boolean,
      default: false
    },

    // ── Recurrence ─────────────────────────────────────────────────────────
    is_recurring: {
      type: Boolean,
      default: false
    },
    recurrence_rule: {
      type: recurrenceRuleSchema,
      default: null
    },
    /**
     * For recurring series: children store parent_meeting_id.
     * Individual occurrences can be edited independently.
     */
    parent_meeting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null
    },
    occurrence_date: {
      type: Date,
      default: null
    },

    // ── Ownership ──────────────────────────────────────────────────────────
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    organizer_role: {
      type: String,
      enum: ['super_admin', 'admin', 'hr'],
      required: true
    },

    // ── Participants ────────────────────────────────────────────────────────
    /**
     * Granular participant list — individual users.
     * For broad broadcasts use visibility_scope.
     */
    participant_users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    participant_teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
      }
    ],
    participant_departments: [
      {
        type: String,
        trim: true
      }
    ],

    // ── Visibility ──────────────────────────────────────────────────────────
    visibility_scope: {
      type: String,
      enum: ['org_wide', 'department', 'team', 'private'],
      default: 'org_wide',
      required: true
    },

    // ── Classification ──────────────────────────────────────────────────────
    meeting_type: {
      type: String,
      enum: ['hr', 'all_hands', 'team', 'interview', 'review', 'one_on_one', 'external', 'other'],
      default: 'other'
    },

    // ── Status ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    cancelled_reason: {
      type: String,
      default: ''
    },

    // ── Extensibility hooks (future-proof) ───────────────────────────────────
    conference_link: {
      type: String,
      default: ''
    },
    recording_url: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    tags: [{ type: String, trim: true }],

    // ── Agenda visibility toggle for participants ────────────────────────────
    agenda_visible_to_participants: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
meetingSchema.index({ start_time: 1, end_time: 1 });
meetingSchema.index({ created_by: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ visibility_scope: 1 });
meetingSchema.index({ participant_users: 1 });
meetingSchema.index({ participant_teams: 1 });
meetingSchema.index({ parent_meeting_id: 1 });
meetingSchema.index({ meeting_type: 1 });

export default mongoose.model('Meeting', meetingSchema);
