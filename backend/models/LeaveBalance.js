import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  totalQuota: {
    type: Number,
    required: true
  },
  used: {
    type: Number,
    default: 0
  },
  pending: {
    type: Number,
    default: 0
  },
  available: {
    type: Number,
    default: 0
  },
  carriedForward: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound unique index
leaveBalanceSchema.index({ userId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

// Calculate available before saving
leaveBalanceSchema.pre('save', function(next) {
  this.available = this.totalQuota - this.used - this.pending;
  next();
});

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

export default LeaveBalance;
