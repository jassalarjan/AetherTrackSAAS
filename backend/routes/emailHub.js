import express from 'express';
import EmailJob from '../models/EmailJob.js';
import EmailAutomationTemplate from '../models/EmailAutomationTemplate.js';
import EmailSequence from '../models/EmailSequence.js';
import EmailCampaign from '../models/EmailCampaign.js';
import AutomationRule from '../models/AutomationRule.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

const asHtml = (content = '') => {
  const text = String(content || '').trim();
  if (!text) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
};

// Normalize workspace scope across legacy and current auth payloads.
router.use((req, _res, next) => {
  if (!req.user) return next();
  if (!req.user.workspace_id) {
    req.user.workspace_id = req.user.workspaceId || req.user._id;
  }
  next();
});

// ────────────────────────────────────────────────────────────
// TEMPLATES CRUD
// ────────────────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const q = { workspace: req.user.workspace_id, isActive: true };
    if (category) q.category = category;
    const templates = await EmailAutomationTemplate.find(q).sort({ updatedAt: -1 }).lean();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, subject, body, category, variables } = req.body;
    const tpl = await EmailAutomationTemplate.create({
      workspace: req.user.workspace_id, userId: req.user._id,
      name, subject, body, category: category || 'general', variables: variables || []
    });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create template' });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const { name, subject, body, category, variables } = req.body;
    const tpl = await EmailAutomationTemplate.findOneAndUpdate(
      { _id: req.params.id, workspace: req.user.workspace_id },
      { name, subject, body, category, variables },
      { new: true }
    );
    if (!tpl) return res.status(404).json({ message: 'Template not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await EmailAutomationTemplate.findOneAndUpdate(
      { _id: req.params.id, workspace: req.user.workspace_id },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// ────────────────────────────────────────────────────────────
// COMPOSE & SEND
// ────────────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const { to, toName, cc, bcc, subject, body, templateId } = req.body;
    const htmlBody = asHtml(body);
    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ message: 'To, subject, and message are required' });
    }

    const job = await EmailJob.create({
      workspace: req.user.workspace_id,
      userId: req.user._id,
      type: 'single',
      to, toName: toName || '', cc: cc || [], bcc: bcc || [],
      subject, body: htmlBody,
      templateId: templateId || null,
      status: 'pending',
      sentAt: new Date()
    });

    const emailResult = await sendEmail(to, subject, htmlBody);
    if (!emailResult?.success) {
      job.status = 'failed';
      job.error = emailResult?.error || 'Email provider rejected send';
      await job.save();
      return res.status(502).json({ message: job.error });
    }

    job.status = 'sent';
    await job.save();

    const io = req.app.get('io');
    io.to(req.user._id.toString()).emit('email-hub:sent', { jobId: job._id });

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email' });
  }
});

router.post('/schedule', async (req, res) => {
  try {
    const { to, toName, cc, bcc, subject, body, scheduledAt, templateId } = req.body;
    const job = await EmailJob.create({
      workspace: req.user.workspace_id,
      userId: req.user._id,
      type: 'single',
      to, toName: toName || '', cc: cc || [], bcc: bcc || [],
      subject, body,
      templateId: templateId || null,
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt)
    });
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ message: 'Failed to schedule email' });
  }
});

// Test send to self
router.post('/test-send', async (req, res) => {
  try {
    const { subject, body } = req.body;
    const to = req.user?.email;
    const htmlBody = asHtml(body);
    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ message: 'Unable to send test: missing recipient, subject, or message' });
    }

    const result = await sendEmail(to, subject, htmlBody);
    if (!result?.success) {
      return res.status(502).json({ message: result?.error || 'Failed to send test email' });
    }

    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

// ────────────────────────────────────────────────────────────
// SEQUENCES CRUD
// ────────────────────────────────────────────────────────────
router.get('/sequences', async (req, res) => {
  try {
    const sequences = await EmailSequence.find({ workspace: req.user.workspace_id })
      .sort({ updatedAt: -1 }).lean();
    res.json(sequences);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sequences' });
  }
});

router.get('/sequences/:id', async (req, res) => {
  try {
    const seq = await EmailSequence.findOne({ _id: req.params.id, workspace: req.user.workspace_id }).lean();
    if (!seq) return res.status(404).json({ message: 'Sequence not found' });
    res.json(seq);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sequence' });
  }
});

router.post('/sequences', async (req, res) => {
  try {
    const { name, steps } = req.body;
    const seq = await EmailSequence.create({
      workspace: req.user.workspace_id,
      userId: req.user._id,
      name,
      steps: steps || [],
      status: 'draft'
    });
    res.json(seq);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create sequence' });
  }
});

router.put('/sequences/:id', async (req, res) => {
  try {
    const { name, steps, status, stopOnReply, stopOnUnsub } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (steps !== undefined) update.steps = steps;
    if (status !== undefined) update.status = status;
    if (stopOnReply !== undefined) update.stopOnReply = stopOnReply;
    if (stopOnUnsub !== undefined) update.stopOnUnsub = stopOnUnsub;

    const seq = await EmailSequence.findOneAndUpdate(
      { _id: req.params.id, workspace: req.user.workspace_id },
      update,
      { new: true }
    );
    if (!seq) return res.status(404).json({ message: 'Sequence not found' });
    res.json(seq);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update sequence' });
  }
});

router.delete('/sequences/:id', async (req, res) => {
  try {
    await EmailSequence.findOneAndDelete({ _id: req.params.id, workspace: req.user.workspace_id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete sequence' });
  }
});

// Enroll contacts into sequence
router.post('/sequences/:id/enroll', async (req, res) => {
  try {
    const { contacts } = req.body; // [{ email, name, mergeData }]
    const seq = await EmailSequence.findOne({ _id: req.params.id, workspace: req.user.workspace_id });
    if (!seq) return res.status(404).json({ message: 'Sequence not found' });

    const existingEmails = new Set(seq.enrolledContacts.map(c => c.email));
    let enrolled = 0;

    for (const c of contacts) {
      if (existingEmails.has(c.email)) continue;
      const nextStep = seq.steps[0];
      const nextSendAt = new Date();
      if (nextStep) {
        nextSendAt.setDate(nextSendAt.getDate() + (nextStep.delayDays || 0));
        nextSendAt.setHours(nextSendAt.getHours() + (nextStep.delayHours || 0));
      }

      seq.enrolledContacts.push({
        email: c.email,
        name: c.name || '',
        currentStep: 0,
        nextSendAt,
        status: 'active',
        enrolledAt: new Date(),
        mergeData: c.mergeData || {}
      });
      enrolled++;
    }

    if (seq.status === 'draft') seq.status = 'active';
    await seq.save();

    const io = req.app.get('io');
    io.to(req.user._id.toString()).emit('email-hub:enrolled', { sequenceId: seq._id, count: enrolled });

    res.json({ success: true, enrolled, total: seq.enrolledContacts.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to enroll contacts' });
  }
});

// Clone sequence
router.post('/sequences/:id/clone', async (req, res) => {
  try {
    const source = await EmailSequence.findOne({ _id: req.params.id, workspace: req.user.workspace_id }).lean();
    if (!source) return res.status(404).json({ message: 'Sequence not found' });
    const cloned = await EmailSequence.create({
      workspace: req.user.workspace_id,
      userId: req.user._id,
      name: `${source.name} (Copy)`,
      steps: source.steps,
      status: 'draft',
      stopOnReply: source.stopOnReply,
      stopOnUnsub: source.stopOnUnsub,
      maxSteps: source.maxSteps
    });
    res.json(cloned);
  } catch (err) {
    res.status(500).json({ message: 'Failed to clone sequence' });
  }
});

// ────────────────────────────────────────────────────────────
// CAMPAIGNS CRUD
// ────────────────────────────────────────────────────────────
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find({ workspace: req.user.workspace_id })
      .sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const { name, templateId, subject, body, contacts, fieldMapping } = req.body;
    const campaign = await EmailCampaign.create({
      workspace: req.user.workspace_id,
      userId: req.user._id,
      name, templateId, subject, body,
      contacts: contacts || [],
      fieldMapping: fieldMapping || {},
      status: 'draft',
      stats: { total: (contacts || []).length, sent: 0, failed: 0, opened: 0, clicked: 0 }
    });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

router.put('/campaigns/:id', async (req, res) => {
  try {
    const { name, subject, body, contacts, fieldMapping, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (subject !== undefined) update.subject = subject;
    if (body !== undefined) update.body = body;
    if (contacts !== undefined) {
      update.contacts = contacts;
      update['stats.total'] = contacts.length;
    }
    if (fieldMapping !== undefined) update.fieldMapping = fieldMapping;
    if (status !== undefined) update.status = status;

    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: req.params.id, workspace: req.user.workspace_id },
      update,
      { new: true }
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update campaign' });
  }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    await EmailCampaign.findOneAndDelete({ _id: req.params.id, workspace: req.user.workspace_id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete campaign' });
  }
});

// Launch campaign
router.post('/campaigns/:id/launch', async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({ _id: req.params.id, workspace: req.user.workspace_id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.contacts.length === 0) return res.status(400).json({ message: 'No contacts to send' });

    campaign.status = 'sending';
    campaign.launchedAt = new Date();
    await campaign.save();

    const io = req.app.get('io');
    const total = campaign.contacts.length;
    let sent = 0, failed = 0;

    // STUB: In production, this would be a background job queue
    for (let i = 0; i < total; i++) {
      const contact = campaign.contacts[i];
      try {
        // Interpolate variables
        let body = campaign.body;
        let subject = campaign.subject;
        if (contact.mergeData) {
          for (const [key, val] of contact.mergeData) {
            body = body.replace(new RegExp(`{{${key}}}`, 'g'), val);
            subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), val);
          }
        }

        // STUB: send email
        // await sendEmail({ to: contact.email, subject, html: body });

        await EmailJob.create({
          workspace: req.user.workspace_id, userId: req.user._id,
          type: 'campaign', campaignId: campaign._id,
          to: contact.email, toName: contact.name || '',
          subject, body,
          status: 'sent', sentAt: new Date(),
          mergeData: contact.mergeData || {}
        });

        contact.status = 'sent';
        contact.sentAt = new Date();
        sent++;
      } catch (err) {
        contact.status = 'failed';
        contact.error = err.message;
        failed++;
      }

      // Emit progress
      io.to(req.user._id.toString()).emit('email-hub:campaign-progress', {
        campaignId: campaign._id,
        progress: i + 1,
        total,
        sent,
        failed
      });

      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    campaign.status = 'completed';
    campaign.completedAt = new Date();
    campaign.stats = { ...campaign.stats, sent, failed };
    await campaign.save();

    res.json({ success: true, campaign, sent, failed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to launch campaign' });
  }
});

// Campaign stats
router.get('/campaigns/:id/stats', async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({ _id: req.params.id, workspace: req.user.workspace_id }).lean();
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    const jobs = await EmailJob.find({ campaignId: campaign._id }).lean();
    res.json({ campaign, jobs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ────────────────────────────────────────────────────────────
// AUTOMATION RULES CRUD
// ────────────────────────────────────────────────────────────
router.get('/automation-rules', async (req, res) => {
  try {
    const rules = await AutomationRule.find({ workspace: req.user.workspace_id })
      .populate('action.templateId', 'name')
      .sort({ createdAt: -1 }).lean();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rules' });
  }
});

router.post('/automation-rules', async (req, res) => {
  try {
    const { name, trigger, conditions, action } = req.body;
    const rule = await AutomationRule.create({
      workspace: req.user.workspace_id, userId: req.user._id,
      name, trigger, conditions: conditions || [], action: action || {}
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create rule' });
  }
});

router.put('/automation-rules/:id', async (req, res) => {
  try {
    const { name, trigger, conditions, action, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (trigger !== undefined) update.trigger = trigger;
    if (conditions !== undefined) update.conditions = conditions;
    if (action !== undefined) update.action = action;
    if (isActive !== undefined) update.isActive = isActive;

    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, workspace: req.user.workspace_id },
      update,
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update rule' });
  }
});

router.delete('/automation-rules/:id', async (req, res) => {
  try {
    await AutomationRule.findOneAndDelete({ _id: req.params.id, workspace: req.user.workspace_id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete rule' });
  }
});

// Toggle rule active state
router.patch('/automation-rules/:id/toggle', async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id, workspace: req.user.workspace_id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    rule.isActive = !rule.isActive;
    await rule.save();
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle rule' });
  }
});

// Internal trigger endpoint — called by AetherTrack event hooks
router.post('/automation-rules/trigger', async (req, res) => {
  try {
    const { trigger, workspace, context } = req.body; // context = { taskId, projectId, userId, ... }

    const rules = await AutomationRule.find({
      workspace, trigger, isActive: true
    });

    const io = req.app.get('io');
    const fired = [];

    for (const rule of rules) {
      // Check conditions
      let conditionsMet = true;
      for (const cond of (rule.conditions || [])) {
        const ctxVal = context[cond.field];
        if (cond.operator === 'eq' && ctxVal !== cond.value) conditionsMet = false;
        if (cond.operator === 'neq' && ctxVal === cond.value) conditionsMet = false;
        if (cond.operator === 'contains' && !String(ctxVal || '').includes(cond.value)) conditionsMet = false;
        if (cond.operator === 'changed_to' && context._changedTo !== cond.value) conditionsMet = false;
      }
      if (!conditionsMet) continue;

      // Get recipient
      let toEmail = context.email || context.assigneeEmail || '';
      if (!toEmail && rule.action.targetField) {
        toEmail = context[rule.action.targetField + 'Email'] || '';
      }

      if (!toEmail) continue;

      // STUB: Send email after delay
      // In production: queue a delayed job
      await EmailJob.create({
        workspace: rule.workspace,
        userId: rule.userId,
        type: 'automation',
        ruleId: rule._id,
        to: toEmail,
        toName: context.name || context.assigneeName || '',
        subject: rule.action.subject || 'Automated notification',
        body: rule.action.body || '',
        templateId: rule.action.templateId || null,
        status: 'pending'
      });

      rule.lastTriggeredAt = new Date();
      rule.triggerCount += 1;
      await rule.save();

      io.to(rule.userId.toString()).emit('email-hub:rule-fired', {
        ruleId: rule._id, ruleName: rule.name, to: toEmail
      });

      fired.push(rule._id);
    }

    res.json({ success: true, rulesFired: fired.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process trigger' });
  }
});

// ────────────────────────────────────────────────────────────
// ANALYTICS / JOBS
// ────────────────────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
  try {
    const { type, status, campaignId, sequenceId, page = 1, limit = 50 } = req.query;
    const q = { workspace: req.user.workspace_id };
    if (type) q.type = type;
    if (status) q.status = status;
    if (campaignId) q.campaignId = campaignId;
    if (sequenceId) q.sequenceId = sequenceId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      EmailJob.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      EmailJob.countDocuments(q)
    ]);
    res.json({ jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// Dashboard analytics
router.get('/analytics', async (req, res) => {
  try {
    const workspace = req.user.workspace_id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      totalSent, totalFailed, campaignsCount, sequencesCount, rulesCount,
      dailyStats
    ] = await Promise.all([
      EmailJob.countDocuments({ workspace, status: 'sent' }),
      EmailJob.countDocuments({ workspace, status: 'failed' }),
      EmailCampaign.countDocuments({ workspace }),
      EmailSequence.countDocuments({ workspace }),
      AutomationRule.countDocuments({ workspace }),
      EmailJob.aggregate([
        { $match: { workspace, status: 'sent', sentAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      totalSent, totalFailed,
      totalCampaigns: campaignsCount,
      totalSequences: sequencesCount,
      totalRules: rulesCount,
      dailyStats
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default router;
