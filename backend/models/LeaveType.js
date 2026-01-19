import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  annualQuota: {
    type: Number,
    required: true,
    default: 12
  },
  carryForward: {
    type: Boolean,
    default: false
  },
  maxCarryForward: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound unique index
leaveTypeSchema.index({ workspaceId: 1, code: 1 }, { unique: true });

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

export default LeaveType;
