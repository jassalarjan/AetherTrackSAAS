import express from 'express';
import ReportAutomation from '../models/ReportAutomation.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';
import reportRunner from '../services/reportRunner.js';
import { generateReportData } from '../services/reportAggregator.js';
import { renderReportEmail } from '../services/reportEmailRenderer.js';
import { generateMockReportData } from '../services/mockPayloadGenerator.js';
import { sendEmail } from '../utils/emailService.js';
import { logChange } from '../utils/changeLogService.js';

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const validateSchedule = (schedule = {}) => {
  if (!schedule.frequency || !['weekly', 'monthly'].includes(schedule.frequency)) {
    return 'schedule.frequency is required and must be weekly or monthly';
  }

  if (!schedule.time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(String(schedule.time))) {
    return 'schedule.time is required in HH:MM format';
  }

  if (schedule.frequency === 'weekly' && (schedule.dayOfWeek == null || Number.isNaN(Number(schedule.dayOfWeek)))) {
    return 'schedule.dayOfWeek is required for weekly frequency';
  }

  if (schedule.frequency === 'monthly') {
    const day = Number(schedule.dayOfMonth);
    if (!day || day < 1 || day > 28) {
      return 'schedule.dayOfMonth is required for monthly frequency and must be between 1 and 28';
    }
  }

  return null;
};

const validateRecipients = (recipients = []) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return 'At least one recipient is required';
  }

  const invalid = recipients.find((recipient) => !EMAIL_REGEX.test(String(recipient?.email || '').trim()));
  if (invalid) return 'Each recipient must contain a valid email';

  return null;
};

const validateDateRange = (reportConfig = {}) => {
  if (reportConfig?.dateRangeType !== 'custom') return null;

  if (!reportConfig.customDateFrom || !reportConfig.customDateTo) {
    return 'customDateFrom and customDateTo are required when dateRangeType is custom';
  }

  if (new Date(reportConfig.customDateFrom) >= new Date(reportConfig.customDateTo)) {
    return 'customDateFrom must be earlier than customDateTo';
  }

  return null;
};

const validatePayload = (body = {}) => {
  if (!String(body.name || '').trim()) return 'Name is required';
  if (String(body.name || '').trim().length > 100) return 'Name cannot exceed 100 characters';

  const reportTypes = ['project_summary', 'team_performance', 'task_completion', 'sprint_review', 'custom'];
  if (!reportTypes.includes(body.reportType)) return 'reportType is required';

  const scheduleError = validateSchedule(body.schedule || {});
  if (scheduleError) return scheduleError;

  const recipientsError = validateRecipients(body.recipients || []);
  if (recipientsError) return recipientsError;

  const dateRangeError = validateDateRange(body.reportConfig || {});
  if (dateRangeError) return dateRangeError;

  return null;
};

router.get('/', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const { status, reportType, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = { tenantId };
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;
    if (search) query.name = { $regex: String(search), $options: 'i' };

    const [items, total] = await Promise.all([
      ReportAutomation.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReportAutomation.countDocuments(query)
    ]);

    res.json({ page, limit, total, items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch report automations', error: error?.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    if (!tenantId) return res.status(400).json({ message: 'Unable to resolve tenant context' });

    const validationError = validatePayload(req.body || {});
    if (validationError) return res.status(400).json({ message: validationError });

    const payload = {
      ...req.body,
      tenantId,
      createdBy: req.user._id
    };

    const doc = await ReportAutomation.create(payload);

    if (doc.status === 'active') {
      doc.nextRun = reportRunner.computeNextRun(doc.schedule, new Date());
      await doc.save();
      await reportRunner.refresh(doc._id);
    }

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create report automation', error: error?.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await ReportAutomation.findOne({ _id: req.params.id, tenantId })
      .populate('reportConfig.projectFilter', 'name')
      .lean();

    if (!doc) return res.status(404).json({ message: 'Report automation not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch report automation', error: error?.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const existing = await ReportAutomation.findOne({ _id: req.params.id, tenantId });
    if (!existing) return res.status(404).json({ message: 'Report automation not found' });

    const nextPayload = {
      ...existing.toObject(),
      ...req.body
    };

    const validationError = validatePayload(nextPayload);
    if (validationError) return res.status(400).json({ message: validationError });

    const scheduleChanged = JSON.stringify(existing.schedule || {}) !== JSON.stringify(req.body?.schedule || existing.schedule || {});
    const statusChanged = req.body?.status && req.body.status !== existing.status;

    Object.assign(existing, req.body || {});

    if (existing.status === 'active') {
      existing.nextRun = reportRunner.computeNextRun(existing.schedule, new Date());
    }

    await existing.save();

    if (scheduleChanged || statusChanged) {
      await reportRunner.refresh(existing._id);
    } else if (existing.status === 'active') {
      await reportRunner.refresh(existing._id);
    }

    res.json(existing);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update report automation', error: error?.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await ReportAutomation.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Report automation not found' });

    reportRunner.remove(doc._id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete report automation', error: error?.message });
  }
});

router.post('/:id/toggle', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await ReportAutomation.findOne({ _id: req.params.id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Report automation not found' });

    doc.status = doc.status === 'active' ? 'paused' : 'active';
    if (doc.status === 'active') {
      doc.nextRun = reportRunner.computeNextRun(doc.schedule, new Date());
    }
    await doc.save();

    await reportRunner.refresh(doc._id);
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle report automation', error: error?.message });
  }
});

router.post('/:id/send-now', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await ReportAutomation.findOne({ _id: req.params.id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Report automation not found' });

    const result = await reportRunner.executeReport(doc, 'manual');
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send report now', error: error?.message });
  }
});

router.get('/:id/preview', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await ReportAutomation.findOne({ _id: req.params.id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Report automation not found' });

    const preview = await generateReportData(doc);
    res.json(preview);
  } catch (error) {
    res.status(500).json({ message: 'Failed to preview report automation', error: error?.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await ReportAutomation.findOne({ _id: req.params.id, tenantId }).lean();
    if (!doc) return res.status(404).json({ message: 'Report automation not found' });

    const rows = Array.isArray(doc.executionLog) ? [...doc.executionLog].sort((a, b) => new Date(b.runAt) - new Date(a.runAt)) : [];
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch report history', error: error?.message });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const { testRecipient, useMockData = true } = req.body || {};

    if (!testRecipient || !EMAIL_REGEX.test(String(testRecipient).trim())) {
      return res.status(400).json({ message: 'Valid testRecipient is required' });
    }

    const doc = await ReportAutomation.findOne({ _id: req.params.id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Report automation not found' });

    const reportData = useMockData ? generateMockReportData(doc) : await generateReportData(doc);
    const rendered = renderReportEmail(reportData, doc.emailConfig || {});

    // Never use real recipients for test sends.
    await sendEmail(String(testRecipient).trim(), rendered.subject, rendered.html);

    await logChange({
      event_type: 'email_sent',
      user: req.user,
      action: 'REPORT_TEST_EMAIL_SENT',
      target_type: 'report_automation',
      target_id: String(doc._id),
      target_name: doc.name,
      description: `Report automation test email sent for "${doc.name}" to ${String(testRecipient).trim()}`,
      workspaceId: tenantId,
      metadata: {
        reportAutomationId: String(doc._id),
        reportType: doc.reportType,
        isMock: Boolean(useMockData),
        testRecipient: String(testRecipient).trim()
      }
    });

    doc.executionLog = Array.isArray(doc.executionLog) ? doc.executionLog : [];
    doc.executionLog.push({
      runAt: new Date(),
      status: 'success',
      recipientCount: 1,
      triggeredBy: 'test',
      reportSnapshot: reportData,
      errorMessage: ''
    });
    await doc.save();

    res.json({
      success: true,
      renderedSubject: rendered.subject,
      reportDataUsed: reportData,
      isMock: Boolean(useMockData)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send report test email', error: error?.message });
  }
});

export default router;
