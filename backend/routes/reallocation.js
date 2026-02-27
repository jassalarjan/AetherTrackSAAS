/**
 * routes/reallocation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST API for task reallocation workflows.
 *
 * Roles:
 *  GET  /                    — history (admin/hr: all; team_lead: own; member: own)
 *  GET  /pending             — pending items for Team Lead (team_lead only)
 *  POST /:id/accept          — Team Lead accepts ownership
 *  POST /:id/reject          — Team Lead rejects with reason
 *  POST /:id/redistribute    — Team Lead reassigns to another member
 *  GET  /stats               — summary stats (admin/hr)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import getClientIP from '../utils/getClientIP.js';
import TaskReallocationLog from '../models/TaskReallocationLog.js';
import User from '../models/User.js';
import {
  acceptReallocation,
  rejectReallocation,
  redistributeTask,
  getPendingReallocations,
  getReallocationHistory
} from '../services/taskReallocationService.js';

const router = express.Router();

// ── GET /pending — Team Lead's pending reallocation queue ─────────────────────
router.get('/pending', authenticate, checkRole(['team_lead', 'admin', 'hr']), async (req, res) => {
  try {
    const userId = req.user.role === 'team_lead' ? req.user._id : req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required for admin/hr queries' });
    }

    const pending = await getPendingReallocations(userId);
    res.json({ success: true, pending, count: pending.length });
  } catch (err) {
    console.error('[Reallocation] GET /pending error:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch pending reallocations' });
  }
});

// ── GET /stats — summary stats for HR/Admin dashboard ────────────────────────
router.get('/stats', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const [pending, accepted, rejected, redistributed, total] = await Promise.all([
      TaskReallocationLog.countDocuments({ status: 'pending' }),
      TaskReallocationLog.countDocuments({ status: 'accepted' }),
      TaskReallocationLog.countDocuments({ status: 'rejected' }),
      TaskReallocationLog.countDocuments({ status: 'redistributed' }),
      TaskReallocationLog.countDocuments({})
    ]);

    res.json({ success: true, stats: { pending, accepted, rejected, redistributed, total } });
  } catch (err) {
    console.error('[Reallocation] GET /stats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ── GET / — reallocation history (role-filtered) ──────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, status, page, limit } = req.query;

    const result = await getReallocationHistory({
      userId: req.user._id,
      role: req.user.role,
      projectId,
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Reallocation] GET / error:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch reallocation history' });
  }
});

// ── GET /:id — single reallocation log ────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const log = await TaskReallocationLog.findById(req.params.id)
      .populate('taskId', 'title status priority due_date project_id assigned_to')
      .populate('originalUserId', 'full_name email profile_picture role')
      .populate('reallocatedToUserId', 'full_name email profile_picture role')
      .populate('redistributedToUserId', 'full_name email profile_picture role')
      .populate('projectId', 'name status')
      .lean();

    if (!log) return res.status(404).json({ message: 'Reallocation log not found' });

    // Access control: only involved parties + admin/hr can view
    const userId = req.user._id.toString();
    const isAuthorized =
      ['admin', 'hr'].includes(req.user.role) ||
      log.originalUserId?._id?.toString() === userId ||
      log.reallocatedToUserId?._id?.toString() === userId ||
      log.redistributedToUserId?._id?.toString() === userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ success: true, log });
  } catch (err) {
    console.error('[Reallocation] GET /:id error:', err);
    res.status(500).json({ message: 'Failed to fetch reallocation log' });
  }
});

// ── POST /:id/accept ──────────────────────────────────────────────────────────
router.post('/:id/accept', authenticate, checkRole(['team_lead', 'admin']), async (req, res) => {
  try {
    const { notes } = req.body;
    const log = await acceptReallocation({
      logId: req.params.id,
      leadUser: req.user,
      notes,
      app: req.app,
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'Reallocation accepted', log });
  } catch (err) {
    console.error('[Reallocation] POST /:id/accept error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 400).json({ message: err.message });
  }
});

// ── POST /:id/reject ──────────────────────────────────────────────────────────
router.post('/:id/reject', authenticate, checkRole(['team_lead', 'admin']), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const log = await rejectReallocation({
      logId: req.params.id,
      leadUser: req.user,
      rejectionReason,
      app: req.app,
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'Reallocation rejected', log });
  } catch (err) {
    console.error('[Reallocation] POST /:id/reject error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 400).json({ message: err.message });
  }
});

// ── POST /:id/redistribute ────────────────────────────────────────────────────
router.post('/:id/redistribute', authenticate, checkRole(['team_lead', 'admin']), async (req, res) => {
  try {
    const { newAssigneeId, adjustedDueDate, notes } = req.body;
    if (!newAssigneeId) {
      return res.status(400).json({ message: 'newAssigneeId is required' });
    }

    const log = await redistributeTask({
      logId: req.params.id,
      leadUser: req.user,
      newAssigneeId,
      adjustedDueDate,
      notes,
      app: req.app,
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'Task redistributed successfully', log });
  } catch (err) {
    console.error('[Reallocation] POST /:id/redistribute error:', err);
    res.status(err.message === 'Unauthorized' ? 403 : 400).json({ message: err.message });
  }
});

export default router;
