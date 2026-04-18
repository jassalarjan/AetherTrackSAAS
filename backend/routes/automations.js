import express from 'express';
import EmailAutomation from '../models/EmailAutomation.js';
import EmailAutomationTemplate from '../models/EmailAutomationTemplate.js';
import AutomationExecution from '../models/AutomationExecution.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';
import { sendEmail } from '../utils/emailService.js';
import { computeNextRunForAutomation, primeAutomationNextRuns } from '../services/automationRunner.js';
import { generateMockChangelog } from '../services/mockPayloadGenerator.js';
import { renderAutomationTemplate } from '../services/automationTemplateRenderer.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const computeNextRun = (automation, fromDate = new Date()) => {
  return computeNextRunForAutomation(automation, fromDate);
};

const validateAutomationPayload = (payload = {}) => {
  if (!String(payload.name || '').trim()) return 'Automation name is required.';
  if (!payload.trigger?.type || !['changelog', 'schedule'].includes(payload.trigger.type)) return 'Valid trigger.type is required.';

  if (payload.trigger.type === 'changelog' && !String(payload.trigger.changelogTriggerId || '').trim()) {
    return 'trigger.changelogTriggerId is required for changelog automations.';
  }

  if (payload.trigger.type === 'schedule' && !String(payload.trigger?.schedule?.time || '').trim()) {
    return 'trigger.schedule.time is required for schedule automations.';
  }

  const action = Array.isArray(payload.actions) ? payload.actions[0] : null;
  if (!action || !action.templateId) return 'actions[0].templateId is required.';

  if (action.recipientType === 'custom_list' && (!Array.isArray(action.customRecipients) || action.customRecipients.length === 0)) {
    return 'At least one custom recipient is required for recipientType custom_list.';
  }

  return null;
};

const runAutomationTest = async ({ automationDoc, testRecipient, mockPayload }) => {
  const firstAction = automationDoc.actions?.[0];
  if (!firstAction) throw new Error('Automation has no action configured');

  const template = await EmailAutomationTemplate.findById(firstAction.templateId).lean();
  if (!template) throw new Error('Template not found for automation action');

  const variableBindings = firstAction.variableBindings || firstAction.variables || {};
  const renderedSubject = renderAutomationTemplate(firstAction.subjectOverride || template.subject, variableBindings, mockPayload);
  const renderedBody = renderAutomationTemplate(template.body || '', variableBindings, mockPayload);

  await sendEmail(testRecipient, renderedSubject, renderedBody);

  await AutomationExecution.create({
    tenantId: automationDoc.tenantId,
    automationId: automationDoc._id,
    status: 'success',
    recipients: [testRecipient],
    triggerSource: 'test',
    context: {
      mockPayloadUsed: mockPayload,
      renderedSubject
    }
  });

  return {
    success: true,
    renderedSubject,
    renderedBodyPreview: String(renderedBody || '').slice(0, 500),
    mockPayloadUsed: mockPayload
  };
};

router.post('/', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    if (!tenantId) return res.status(400).json({ message: 'Unable to resolve tenant context' });

    const payload = {
      ...req.body,
      tenantId,
      createdBy: req.user._id
    };

    const doc = await EmailAutomation.create(payload);
    if (doc.trigger?.type === 'schedule' && !doc.nextRun) {
      doc.nextRun = computeNextRun(doc);
      await doc.save();
    }

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create automation', error: error?.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const { status, triggerType, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = { tenantId };
    if (status) query.status = status;
    if (triggerType) query['trigger.type'] = triggerType;
    if (search) query.name = { $regex: String(search), $options: 'i' };

    const [items, total] = await Promise.all([
      EmailAutomation.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmailAutomation.countDocuments(query)
    ]);

    res.json({ page, limit, total, items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch automations', error: error?.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await EmailAutomation.findOne({ _id: req.params.id, tenantId });
    if (!doc) return res.status(404).json({ message: 'Automation not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch automation', error: error?.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const doc = await EmailAutomation.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Automation not found' });

    if (doc.trigger?.type === 'schedule') {
      doc.nextRun = computeNextRun(doc);
      await doc.save();
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update automation', error: error?.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const deleted = await EmailAutomation.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) return res.status(404).json({ message: 'Automation not found' });

    await AutomationExecution.deleteMany({ automationId: deleted._id, tenantId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete automation', error: error?.message });
  }
});

router.post('/:id/toggle', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const automation = await EmailAutomation.findOne({ _id: req.params.id, tenantId });
    if (!automation) return res.status(404).json({ message: 'Automation not found' });

    automation.status = automation.status === 'active' ? 'paused' : 'active';
    if (automation.status === 'active' && automation.trigger?.type === 'schedule') {
      automation.nextRun = computeNextRun(automation);
    }
    await automation.save();

    res.json(automation);
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle automation', error: error?.message });
  }
});

router.post('/:id/history', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const automation = await EmailAutomation.findOne({ _id: req.params.id, tenantId });
    if (!automation) return res.status(404).json({ message: 'Automation not found' });

    const items = await AutomationExecution.find({ automationId: automation._id, tenantId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch automation history', error: error?.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const automation = await EmailAutomation.findOne({ _id: req.params.id, tenantId });
    if (!automation) return res.status(404).json({ message: 'Automation not found' });

    const items = await AutomationExecution.find({ automationId: automation._id, tenantId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch automation history', error: error?.message });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const { testRecipient, mockChangelogData } = req.body || {};

    if (!testRecipient || !EMAIL_REGEX.test(String(testRecipient))) {
      return res.status(400).json({ message: 'Valid testRecipient is required' });
    }

    const automation = await EmailAutomation.findOne({ _id: req.params.id, tenantId });
    if (!automation) return res.status(404).json({ message: 'Automation not found' });

    const payload = mockChangelogData && typeof mockChangelogData === 'object'
      ? mockChangelogData
      : generateMockChangelog(automation.trigger?.changelogTriggerId);

    const result = await runAutomationTest({
      automationDoc: automation,
      testRecipient: String(testRecipient).trim(),
      mockPayload: payload
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send test automation email', error: error?.message });
  }
});

router.post('/test-draft', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const { testRecipient, mockChangelogData, automation } = req.body || {};

    if (!testRecipient || !EMAIL_REGEX.test(String(testRecipient))) {
      return res.status(400).json({ message: 'Valid testRecipient is required' });
    }

    if (!automation || typeof automation !== 'object') {
      return res.status(400).json({ message: 'Full automation body is required in request.automation' });
    }

    const validationError = validateAutomationPayload(automation);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const draftDoc = {
      ...automation,
      tenantId,
      actions: Array.isArray(automation.actions) ? automation.actions : []
    };

    const payload = mockChangelogData && typeof mockChangelogData === 'object'
      ? mockChangelogData
      : generateMockChangelog(draftDoc.trigger?.changelogTriggerId);

    const firstAction = draftDoc.actions?.[0];
    const template = await EmailAutomationTemplate.findById(firstAction.templateId).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const variableBindings = firstAction.variableBindings || firstAction.variables || {};
    const renderedSubject = renderAutomationTemplate(firstAction.subjectOverride || template.subject, variableBindings, payload);
    const renderedBody = renderAutomationTemplate(template.body || '', variableBindings, payload);

    await sendEmail(String(testRecipient).trim(), renderedSubject, renderedBody);

    res.json({
      success: true,
      renderedSubject,
      renderedBodyPreview: String(renderedBody || '').slice(0, 500),
      mockPayloadUsed: payload
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send draft test automation email', error: error?.message });
  }
});

router.post('/:id/trigger', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const automation = await EmailAutomation.findOne({ _id: req.params.id, tenantId });
    if (!automation) return res.status(404).json({ message: 'Automation not found' });

    if (automation.status !== 'active') {
      return res.status(400).json({ message: 'Automation must be active to trigger manually' });
    }

    const { executeAutomation } = await import('../services/automationRunner.js');
    await executeAutomation(automation, { now: new Date() }, 'manual');

    res.json({ success: true, message: 'Automation triggered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to trigger automation', error: error?.message });
  }
});

router.post('/_maintenance/prime-next-runs', async (_req, res) => {
  await primeAutomationNextRuns();
  res.json({ success: true });
});

export default router;
