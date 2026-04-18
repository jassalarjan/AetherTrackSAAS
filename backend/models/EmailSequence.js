import mongoose from 'mongoose';

const sequenceStepSchema = new mongoose.Schema({
  order:       { type: Number, required: true },
  delayDays:   { type: Number, default: 0 },     // days after previous step
  delayHours:  { type: Number, default: 0 },
  subject:     { type: String, required: true },
  body:        { type: String, default: '' },
  templateId:  { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
}, { _id: true });

const enrolledContactSchema = new mongoose.Schema({
  email:         { type: String, required: true, trim: true },
  name:          { type: String, trim: true },
  currentStep:   { type: Number, default: 0 },
  nextSendAt:    { type: Date, default: null },
  status:        { type: String, enum: ['active', 'completed', 'stopped', 'replied'], default: 'active' },
  enrolledAt:    { type: Date, default: Date.now },
  mergeData:     { type: Map, of: String, default: {} },
}, { _id: false });

const emailSequenceSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name:   { type: String, required: true, trim: true },
  steps:  [sequenceStepSchema],

  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft'
  },

  enrolledContacts: [enrolledContactSchema],

  // Stop conditions
  stopOnReply:     { type: Boolean, default: true },
  stopOnUnsub:     { type: Boolean, default: true },
  maxSteps:        { type: Number, default: 10 },
}, {
  timestamps: true
});

emailSequenceSchema.index({ workspace: 1, status: 1 });

export default mongoose.model('EmailSequence', emailSequenceSchema);
