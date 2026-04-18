import mongoose from 'mongoose';

const emailCampaignSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name:       { type: String, required: true, trim: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
  subject:    { type: String, default: '' },
  body:       { type: String, default: '' },

  contacts: [{
    email:     { type: String, required: true, trim: true },
    name:      { type: String, trim: true },
    mergeData: { type: Map, of: String, default: {} },
    status:    { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
    sentAt:    { type: Date, default: null },
    error:     { type: String, default: '' },
  }],

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'launching', 'sending', 'completed', 'paused', 'cancelled'],
    default: 'draft'
  },

  scheduledAt: { type: Date, default: null },
  launchedAt:  { type: Date, default: null },
  completedAt: { type: Date, default: null },

  stats: {
    total:    { type: Number, default: 0 },
    sent:     { type: Number, default: 0 },
    failed:   { type: Number, default: 0 },
    opened:   { type: Number, default: 0 },
    clicked:  { type: Number, default: 0 },
  },

  // Field mapping from CSV columns
  fieldMapping: { type: Map, of: String, default: {} },
}, {
  timestamps: true
});

emailCampaignSchema.index({ workspace: 1, status: 1 });

export default mongoose.model('EmailCampaign', emailCampaignSchema);
