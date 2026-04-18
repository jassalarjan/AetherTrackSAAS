import cron from 'node-cron';
import ReportAutomation from '../models/ReportAutomation.js';
import { sendEmail } from '../utils/emailService.js';
import { logChange } from '../utils/changeLogService.js';
import { generateReportData } from './reportAggregator.js';
import { renderReportEmail } from './reportEmailRenderer.js';

let initialized = false;
let ioRef = null;
const reportJobs = new Map();

const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ''));

const parseTime = (time = '09:00') => {
  const safe = isValidTime(time) ? time : '09:00';
  const [hour, minute] = safe.split(':').map((n) => Number(n));
  return { hour, minute };
};

const computeNextRun = (schedule = {}, now = new Date()) => {
  const { hour, minute } = parseTime(schedule.time);
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);

  if (schedule.frequency === 'weekly') {
    const target = Number(schedule.dayOfWeek ?? 1);
    const delta = (target - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + delta);
    if (next <= now) next.setDate(next.getDate() + 7);
    return next;
  }

  const dom = Math.max(1, Math.min(28, Number(schedule.dayOfMonth || 1)));
  next.setDate(dom);
  if (next <= now) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(dom);
  }
  return next;
};

const toCronExpression = (schedule = {}) => {
  const { hour, minute } = parseTime(schedule.time);

  if (schedule.frequency === 'weekly') {
    const dayOfWeek = Math.max(0, Math.min(6, Number(schedule.dayOfWeek ?? 1)));
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  const dayOfMonth = Math.max(1, Math.min(28, Number(schedule.dayOfMonth || 1)));
  return `${minute} ${hour} ${dayOfMonth} * *`;
};

const cancelJob = (reportId) => {
  const key = String(reportId);
  const existing = reportJobs.get(key);
  if (existing) {
    existing.stop();
    reportJobs.delete(key);
  }
};

const emitCompletion = (reportDoc, payload) => {
  if (!ioRef) return;
  const tenantRoom = String(reportDoc.tenantId || '');
  ioRef.to(tenantRoom).emit('report:completed', payload);
  ioRef.emit('report:completed', payload);
};

const pushExecutionLog = async (reportId, entry) => {
  const report = await ReportAutomation.findById(reportId);
  if (!report) return;

  report.executionLog = Array.isArray(report.executionLog) ? [...report.executionLog, entry] : [entry];
  if (report.executionLog.length > 50) {
    report.executionLog = report.executionLog.slice(-50);
  }
  await report.save();
};

const executeReport = async (reportDoc, triggeredBy = 'schedule', overrides = {}) => {
  const runAt = new Date();

  try {
    await logChange({
      event_type: 'report_automation_triggered',
      user_id: reportDoc?.createdBy || null,
      action: 'REPORT_AUTOMATION_TRIGGERED',
      target_type: 'report_automation',
      target_id: String(reportDoc._id),
      target_name: reportDoc.name,
      description: `Report automation "${reportDoc.name}" triggered via ${triggeredBy}`,
      workspaceId: reportDoc.tenantId,
      metadata: {
        reportAutomationId: String(reportDoc._id),
        reportType: reportDoc.reportType,
        triggeredBy
      }
    });

    const reportData = overrides.reportData || await generateReportData(reportDoc);
    const rendered = renderReportEmail(reportData, reportDoc.emailConfig || {});

    const recipients = [overrides.onlyRecipient || null].filter(Boolean).length
      ? [overrides.onlyRecipient]
      : (reportDoc.recipients || []).map((r) => r?.email).filter(Boolean);

    if (!recipients.length) {
      throw new Error('No recipients configured for report automation');
    }

    await Promise.all(recipients.map((email) => sendEmail(email, rendered.subject, rendered.html)));

    await logChange({
      event_type: 'report_generated',
      user_id: reportDoc?.createdBy || null,
      action: 'REPORT_GENERATED',
      target_type: 'report_automation',
      target_id: String(reportDoc._id),
      target_name: reportDoc.name,
      description: `Report automation "${reportDoc.name}" generated report data`,
      workspaceId: reportDoc.tenantId,
      metadata: {
        reportAutomationId: String(reportDoc._id),
        reportType: reportDoc.reportType,
        triggeredBy
      }
    });

    await logChange({
      event_type: 'email_sent',
      user_id: reportDoc?.createdBy || null,
      action: 'REPORT_EMAIL_SENT',
      target_type: 'report_automation',
      target_id: String(reportDoc._id),
      target_name: reportDoc.name,
      description: `Report automation "${reportDoc.name}" sent ${recipients.length} report email(s)`,
      workspaceId: reportDoc.tenantId,
      metadata: {
        reportAutomationId: String(reportDoc._id),
        reportType: reportDoc.reportType,
        triggeredBy,
        recipientCount: recipients.length,
        recipients
      }
    });

    const update = {
      lastRun: runAt,
      nextRun: reportDoc.status === 'active' ? computeNextRun(reportDoc.schedule, runAt) : reportDoc.nextRun,
      runCount: Number(reportDoc.runCount || 0) + 1
    };

    await ReportAutomation.updateOne({ _id: reportDoc._id }, { $set: update });

    await pushExecutionLog(reportDoc._id, {
      runAt,
      status: 'success',
      recipientCount: recipients.length,
      triggeredBy,
      reportSnapshot: reportData,
      errorMessage: ''
    });

    const completionPayload = {
      reportId: String(reportDoc._id),
      reportName: reportDoc.name,
      runAt,
      status: 'success',
      recipientCount: recipients.length
    };
    emitCompletion(reportDoc, completionPayload);

    return { success: true, ...completionPayload, reportData };
  } catch (error) {
    await logChange({
      event_type: 'email_failed',
      user_id: reportDoc?.createdBy || null,
      action: 'REPORT_EMAIL_FAILED',
      target_type: 'report_automation',
      target_id: String(reportDoc._id),
      target_name: reportDoc.name,
      description: `Report automation "${reportDoc.name}" failed: ${error?.message || 'Unknown error'}`,
      workspaceId: reportDoc.tenantId,
      metadata: {
        reportAutomationId: String(reportDoc._id),
        reportType: reportDoc.reportType,
        triggeredBy,
        error: error?.message || 'Report execution failed'
      }
    });

    await pushExecutionLog(reportDoc._id, {
      runAt,
      status: 'failed',
      recipientCount: overrides.onlyRecipient ? 1 : (reportDoc.recipients || []).length,
      triggeredBy,
      reportSnapshot: overrides.reportData || null,
      errorMessage: error?.message || 'Report execution failed'
    });

    const completionPayload = {
      reportId: String(reportDoc._id),
      reportName: reportDoc.name,
      runAt,
      status: 'failed',
      recipientCount: 0,
      error: error?.message || 'Report execution failed'
    };
    emitCompletion(reportDoc, completionPayload);

    throw error;
  }
};

const registerCronForReport = (reportDoc) => {
  if (!reportDoc || reportDoc.status !== 'active') return;

  const reportId = String(reportDoc._id);
  cancelJob(reportId);

  const expression = toCronExpression(reportDoc.schedule || {});
  const task = cron.schedule(expression, async () => {
    const fresh = await ReportAutomation.findById(reportId);
    if (!fresh || fresh.status !== 'active') return;
    await executeReport(fresh, 'schedule');
  });

  reportJobs.set(reportId, task);
};

const refresh = async (reportId) => {
  if (!reportId) return;
  cancelJob(reportId);
  const doc = await ReportAutomation.findById(reportId);
  if (!doc || doc.status !== 'active') return;

  if (!doc.nextRun) {
    doc.nextRun = computeNextRun(doc.schedule, new Date());
    await doc.save();
  }

  registerCronForReport(doc);
};

const init = async (io) => {
  if (initialized) return;
  initialized = true;
  ioRef = io || null;

  const activeReports = await ReportAutomation.find({ status: 'active' });
  await Promise.all(activeReports.map(async (doc) => {
    if (!doc.nextRun) {
      doc.nextRun = computeNextRun(doc.schedule, new Date());
      await doc.save();
    }
    registerCronForReport(doc);
  }));
};

const remove = (reportId) => {
  cancelJob(reportId);
};

const reportRunner = {
  init,
  refresh,
  remove,
  executeReport,
  computeNextRun
};

export default reportRunner;
export { computeNextRun as computeReportNextRun };
