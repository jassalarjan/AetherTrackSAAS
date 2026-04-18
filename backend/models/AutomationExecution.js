import mongoose from 'mongoose';

const automationExecutionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  automationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAutomation',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'skipped'],
    default: 'success'
  },
  recipients: [{ type: String, trim: true }],
  error: { type: String, default: '' },
  triggerSource: {
    type: String,
    enum: ['changelog', 'schedule', 'manual', 'test'],
    default: 'changelog'
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

automationExecutionSchema.index({ automationId: 1, createdAt: -1 });

export default mongoose.model('AutomationExecution', automationExecutionSchema);
