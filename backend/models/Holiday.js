import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
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

// Index for date queries
holidaySchema.index({ date: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;
