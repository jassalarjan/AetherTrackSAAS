import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name:     { type: String, required: true, trim: true },
  subject:  { type: String, required: true, trim: true },
  body:     { type: String, default: '' },

  category: {
    type: String,
    enum: ['outreach', 'follow-up', 'proposal', 'cold', 'onboarding', 'general', 'custom'],
    default: 'general'
  },

  variables: [{ type: String, trim: true }], // e.g. ['firstName', 'company', 'jobTitle']
  isActive:  { type: Boolean, default: true },
}, {
  timestamps: true
});

emailTemplateSchema.index({ workspace: 1, category: 1, isActive: 1 });

const EmailAutomationTemplate = mongoose.model('EmailAutomationTemplate', emailTemplateSchema);

export default EmailAutomationTemplate;
