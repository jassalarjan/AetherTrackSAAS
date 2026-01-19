import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
    index: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for workspace and date queries
holidaySchema.index({ workspaceId: 1, date: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;
