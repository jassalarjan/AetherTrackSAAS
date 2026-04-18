import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema({
  field:    { type: String, required: true },    // e.g. 'status', 'priority'
  operator: { type: String, enum: ['eq', 'neq', 'contains', 'changed_to'], default: 'eq' },
  value:    { type: String, default: '' },
}, { _id: false });

const automationRuleSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name:  { type: String, required: true, trim: true },

  trigger: {
    type: String,
    enum: [
      'task.status.changed',
      'task.created',
      'project.created',
      'member.invited',
      'member.joined',
      'manual',
    ],
    required: true
  },

  conditions: [conditionSchema],

  action: {
    templateId:     { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    delayMinutes:   { type: Number, default: 0 },
    subject:        { type: String, default: '' },
    body:           { type: String, default: '' },
    targetField:    { type: String, default: 'assigned_to' }, // which field on trigger doc holds recipient
  },

  isActive:        { type: Boolean, default: true },
  lastTriggeredAt: { type: Date, default: null },
  triggerCount:    { type: Number, default: 0 },
}, {
  timestamps: true
});

automationRuleSchema.index({ workspace: 1, trigger: 1, isActive: 1 });

export default mongoose.model('AutomationRule', automationRuleSchema);
