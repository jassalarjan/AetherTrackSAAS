import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    example: String
  }],
  category: {
    type: String,
    enum: ['leave', 'attendance', 'system', 'custom', 'hiring', 'interview', 'onboarding', 'engagement', 'exit'],
    default: 'custom'
  },
  isActive: {
    type: Boolean,
    default: true
  },
    isPredefined: {
      type: Boolean,
      default: false
    },
    senderName: {
      type: String,
      trim: true
    },
    senderEmail: {
      type: String,
      trim: true
    }
  }, {
  timestamps: true
});

emailTemplateSchema.index({ code: 1 }, { unique: true });

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;
