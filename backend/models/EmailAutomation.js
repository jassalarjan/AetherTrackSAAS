import mongoose from 'mongoose';

const filterSchema = new mongoose.Schema({
  field: { type: String, required: true, trim: true },
  operator: {
    type: String,
    enum: ['eq', 'neq', 'contains', 'in', 'gt', 'gte', 'lt', 'lte'],
    default: 'eq'
  },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom_cron'],
    default: 'daily'
  },
  time: { type: String, default: '09:00' },
  dayOfWeek: { type: Number, default: null },
  dayOfMonth: { type: Number, default: null },
  cronExpression: { type: String, default: '' }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['send_email'],
    default: 'send_email'
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAutomationTemplate',
    required: true
  },
  recipientType: {
    type: String,
    enum: ['trigger_actor', 'assignee', 'project_members', 'custom_list'],
    default: 'custom_list'
  },
  customRecipients: [{ type: String, trim: true }],
  subjectOverride: { type: String, default: '' },
  variables: {
    type: Map,
    of: String,
    default: {}
  }
}, { _id: false });

const emailAutomationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'paused', 'draft'],
    default: 'draft',
    index: true
  },
  trigger: {
    type: {
      type: String,
      enum: ['changelog', 'schedule'],
      default: 'changelog'
    },
    changelogTriggerId: { type: String, default: '' },
    filters: { type: [filterSchema], default: [] },
    schedule: { type: scheduleSchema, default: () => ({}) }
  },
  actions: { type: [actionSchema], default: [] },
  conditions: { type: [filterSchema], default: [] },
  lastRun: { type: Date, default: null },
  nextRun: { type: Date, default: null, index: true },
  runCount: { type: Number, default: 0 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

emailAutomationSchema.index({ tenantId: 1, status: 1, 'trigger.type': 1 });
emailAutomationSchema.index({ tenantId: 1, 'trigger.changelogTriggerId': 1, status: 1 });

export default mongoose.model('EmailAutomation', emailAutomationSchema);
