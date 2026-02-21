/**
 * Meeting Routes  —  /api/hr/meetings
 *
 * RBAC matrix:
 *  super_admin | admin | hr  →  full CRUD + conflict detection
 *  team_lead   | member      →  read-only, scoped to visibility_scope
 */

import express from 'express';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { checkRole } from '../middleware/roleCheck.js';
import { auditLogger } from '../middleware/auditLogger.js';
import mongoose from 'mongoose';

const router = express.Router();

// ─── Role sets ──────────────────────────────────────────────────────────────
const ADMIN_ROLES = ['admin', 'hr', 'community_admin'];

/**
 * Build a visibility filter for the requesting user.
 * Admins/HR see everything; team members see only meetings they are scoped to.
 */
const buildVisibilityFilter = async (user) => {
  if (ADMIN_ROLES.includes(user.role)) return {};

  // team_lead / member — return meetings where at least one condition is true:
  //  1. org_wide visibility
  //  2. team-level visibility AND user belongs to the team
  //  3. department-level visibility AND user's department matches
  //  4. user is an explicit participant
  const userTeamIds = user.teams?.map(t => t.toString()) || (user.team_id ? [user.team_id.toString()] : []);

  return {
    $or: [
      { visibility_scope: 'org_wide' },
      { visibility_scope: 'team', participant_teams: { $in: userTeamIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { visibility_scope: 'department', participant_departments: user.department || '__none__' },
      { participant_users: user._id }
    ]
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/meetings
// Query params: start, end, status, type, view(month|week|day|timeline)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { start, end, status, type } = req.query;

    const filter = await buildVisibilityFilter(req.user);
    if (status) filter.status = status;
    if (type) filter.meeting_type = type;

    // Date range — default to current month if not provided
    const rangeStart = start ? new Date(start) : new Date(new Date().setDate(1));
    const rangeEnd = end
      ? new Date(end)
      : new Date(new Date(rangeStart).setMonth(rangeStart.getMonth() + 1));

    filter.$and = [
      { start_time: { $lte: rangeEnd } },
      { end_time: { $gte: rangeStart } }
    ];

    const meetings = await Meeting.find(filter)
      .populate('created_by', 'full_name email role profile_picture')
      .populate('participant_users', 'full_name email profile_picture')
      .populate('participant_teams', 'name')
      .sort({ start_time: 1 })
      .lean();

    // Strip agenda from participants if flag is off and requester is not admin
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    const sanitized = meetings.map(m => {
      if (!isAdmin && !m.agenda_visible_to_participants) {
        const { agenda, ...rest } = m;
        return rest;
      }
      return m;
    });

    res.json({ meetings: sanitized, count: sanitized.length });
  } catch (err) {
    console.error('GET /meetings error:', err);
    res.status(500).json({ message: 'Failed to fetch meetings', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/meetings/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const filter = await buildVisibilityFilter(req.user);
    filter._id = req.params.id;

    const meeting = await Meeting.findOne(filter)
      .populate('created_by', 'full_name email role profile_picture')
      .populate('participant_users', 'full_name email profile_picture team_id')
      .populate('participant_teams', 'name')
      .lean();

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found or access denied' });
    }

    // Strip agenda if restricted
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    if (!isAdmin && !meeting.agenda_visible_to_participants) {
      delete meeting.agenda;
    }

    res.json(meeting);
  } catch (err) {
    console.error('GET /meetings/:id error:', err);
    res.status(500).json({ message: 'Failed to fetch meeting', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hr/meetings  — Admin / HR only
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  checkRole(ADMIN_ROLES),
  auditLogger({ event_type: 'system_event', target_type: 'Meeting', action: 'CREATE_MEETING' }),
  async (req, res) => {
    try {
      const {
        title, description, agenda,
        start_time, end_time, timezone, is_all_day,
        is_recurring, recurrence_rule,
        participant_users, participant_teams, participant_departments,
        visibility_scope, meeting_type,
        conference_link, tags, agenda_visible_to_participants
      } = req.body;

      // ── Conflict detection ──────────────────────────────────────────────
      const conflictFilter = {
        status: 'scheduled',
        $and: [
          { start_time: { $lt: new Date(end_time) } },
          { end_time: { $gt: new Date(start_time) } }
        ],
        $or: [
          { visibility_scope: 'org_wide' },
          ...(participant_teams?.length ? [{ participant_teams: { $in: participant_teams } }] : []),
          ...(participant_users?.length ? [{ participant_users: { $in: participant_users } }] : [])
        ]
      };
      const conflicts = await Meeting.find(conflictFilter).select('_id title start_time end_time').lean();

      const meeting = await Meeting.create({
        title,
        description,
        agenda,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        timezone: timezone || 'UTC',
        is_all_day: is_all_day || false,
        is_recurring: is_recurring || false,
        recurrence_rule: is_recurring ? recurrence_rule : null,
        created_by: req.user._id,
        organizer_role: req.user.role,
        participant_users: participant_users || [],
        participant_teams: participant_teams || [],
        participant_departments: participant_departments || [],
        visibility_scope: visibility_scope || 'org_wide',
        meeting_type: meeting_type || 'other',
        conference_link: conference_link || '',
        tags: tags || [],
        agenda_visible_to_participants: agenda_visible_to_participants !== false
      });

      // ── Notify participants ──────────────────────────────────────────────
      await notifyParticipants(meeting, 'meeting_created', req.app.get('io'));

      const populated = await meeting.populate([
        { path: 'created_by', select: 'full_name email role' },
        { path: 'participant_users', select: 'full_name email' },
        { path: 'participant_teams', select: 'name' }
      ]);

      res.status(201).json({
        meeting: populated,
        conflicts: conflicts.length ? conflicts : undefined
      });
    } catch (err) {
      console.error('POST /meetings error:', err);
      res.status(500).json({ message: 'Failed to create meeting', error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/hr/meetings/:id  — Admin / HR only
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  checkRole(ADMIN_ROLES),
  auditLogger({ event_type: 'system_event', target_type: 'Meeting', action: 'UPDATE_MEETING' }),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.id);
      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      const allowedFields = [
        'title', 'description', 'agenda', 'start_time', 'end_time', 'timezone',
        'is_all_day', 'is_recurring', 'recurrence_rule',
        'participant_users', 'participant_teams', 'participant_departments',
        'visibility_scope', 'meeting_type', 'status', 'cancelled_reason',
        'conference_link', 'notes', 'tags', 'agenda_visible_to_participants'
      ];

      const changed = [];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          changed.push(field);
          meeting[field] = field === 'start_time' || field === 'end_time'
            ? new Date(req.body[field])
            : req.body[field];
        }
      });

      await meeting.save();

      // Notify if scheduling changed or status changed to cancelled
      const schedulingChanged = changed.some(f => ['start_time', 'end_time', 'status'].includes(f));
      if (schedulingChanged) {
        const type = meeting.status === 'cancelled' ? 'meeting_cancelled' : 'meeting_updated';
        await notifyParticipants(meeting, type, req.app.get('io'));
      }

      const populated = await meeting.populate([
        { path: 'created_by', select: 'full_name email role' },
        { path: 'participant_users', select: 'full_name email' },
        { path: 'participant_teams', select: 'name' }
      ]);

      res.json(populated);
    } catch (err) {
      console.error('PUT /meetings/:id error:', err);
      res.status(500).json({ message: 'Failed to update meeting', error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/hr/meetings/:id/cancel  — Admin / HR only
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  '/:id/cancel',
  checkRole(ADMIN_ROLES),
  auditLogger({ event_type: 'system_event', target_type: 'Meeting', action: 'CANCEL_MEETING' }),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.id);
      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      meeting.status = 'cancelled';
      meeting.cancelled_reason = req.body.reason || '';
      await meeting.save();

      await notifyParticipants(meeting, 'meeting_cancelled', req.app.get('io'));

      res.json({ message: 'Meeting cancelled', meeting });
    } catch (err) {
      console.error('PATCH /meetings/:id/cancel error:', err);
      res.status(500).json({ message: 'Failed to cancel meeting', error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/hr/meetings/:id  — Admin only (hard delete — use cancel in most cases)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  checkRole(['admin', 'community_admin']),
  auditLogger({ event_type: 'system_event', target_type: 'Meeting', action: 'DELETE_MEETING' }),
  async (req, res) => {
    try {
      const meeting = await Meeting.findByIdAndDelete(req.params.id);
      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      // Also remove child occurrences if this is a recurring series root
      await Meeting.deleteMany({ parent_meeting_id: req.params.id });

      res.json({ message: 'Meeting deleted permanently' });
    } catch (err) {
      console.error('DELETE /meetings/:id error:', err);
      res.status(500).json({ message: 'Failed to delete meeting', error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/meetings/check-conflicts — Admin / HR only
// Body: { start_time, end_time, participant_users?, participant_teams?, exclude_id? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/check-conflicts', checkRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { start_time, end_time, participant_users, participant_teams, exclude_id } = req.body;

    const filter = {
      status: 'scheduled',
      $and: [
        { start_time: { $lt: new Date(end_time) } },
        { end_time: { $gt: new Date(start_time) } }
      ],
      $or: [
        { visibility_scope: 'org_wide' },
        ...(participant_teams?.length ? [{ participant_teams: { $in: participant_teams } }] : []),
        ...(participant_users?.length ? [{ participant_users: { $in: participant_users } }] : [])
      ]
    };

    if (exclude_id) filter._id = { $ne: exclude_id };

    const conflicts = await Meeting.find(filter)
      .select('_id title start_time end_time visibility_scope meeting_type')
      .lean();

    res.json({ conflicts, has_conflicts: conflicts.length > 0 });
  } catch (err) {
    res.status(500).json({ message: 'Conflict check failed', error: err.message });
  }
});

// ─── Notification helper ─────────────────────────────────────────────────────
async function notifyParticipants(meeting, type, io) {
  try {
    // Determine recipient user IDs
    const recipientIds = new Set(meeting.participant_users.map(u => u.toString()));

    // Expand team members
    if (meeting.participant_teams?.length) {
      const teamMembers = await User.find(
        { $or: [{ team_id: { $in: meeting.participant_teams } }, { teams: { $in: meeting.participant_teams } }] },
        '_id'
      ).lean();
      teamMembers.forEach(u => recipientIds.add(u._id.toString()));
    }

    // Expand org_wide — notify all active users (cap at reasonable size)
    if (meeting.visibility_scope === 'org_wide') {
      const allActive = await User.find({ employmentStatus: 'ACTIVE' }, '_id').limit(500).lean();
      allActive.forEach(u => recipientIds.add(u._id.toString()));
    }

    const messages = {
      meeting_created: `New meeting scheduled: "${meeting.title}"`,
      meeting_updated: `Meeting updated: "${meeting.title}"`,
      meeting_cancelled: `Meeting cancelled: "${meeting.title}"`
    };

    const notifications = [...recipientIds].map(userId => ({
      user_id: userId,
      type: type, // meeting_created | meeting_updated | meeting_cancelled
      message: messages[type] || `Meeting: "${meeting.title}"`,
      payload: {
        entity_type: 'meeting',
        entity_id: meeting._id,
        meeting_type: meeting.meeting_type,
        start_time: meeting.start_time,
        notification_category: type
      }
    }));

    const saved = await Notification.insertMany(notifications, { ordered: false });

    // Real-time via Socket.IO
    if (io) {
      saved.forEach(n => {
        io.to(n.user_id.toString()).emit('notification', {
          _id: n._id,
          type: n.type,
          message: n.message,
          payload: n.payload,
          created_at: n.created_at
        });
      });
    }
  } catch (err) {
    console.error('Meeting notification error:', err);
    // non-blocking — swallow
  }
}

export default router;
