import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const router = express.Router();

const ALLOWED_NOTIFICATION_TYPES = new Set([
  'success',
  'error',
  'warning',
  'info',
  'task_assigned',
  'task_updated',
  'task_completed',
  'task_overdue',
  'comment_added',
  'status_changed',
  'task_due',
  'meeting_created',
  'meeting_updated',
  'meeting_cancelled',
  'leave_approved',
  'leave_rejected',
  'leave_pending',
  'task_reallocated',
  'reallocation_pending',
  'reallocation_accepted',
  'reallocation_rejected',
  'reallocation_redistributed'
]);

const DEFAULT_TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info'
};

const toClientNotification = (notificationDoc) => {
  const notification = notificationDoc?.toObject ? notificationDoc.toObject() : notificationDoc;
  const createdAt = notification.created_at || notification.createdAt || new Date();
  const readAt = notification.read_at || null;
  const title = notification.title || DEFAULT_TITLES[notification.type] || 'Notification';
  const message = notification.message || notification?.payload?.message || '';

  return {
    _id: notification._id,
    userId: notification.user_id?.toString?.() || notification.userId || null,
    user_id: notification.user_id,
    type: notification.type || 'info',
    title,
    body: message,
    message,
    link: notification.link || null,
    payload: notification.payload || {},
    task_id: notification.task_id || null,
    read: Boolean(readAt),
    read_at: readAt,
    createdAt,
    created_at: createdAt
  };
};

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      user_id: req.user._id,
      read_at: null
    });

    res.json({ notifications: notifications.map(toClientNotification), unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send an in-app notification to a specific user
router.post('/send', authenticate, async (req, res) => {
  try {
    const { userId, type, title, message, link } = req.body || {};

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ message: 'userId, type, title, and message are required' });
    }

    if (!ALLOWED_NOTIFICATION_TYPES.has(type)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }

    const targetUser = await User.findById(userId).select('_id workspaceId');
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const requesterWorkspaceId = req.user?.workspaceId?.toString?.() || null;
    const targetWorkspaceId = targetUser.workspaceId?.toString?.() || null;

    if (requesterWorkspaceId && targetWorkspaceId && requesterWorkspaceId !== targetWorkspaceId) {
      return res.status(403).json({ message: 'Cross-tenant notification send is not allowed' });
    }

    const notification = await Notification.create({
      user_id: userId,
      type,
      title: String(title).trim(),
      message: String(message).trim(),
      link: link ? String(link).trim() : null,
      read_at: null,
      payload: {
        title: String(title).trim(),
        message: String(message).trim(),
        link: link ? String(link).trim() : null
      }
    });

    const payload = toClientNotification(notification);
    const io = req.app.get('io');
    if (io) {
      io.to(String(userId)).emit('notification', payload);
      io.to(String(userId)).emit('notification:new', payload);
    }

    return res.status(201).json({ notification: payload });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark notifications as read
router.patch('/mark-read', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (notificationIds && notificationIds.length > 0) {
      await Notification.updateMany(
        { 
          _id: { $in: notificationIds }, 
          user_id: req.user._id
        },
        { read_at: Date.now() }
      );
    } else {
      await Notification.updateMany(
        { 
          user_id: req.user._id,
          read_at: null 
        },
        { read_at: Date.now() }
      );
    }

    const unreadCount = await Notification.countDocuments({
      user_id: req.user._id,
      read_at: null
    });

    res.json({ message: 'Notifications marked as read', unreadCount });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;