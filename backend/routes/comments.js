import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { validateIdParam, sanitizeBody, isValidObjectId } from '../utils/validation.js';

const router = express.Router();

// Get comments for a task
router.get('/:taskId/comments', authenticate, validateIdParam('taskId'), async (req, res) => {
  try {
    const comments = await Comment.find({ task_id: req.params.taskId })
      .populate('author_id', 'full_name email')
      .sort({ created_at: -1 });

    res.json({ comments, count: comments.length });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment to task
router.post('/:taskId/comments', authenticate, validateIdParam('taskId'), sanitizeBody(['content']), async (req, res) => {
  try {
    const { content } = req.body;
    const taskId = req.params.taskId;

    const task = await Task.findOne({ _id: taskId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = new Comment({
      task_id: taskId,
      author_id: req.user._id,
      content
    });

    await comment.save();

    // Create notifications for all assigned users (excluding commenter)
    if (task.assigned_to && task.assigned_to.length > 0) {
      const notifications = task.assigned_to
        .filter(userId => userId.toString() !== req.user._id.toString())
        .map(userId => ({
          user_id: userId,
          type: 'comment_added',
          message: `${req.user.full_name} commented on "${task.title}"`,
          task_id: taskId,
          payload: {
            task_id: taskId,
            task_title: task.title,
            comment_by: req.user.full_name,
            comment_content: content
          }
        }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        
        // Emit notification events to assigned users
        if (req.app.get('io')) {
          notifications.forEach(notif => {
            req.app.get('io').to(notif.user_id.toString()).emit('notification:new', {
              type: 'comment_added',
              message: notif.message,
              task: task
            });
          });
        }
      }
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate('author_id', 'full_name email');

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('comment:added', {
        taskId,
        comment: populatedComment
      });
    }

    res.status(201).json({ message: 'Comment added', comment: populatedComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;