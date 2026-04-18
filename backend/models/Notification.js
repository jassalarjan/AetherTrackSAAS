import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    alias: 'userId'
  },
  type: {
    type: String,
    enum: [
      'success', 'error', 'warning', 'info',
      'task_assigned', 'task_updated', 'task_completed', 'task_overdue',
      'comment_added', 'status_changed', 'task_due',
      // Meeting notifications
      'meeting_created', 'meeting_updated', 'meeting_cancelled',
      // Leave / reallocation notifications
      'leave_approved', 'leave_rejected', 'leave_pending',
      'task_reallocated', 'reallocation_pending', 'reallocation_accepted',
      'reallocation_rejected', 'reallocation_redistributed'
    ],
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: null
  },
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  payload: {
    type: Object,
    default: {}
  },
  read_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes for queries
notificationSchema.index({ user_id: 1, read_at: 1 });
notificationSchema.index({ created_at: -1 });
notificationSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model('Notification', notificationSchema);