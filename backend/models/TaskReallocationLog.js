import mongoose from 'mongoose';

/**
 * TaskReallocationLog
 * ─────────────────────────────────────────────────────────────────────────────
 * Immutable audit log for every task reallocation event.
 * Each document captures a single task's transition from one assignee to
 * another as a consequence of a leave / absence trigger.
 *
 * Lifecycle:
 *   system creates  → status: 'pending'   (Team Lead notified)
 *   lead accepts    → status: 'accepted'  (task assigned to lead or redistributed)
 *   lead rejects    → status: 'rejected'  (original assignee reinstated, flag set)
 *   lead reassigns  → status: 'redistributed' (task moved to another member)
 */
const taskReallocationLogSchema = new mongoose.Schema(
  {
    // ── Trigger context ───────────────────────────────────────────────────
    triggerType: {
      type: String,
      enum: ['leave_approved', 'absence_marked'],
      required: true
    },
    /** The leave request or attendance record that triggered this */
    triggerRefId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    /** ISO date range the leave covers */
    leaveStartDate: { type: Date, required: true },
    leaveEndDate:   { type: Date, required: true },

    // ── Parties ───────────────────────────────────────────────────────────
    /** Employee who went on leave */
    originalUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    /** Team Lead / PM who received the reallocation */
    reallocatedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    /** If Team Lead further redistributed, track the final assignee */
    redistributedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ── Task snapshot ─────────────────────────────────────────────────────
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true
    },
    taskTitle:    { type: String, required: true },
    projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    sprintId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint',  default: null },
    taskPriority: { type: String, default: 'medium' },
    taskDueDate:  { type: Date,   default: null },

    // ── Status machine ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'redistributed'],
      default: 'pending',
      index: true
    },
    reallocationReason: {
      type: String,
      default: 'User on approved leave'
    },
    rejectionReason: {
      type: String,
      default: ''
    },

    // ── Team Lead actions ─────────────────────────────────────────────────
    /** Timestamp when Team Lead acted on this reallocation */
    actedAt: { type: Date, default: null },
    /** Optional notes from the Team Lead */
    leadNotes: { type: String, default: '' },

    // ── Deadline adjustment ────────────────────────────────────────────────
    originalDueDate:  { type: Date, default: null },
    adjustedDueDate:  { type: Date, default: null }
  },
  { timestamps: true }
);

// Compound index for efficient Team Lead dashboard queries
taskReallocationLogSchema.index({ reallocatedToUserId: 1, status: 1, createdAt: -1 });
taskReallocationLogSchema.index({ originalUserId: 1, createdAt: -1 });
taskReallocationLogSchema.index({ taskId: 1, status: 1 });
taskReallocationLogSchema.index({ projectId: 1, status: 1 });

export default mongoose.model('TaskReallocationLog', taskReallocationLogSchema);
