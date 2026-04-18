import mongoose from 'mongoose';

const emailJobSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: ['single', 'campaign', 'sequence-step', 'automation'],
    default: 'single'
  },

  to:       { type: String, required: true, trim: true },
  toName:   { type: String, trim: true },
  cc:       [{ type: String, trim: true }],
  bcc:      [{ type: String, trim: true }],
  subject:  { type: String, required: true },
  body:     { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  scheduledAt: { type: Date, default: null, index: true },
  sentAt:      { type: Date, default: null },
  errorLog:    { type: String, default: '' },

  // Relations
  templateId:  { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
  campaignId:  { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', default: null },
  sequenceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'EmailSequence', default: null },
  sequenceStep:{ type: Number, default: null },
  ruleId:      { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule', default: null },

  // Merge data used for this send
  mergeData: { type: Map, of: String, default: {} },

  // Tracking
  openedAt:  { type: Date, default: null },
  clickedAt: { type: Date, default: null },
}, {
  timestamps: true
});

emailJobSchema.index({ workspace: 1, status: 1, scheduledAt: 1 });
emailJobSchema.index({ workspace: 1, campaignId: 1 });
emailJobSchema.index({ workspace: 1, sequenceId: 1 });

export default mongoose.model('EmailJob', emailJobSchema);
