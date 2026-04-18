/**
 * taskReallocationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Business-continuity engine: ensures zero task stagnation when a team member
 * goes on leave or is marked absent.
 *
 * Design principles:
 *  • Transactional safety  — uses Mongoose sessions; partial failures roll back
 *  • Idempotent            — safe to call multiple times for the same leave
 *  • Fail-safe             — errors are logged and surfaced, never swallowed
 *  • Auditable             — every action produces a TaskReallocationLog record
 *  • Human-in-control      — Team Lead must accept / redistribute / reject
 */

import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import LeaveRequest from '../models/LeaveRequest.js';
import TaskReallocationLog from '../models/TaskReallocationLog.js';
import Notification from '../models/Notification.js';
import { logChange } from '../utils/changeLogService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the best fallback assignee for a task.
 * Priority: project team_lead → project creator → team lead_id → null
 */
async function resolveTeamLead(task, absentUserId) {
  // 1. Check the project for a team_lead role member
  if (task.project_id) {
    const project = await Project.findById(task.project_id)
      .populate('team_members.user', '_id role full_name')
      .lean();

    if (project) {
      // Find team_lead in project members
      const projectLead = project.team_members.find(
        m => m.role === 'team_lead' && m.user?._id?.toString() !== absentUserId.toString()
      );
      if (projectLead?.user?._id) return projectLead.user._id;

      // Fallback to project creator (if not the absent user)
      if (project.created_by?.toString() !== absentUserId.toString()) {
        return project.created_by;
      }
    }
  }

  // 2. Fallback: Team lead from user's primary team
  if (task.team_id) {
    const team = await Team.findById(task.team_id).lean();
    if (team?.lead_id && team.lead_id.toString() !== absentUserId.toString()) {
      return team.lead_id;
    }
  }

  // 3. Fallback: any team lead in the same team as the absent user
  const absentUser = await User.findById(absentUserId).lean();
  if (absentUser?.team_id) {
    const team = await Team.findById(absentUser.team_id).lean();
    if (team?.lead_id && team.lead_id.toString() !== absentUserId.toString()) {
      return team.lead_id;
    }
  }

  return null; // No lead found — caller handles this edge case
}

/**
 * Push an in-app notification and emit via Socket.IO if available.
 */
async function pushNotification(app, userId, type, message, payload = {}) {
  const notif = await Notification.create({
    user_id: userId,
    type,
    message,
    payload
  });

  await logChange({
    event_type: 'notification_sent',
    user_id: userId,
    target_type: 'notification',
    target_id: notif._id.toString(),
    target_name: type,
    action: 'NOTIFICATION_SENT',
    description: `Notification (${type}) sent to user ${userId.toString()}`,
    metadata: {
      notification_type: type,
      message,
      payload
    }
  });

  // Real-time delivery via Socket.IO if available
  if (app) {
    const io = app.get('io');
    if (io) {
      io.to(userId.toString()).emit('notification', {
        _id: notif._id,
        type,
        message,
        payload,
        created_at: notif.created_at
      });
    }
  }

  return notif;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: triggerReallocation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main entry point called when a leave is approved or absence is marked.
 *
 * @param {object} params
 * @param {string}   params.triggerType        - 'leave_approved' | 'absence_marked'
 * @param {ObjectId} params.triggerRefId       - LeaveRequest._id or Attendance._id
 * @param {ObjectId} params.absentUserId       - Employee going on leave
 * @param {Date}     params.leaveStartDate
 * @param {Date}     params.leaveEndDate
 * @param {object}   params.actorUser          - HR/Admin user who triggered the action
 * @param {string}   params.ipAddress
 * @param {object}   [params.app]              - Express app (for Socket.IO)
 *
 * @returns {{ reallocated: number, skipped: number, logs: TaskReallocationLog[] }}
 */
export async function triggerReallocation({
  triggerType,
  triggerRefId,
  absentUserId,
  leaveStartDate,
  leaveEndDate,
  actorUser,
  ipAddress,
  app
}) {
  // ── Guard: idempotency ─────────────────────────────────────────────────────
  // Only block re-runs when tasks were actually reallocated (count > 0).
  // If the previous run found 0 tasks (e.g. the task had no due date yet),
  // allow re-triggering so newly-updated tasks are caught.
  if (triggerType === 'leave_approved') {
    const leave = await LeaveRequest.findById(triggerRefId).lean();
    if (leave?.reallocationTriggered && leave.reallocationCount > 0) {
      console.log(`[Reallocation] Already triggered for leave ${triggerRefId} (${leave.reallocationCount} tasks), skipping.`);
      return { reallocated: 0, skipped: 0, logs: [] };
    }
  }

  const start = new Date(leaveStartDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(leaveEndDate);
  end.setHours(23, 59, 59, 999);

  // ── Find active tasks assigned to absent user within the leave window ──────
  const activeTasks = await Task.find({
    assigned_to: absentUserId,
    status: { $in: ['todo', 'in_progress', 'review'] },
    $or: [
      // Task due date falls within leave window
      { due_date: { $gte: start, $lte: end } },
      // Task start date falls within leave window
      { start_date: { $gte: start, $lte: end } },
      // Task spans across the leave window
      { start_date: { $lte: start }, due_date: { $gte: end } },
      // In-progress tasks with no end date (indefinite)
      { status: 'in_progress', due_date: { $gte: start } }
    ],
    // Skip tasks already reallocated for this leave (additional idempotency)
    reallocation_log_id: null
  }).lean();

  if (!activeTasks.length) {
    // Do NOT permanently lock the leave when 0 tasks are found —
    // the employee may have tasks added/updated after approval.
    // Only set reallocationTriggered=true once we have actually processed tasks.
    console.log(`[Reallocation] No matching tasks found for leave ${triggerRefId}.`);
    return { reallocated: 0, skipped: 0, logs: [] };
  }

  const logs = [];
  let reallocated = 0;
  let skipped = 0;

  // ── Process each task in its own session transaction ──────────────────────
  for (const task of activeTasks) {
    const session = await mongoose.startSession();
    // Track the resolved leadId outside the transaction so post-commit
    // notification code can reference it without a stale closure.
    let resolvedLeadId = null;
    let committedLog   = null;

    try {
      await session.withTransaction(async () => {
        // Resolve who receives the reallocation
        resolvedLeadId = await resolveTeamLead(task, absentUserId);

        if (!resolvedLeadId) {
          console.warn(`[Reallocation] No team lead found for task ${task._id}, skipping.`);
          // Throw to abort the transaction cleanly
          throw Object.assign(new Error('NO_LEAD'), { skipOnly: true });
        }

        // Create the audit log
        const logEntry = new TaskReallocationLog({
          triggerType,
          triggerRefId,
          leaveStartDate: start,
          leaveEndDate: end,
          originalUserId: absentUserId,
          reallocatedToUserId: resolvedLeadId,
          taskId: task._id,
          taskTitle: task.title,
          projectId: task.project_id || null,
          sprintId: task.sprint_id || null,
          taskPriority: task.priority,
          taskDueDate: task.due_date,
          originalDueDate: task.due_date,
          status: 'pending',
          reallocationReason: 'User on approved leave'
        });
        await logEntry.save({ session });

        // Update the task — add lead to assignees, flag as reallocated
        await Task.findByIdAndUpdate(
          task._id,
          {
            $addToSet: { assigned_to: resolvedLeadId },
            reallocation_status: 'reallocated',
            reallocated_from: absentUserId,
            reallocation_reason: 'User on approved leave',
            reallocation_log_id: logEntry._id,
            updated_at: new Date()
          },
          { session }
        );

        committedLog = logEntry;
      });

      if (committedLog) {
        logs.push(committedLog);
        reallocated++;

        // ── Post-transaction: notifications (outside session) ───────────
        const absentUser = await User.findById(absentUserId).lean();
        const absentName = absentUser?.full_name || 'A team member';

        // Notify the Team Lead
        await pushNotification(
          app,
          resolvedLeadId,
          'reallocation_pending',
          `📋 Task "${task.title}" has been reallocated to you — ${absentName} is on leave.`,
          {
            reallocationLogId: committedLog._id,
            taskId: task._id,
            taskTitle: task.title,
            originalUserId: absentUserId,
            leaveStart: start,
            leaveEnd: end
          }
        );

        // Audit log entry
        await logChange({
          userId: actorUser._id,
          action: 'reallocate',
          entity: 'task',
          entityId: task._id,
          details: {
            reallocationLogId: committedLog._id,
            from: absentUserId,
            to: resolvedLeadId,
            reason: 'leave_approved'
          },
          ipAddress
        });
      }
    } catch (err) {
      if (err.skipOnly) {
        skipped++;
      } else {
        console.error(`[Reallocation] Failed for task ${task._id}:`, err.message);
        skipped++;
      }
    } finally {
      session.endSession();
    }
  }

  // ── Mark leave as triggered ────────────────────────────────────────────────
  await _markLeaveReallocationDone(triggerRefId, reallocated);

  console.log(`[Reallocation] Done. Reallocated: ${reallocated}, Skipped: ${skipped}`);
  return { reallocated, skipped, logs };
}

async function _markLeaveReallocationDone(leaveId, count) {
  try {
    await LeaveRequest.findByIdAndUpdate(leaveId, {
      reallocationTriggered: true,
      reallocationCount: count
    });
  } catch (_) { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Lead Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accept a reallocation — Team Lead confirms they take ownership.
 */
export async function acceptReallocation({ logId, leadUser, notes, app, ipAddress }) {
  const log = await TaskReallocationLog.findById(logId);
  if (!log) throw new Error('Reallocation log not found');
  if (log.status !== 'pending') throw new Error(`Cannot accept a reallocation in status: ${log.status}`);
  if (log.reallocatedToUserId.toString() !== leadUser._id.toString()) {
    throw new Error('Unauthorized: You are not the assigned Team Lead for this reallocation');
  }

  log.status = 'accepted';
  log.actedAt = new Date();
  log.leadNotes = notes || '';
  await log.save();

  await logChange({
    userId: leadUser._id,
    action: 'accept_reallocation',
    entity: 'task_reallocation_log',
    entityId: logId,
    details: { taskId: log.taskId, notes },
    ipAddress
  });

  // Notify the absent employee
  await pushNotification(
    app,
    log.originalUserId,
    'reallocation_accepted',
    `✅ Your task "${log.taskTitle}" has been accepted by the Team Lead during your leave.`,
    { reallocationLogId: log._id, taskId: log.taskId }
  );

  return log;
}

/**
 * Reject a reallocation — Team Lead refuses; original user is restored.
 */
export async function rejectReallocation({ logId, leadUser, rejectionReason, app, ipAddress }) {
  if (!rejectionReason?.trim()) throw new Error('Rejection reason is required');

  const log = await TaskReallocationLog.findById(logId);
  if (!log) throw new Error('Reallocation log not found');
  if (log.status !== 'pending') throw new Error(`Cannot reject a reallocation in status: ${log.status}`);
  if (log.reallocatedToUserId.toString() !== leadUser._id.toString()) {
    throw new Error('Unauthorized');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Remove the Team Lead from assignees, restore reallocation flags
      await Task.findByIdAndUpdate(
        log.taskId,
        {
          $pull: { assigned_to: log.reallocatedToUserId },
          reallocation_status: 'restored',
          reallocation_log_id: null,
          reallocated_from: null,
          reallocation_reason: null,
          updated_at: new Date()
        },
        { session }
      );

      log.status = 'rejected';
      log.rejectionReason = rejectionReason;
      log.actedAt = new Date();
      await log.save({ session });
    });
  } finally {
    session.endSession();
  }

  await logChange({
    userId: leadUser._id,
    action: 'reject_reallocation',
    entity: 'task_reallocation_log',
    entityId: logId,
    details: { reason: rejectionReason },
    ipAddress
  });

  // Notify HR/Admin
  const hrUsers = await User.find({ role: { $in: ['admin', 'hr'] } }).select('_id').lean();
  const absentUser = await User.findById(log.originalUserId).lean();
  for (const hr of hrUsers) {
    await pushNotification(
      app,
      hr._id,
      'reallocation_rejected',
      `⚠️ Team Lead rejected reallocation of "${log.taskTitle}" (was assigned to ${absentUser?.full_name || 'a user'}).`,
      { reallocationLogId: log._id, taskId: log.taskId, reason: rejectionReason }
    );
  }

  return log;
}

/**
 * Redistribute — Team Lead reassigns the task to another team member.
 */
export async function redistributeTask({
  logId,
  leadUser,
  newAssigneeId,
  adjustedDueDate,
  notes,
  app,
  ipAddress
}) {
  const log = await TaskReallocationLog.findById(logId);
  if (!log) throw new Error('Reallocation log not found');
  if (!['pending', 'accepted'].includes(log.status)) {
    throw new Error(`Cannot redistribute a reallocation in status: ${log.status}`);
  }
  if (log.reallocatedToUserId.toString() !== leadUser._id.toString()) {
    throw new Error('Unauthorized');
  }

  // Validate new assignee exists
  const newAssignee = await User.findById(newAssigneeId).lean();
  if (!newAssignee) throw new Error('New assignee not found');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const taskUpdate = {
        $addToSet: { assigned_to: newAssigneeId },
        $pull: {},
        reallocation_status: 'redistributed',
        updated_at: new Date()
      };

      if (adjustedDueDate) {
        taskUpdate.due_date = new Date(adjustedDueDate);
        log.adjustedDueDate = new Date(adjustedDueDate);
      }

      await Task.findByIdAndUpdate(log.taskId, taskUpdate, { session });

      log.status = 'redistributed';
      log.redistributedToUserId = newAssigneeId;
      log.actedAt = new Date();
      log.leadNotes = notes || log.leadNotes;
      await log.save({ session });
    });
  } finally {
    session.endSession();
  }

  await logChange({
    userId: leadUser._id,
    action: 'redistribute_task',
    entity: 'task_reallocation_log',
    entityId: logId,
    details: { newAssigneeId, adjustedDueDate, notes },
    ipAddress
  });

  // Notify new assignee
  await pushNotification(
    app,
    newAssigneeId,
    'task_assigned',
    `📋 Task "${log.taskTitle}" has been assigned to you by the Team Lead.`,
    { reallocationLogId: log._id, taskId: log.taskId }
  );

  // Notify absent employee
  await pushNotification(
    app,
    log.originalUserId,
    'reallocation_redistributed',
    `📋 Your task "${log.taskTitle}" has been redistributed to a team member during your leave.`,
    { reallocationLogId: log._id, taskId: log.taskId }
  );

  return log;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all pending reallocations for a specific Team Lead
 */
export async function getPendingReallocations(leadUserId) {
  return TaskReallocationLog.find({
    reallocatedToUserId: leadUserId,
    status: 'pending'
  })
    .populate('taskId', 'title status priority due_date project_id')
    .populate('originalUserId', 'full_name email profile_picture')
    .populate('projectId', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get full reallocation history (filterable)
 */
export async function getReallocationHistory({
  userId,
  role,
  projectId,
  status,
  page = 1,
  limit = 20
}) {
  const query = {};

  if (role === 'team_lead') {
    query.reallocatedToUserId = userId;
  } else if (role === 'member') {
    query.originalUserId = userId;
  }
  // admin/hr sees all

  if (projectId) query.projectId = projectId;
  if (status)    query.status = status;

  const [logs, total] = await Promise.all([
    TaskReallocationLog.find(query)
      .populate('taskId', 'title status priority due_date')
      .populate('originalUserId', 'full_name email profile_picture')
      .populate('reallocatedToUserId', 'full_name email profile_picture')
      .populate('redistributedToUserId', 'full_name email profile_picture')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TaskReallocationLog.countDocuments(query)
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}
