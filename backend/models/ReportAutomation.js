import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportScheduleSchema = new Schema({
  frequency: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true
  },
  time: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    default: null
  },
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 28,
    default: null
  }
}, { _id: false });

const reportRecipientSchema = new Schema({
  email: { type: String, required: true, trim: true },
  name: { type: String, default: '', trim: true }
}, { _id: false });

const reportConfigSchema = new Schema({
  includeProjectStats: { type: Boolean, default: true },
  includeTaskMetrics: { type: Boolean, default: true },
  includeTeamActivity: { type: Boolean, default: true },
  includeMilestones: { type: Boolean, default: false },
  includeOverdueTasks: { type: Boolean, default: true },
  dateRangeType: {
    type: String,
    enum: ['last_month', 'last_week', 'last_sprint', 'custom'],
    default: 'last_month'
  },
  customDateFrom: { type: Date, default: null },
  customDateTo: { type: Date, default: null },
  projectFilter: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  groupBy: {
    type: String,
    enum: ['project', 'member', 'status'],
    default: 'project'
  }
}, { _id: false });

const reportEmailConfigSchema = new Schema({
  subject: { type: String, default: '{{month}} Report — AetherTrack' },
  headerNote: { type: String, default: '' },
  footerNote: { type: String, default: '' }
}, { _id: false });

const executionLogSchema = new Schema({
  runAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  recipientCount: { type: Number, default: 0 },
  triggeredBy: {
    type: String,
    enum: ['schedule', 'manual', 'test'],
    required: true
  },
  reportSnapshot: { type: Schema.Types.Mixed, default: null },
  errorMessage: { type: String, default: '' }
}, { _id: true });

const reportAutomationSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  reportType: {
    type: String,
    enum: ['project_summary', 'team_performance', 'task_completion', 'sprint_review', 'custom'],
    required: true
  },
  schedule: { type: reportScheduleSchema, default: () => ({}) },
  recipients: { type: [reportRecipientSchema], default: [] },
  reportConfig: { type: reportConfigSchema, default: () => ({}) },
  emailConfig: { type: reportEmailConfigSchema, default: () => ({}) },
  executionLog: { type: [executionLogSchema], default: [] },
  status: {
    type: String,
    enum: ['active', 'paused', 'draft'],
    default: 'draft',
    index: true
  },
  lastRun: { type: Date, default: null },
  nextRun: { type: Date, default: null, index: true },
  runCount: { type: Number, default: 0 },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

reportAutomationSchema.index({ tenantId: 1, status: 1, reportType: 1 });

reportAutomationSchema.pre('validate', function reportAutomationValidate(next) {
  if (this.schedule?.frequency === 'weekly' && (this.schedule.dayOfWeek == null || Number.isNaN(Number(this.schedule.dayOfWeek)))) {
    return next(new Error('schedule.dayOfWeek is required for weekly frequency'));
  }

  if (this.schedule?.frequency === 'monthly' && (this.schedule.dayOfMonth == null || Number.isNaN(Number(this.schedule.dayOfMonth)))) {
    return next(new Error('schedule.dayOfMonth is required for monthly frequency'));
  }

  if (!Array.isArray(this.recipients) || this.recipients.length === 0) {
    return next(new Error('At least one recipient is required'));
  }

  if (this.reportConfig?.dateRangeType === 'custom') {
    const from = this.reportConfig.customDateFrom;
    const to = this.reportConfig.customDateTo;

    if (!from || !to) {
      return next(new Error('customDateFrom and customDateTo are required for custom date range'));
    }

    if (new Date(from) >= new Date(to)) {
      return next(new Error('customDateFrom must be earlier than customDateTo'));
    }
  }

  return next();
});

reportAutomationSchema.pre('save', function reportAutomationPreSave(next) {
  this.updatedAt = new Date();
  if (Array.isArray(this.executionLog) && this.executionLog.length > 50) {
    this.executionLog = this.executionLog.slice(-50);
  }
  next();
});

export default mongoose.model('ReportAutomation', reportAutomationSchema);
