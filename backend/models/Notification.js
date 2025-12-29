import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['task_assigned', 'task_updated', 'task_completed', 'task_overdue', 'comment_added', 'status_changed', 'task_due'],
    required: true
  },
  message: {
    type: String,
    required: true
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
  // WORKSPACE SUPPORT: All notifications belong to a workspace
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
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

// WORKSPACE SUPPORT: Indexes for workspace-scoped queries
notificationSchema.index({ workspaceId: 1, user_id: 1, read_at: 1 });
notificationSchema.index({ workspaceId: 1, created_at: -1 });

export default mongoose.model('Notification', notificationSchema);