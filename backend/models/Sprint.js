import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  goal: {
    type: String,
    default: ''
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0
  },
  teamSize: {
    type: Number,
    default: 1,
    min: 1
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  velocity: {
    type: Number,
    default: 0
  },
  completedPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
sprintSchema.index({ workspace: 1, status: 1 });
sprintSchema.index({ project: 1 });

const Sprint = mongoose.model('Sprint', sprintSchema);

export default Sprint;
