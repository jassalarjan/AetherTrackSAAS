import mongoose from 'mongoose';

const dependencySchema = new mongoose.Schema({
  predecessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  type: { type: String, enum: ['FS', 'SS', 'FF', 'SF'], default: 'FS' },
  lag_days: { type: Number, default: 0 }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  task_type: {
    type: String,
    enum: ['task', 'milestone', 'phase'],
    default: 'task'
  },
  scheduling_mode: {
    type: String,
    enum: ['auto', 'manual', 'locked'],
    default: 'manual'
  },
  constraint_type: {
    type: String,
    enum: ['ASAP', 'ALAP', 'SNET', 'FNLT', 'MSO', 'MFO'],
    default: 'ASAP'
  },
  constraint_date: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done', 'archived'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigned_to: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  sprint_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    default: null,
    index: true
  },
  dependencies: {
    type: [dependencySchema],
    default: []
  },
  wbs_index: {
    type: String,
    default: ''
  },
  start_date: {
    type: Date,
    default: null
  },
  due_date: {
    type: Date,
    required: [true, 'Due date is required']
  },
  actual_start: {
    type: Date,
    default: null
  },
  actual_end: {
    type: Date,
    default: null
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Computed by schedule engine — stored for caching, never authoritative
  scheduled_start: { type: Date, default: null },
  scheduled_end:   { type: Date, default: null },
  total_float:     { type: Number, default: null },
  free_float:      { type: Number, default: null },
  is_critical:     { type: Boolean, default: false },

  // ── Reallocation tracking (populated by taskReallocationService) ───────
  /** Populated when a task is reallocated due to leave/absence */
  reallocation_status: {
    type: String,
    enum: ['none', 'reallocated', 'redistributed', 'restored'],
    default: 'none',
    index: true
  },
  reallocated_from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reallocation_reason: {
    type: String,
    default: null
  },
  reallocation_log_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskReallocationLog',
    default: null
  },

  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes for queries
taskSchema.index({ status: 1 });
taskSchema.index({ assigned_to: 1 });
taskSchema.index({ team_id: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ sprint_id: 1, status: 1 });
taskSchema.index({ parent_id: 1 });

taskSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.model('Task', taskSchema);