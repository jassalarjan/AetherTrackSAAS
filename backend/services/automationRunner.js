import cron from 'node-cron';
import EmailAutomation from '../models/EmailAutomation.js';
import EmailAutomationTemplate from '../models/EmailAutomationTemplate.js';
import AutomationExecution from '../models/AutomationExecution.js';
import ChangelogEntry from '../models/ChangelogEntry.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';
import { logChange } from '../utils/changeLogService.js';
import { renderAutomationTemplate } from './automationTemplateRenderer.js';

let isInitialized = false;
let ioRef = null;

const readPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

const compareValue = (actual, operator, expected) => {
  switch (operator) {
    case 'neq': return String(actual) !== String(expected);
    case 'contains': return String(actual || '').toLowerCase().includes(String(expected || '').toLowerCase());
    case 'in': return Array.isArray(expected) ? expected.map(String).includes(String(actual)) : false;
    case 'gt': return Number(actual) > Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'eq':
    default:
      return String(actual) === String(expected);
  }
};

const evaluateRules = (rules = [], payload = {}) => {
  if (!Array.isArray(rules) || rules.length === 0) return true;
  return rules.every((rule) => {
    const actual = readPath(payload, rule.field);
    return compareValue(actual, rule.operator, rule.value);
  });
};

const resolveTriggerIds = (entry) => {
  if (!entry) return [];

  const entityType = String(entry.entityType || '').trim().toLowerCase();
  const action = String(entry.action || '').trim().toLowerCase();
  const ids = new Set();

  if (entityType && action) {
    ids.add(`${entityType}.${action}`);
  }

  const aliasMap = {
    'task.created': ['task.created'],
    'task.completed': ['task.completed'],
    'task.status_changed': ['task.status_changed'],
    'task.assigned': ['task.assigned'],
    'task.deleted': ['task.deleted'],
    'project.created': ['project.created'],
    'project.updated': ['project.updated'],
    'project.deleted': ['project.deleted'],
    'milestone.completed': ['project.milestone_reached'],
    'member.created': ['member.added'],
    'member.deleted': ['member.removed'],
    'team.created': ['team.created'],
    'team.updated': ['team.updated'],
    'team.deleted': ['team.deleted'],
    'sprint.status_changed': ['sprint.started'],
    'sprint.completed': ['sprint.completed'],
    'attendance.check_in': ['attendance.check_in'],
    'attendance.check_out': ['attendance.check_out'],
    'leave.created': ['leave.submitted'],
    'leave.approved': ['leave.approved'],
    'leave.rejected': ['leave.rejected'],
    'email.sent': ['email.sent'],
    'email.failed': ['email.failed'],
    'notification.sent': ['notification.sent'],
    'auth.login': ['user.login'],
    'auth.logout': ['user.logout'],
    'comment.created': ['comment.added'],
    'system.bulk_import': ['bulk.import']
  };

  const key = `${entityType}.${action}`;
  (aliasMap[key] || []).forEach((id) => ids.add(id));

  return Array.from(ids);
};

const resolveRecipients = async (automation, context) => {
  const action = automation.actions?.[0];
  if (!action) return [];

  if (action.recipientType === 'custom_list') {
    return (action.customRecipients || []).filter(Boolean);
  }

  if (action.recipientType === 'trigger_actor') {
    if (context?.changedByEmail) return [context.changedByEmail];
    const actorId = context?.changedBy;
    if (!actorId) return [];
    const actor = await User.findById(actorId).select('email').lean();
    return actor?.email ? [actor.email] : [];
  }

  if (action.recipientType === 'assignee') {
    const assignee = context?.diff?.assigned_to?.to || context?.assigneeEmail;
    return assignee ? [assignee] : [];
  }

  if (action.recipientType === 'project_members') {
    const projectId = context?.projectId;
    if (!projectId) return [];
    const project = await Project.findById(projectId).populate('team_members.user', 'email');
    if (!project) return [];
    return project.team_members.map((member) => member?.user?.email).filter(Boolean);
  }

  return [];
};

export const computeNextRunForAutomation = (automation, fromDate = new Date()) => {
  const schedule = automation?.trigger?.schedule;
  if (!schedule) return null;

  const [hour, minute] = String(schedule.time || '09:00').split(':').map((n) => Number(n) || 0);
  const next = new Date(fromDate);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);

  if (schedule.frequency === 'daily') {
    if (next <= fromDate) next.setDate(next.getDate() + 1);
    return next;
  }

  if (schedule.frequency === 'weekly') {
    const target = Number(schedule.dayOfWeek ?? 1);
    const delta = (target - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + delta);
    if (next <= fromDate) next.setDate(next.getDate() + 7);
    return next;
  }

  if (schedule.frequency === 'monthly') {
    const targetDay = Number(schedule.dayOfMonth || 1);
    next.setDate(Math.min(targetDay, 28));
    if (next <= fromDate) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(targetDay, 28));
    }
    return next;
  }

  return null;
};

const emit = (event, payload) => {
  if (!ioRef) return;
  ioRef.emit(event, payload);
};

export const executeAutomation = async (automation, context, triggerSource = 'changelog') => {
  const firstAction = automation.actions?.[0];
  if (!firstAction || firstAction.type !== 'send_email') {
    await AutomationExecution.create({
      tenantId: automation.tenantId,
      automationId: automation._id,
      status: 'skipped',
      recipients: [],
      error: 'No send_email action configured',
      triggerSource,
      context
    });
    return;
  }

  const template = await EmailAutomationTemplate.findById(firstAction.templateId).lean();
  if (!template) {
    await AutomationExecution.create({
      tenantId: automation.tenantId,
      automationId: automation._id,
      status: 'failed',
      recipients: [],
      error: 'Template not found',
      triggerSource,
      context
    });
    return;
  }

  const recipients = await resolveRecipients(automation, context);
  if (recipients.length === 0) {
    await AutomationExecution.create({
      tenantId: automation.tenantId,
      automationId: automation._id,
      status: 'skipped',
      recipients: [],
      error: 'No recipients resolved for action',
      triggerSource,
      context
    });
    return;
  }

  emit('automation:triggered', {
    automationId: automation._id,
    tenantId: automation.tenantId,
    name: automation.name,
    triggerSource
  });

  await logChange({
    event_type: 'email_automation_triggered',
    user_id: context?.changedBy || null,
    action: 'EMAIL_AUTOMATION_TRIGGERED',
    target_type: 'automation',
    target_id: String(automation._id),
    target_name: automation.name,
    description: `Email automation "${automation.name}" triggered via ${triggerSource}`,
    workspaceId: automation.tenantId,
    metadata: {
      automationId: String(automation._id),
      triggerSource,
      status: automation.status || 'active'
    }
  });

  try {
    const variableBindings = firstAction.variableBindings || firstAction.variables || {};
    const subjectTemplate = firstAction.subjectOverride || template.subject || '';
    const bodyTemplate = template.body || '';
    const subject = renderAutomationTemplate(subjectTemplate, variableBindings, context);
    const htmlBody = renderAutomationTemplate(bodyTemplate, variableBindings, context);

    await Promise.all(recipients.map((email) => sendEmail(email, subject, htmlBody)));

    await logChange({
      event_type: 'email_sent',
      user_id: context?.changedBy || null,
      action: 'EMAIL_AUTOMATION_SENT',
      target_type: 'automation',
      target_id: String(automation._id),
      target_name: automation.name,
      description: `Email automation "${automation.name}" sent ${recipients.length} email(s)`,
      workspaceId: automation.tenantId,
      metadata: {
        automationId: String(automation._id),
        triggerSource,
        recipientCount: recipients.length,
        recipients
      }
    });

    const now = new Date();
    const nextRun = automation.trigger?.type === 'schedule' ? computeNextRunForAutomation(automation, now) : automation.nextRun;

    await EmailAutomation.updateOne(
      { _id: automation._id },
      {
        $set: { lastRun: now, nextRun },
        $inc: { runCount: 1 }
      }
    );

    await AutomationExecution.create({
      tenantId: automation.tenantId,
      automationId: automation._id,
      status: 'success',
      recipients,
      triggerSource,
      context
    });

    emit('automation:completed', {
      automationId: automation._id,
      tenantId: automation.tenantId,
      name: automation.name,
      status: 'success',
      recipientsCount: recipients.length,
      lastRun: now
    });
  } catch (error) {
    await logChange({
      event_type: 'email_failed',
      user_id: context?.changedBy || null,
      action: 'EMAIL_AUTOMATION_FAILED',
      target_type: 'automation',
      target_id: String(automation._id),
      target_name: automation.name,
      description: `Email automation "${automation.name}" failed: ${error?.message || 'Unknown error'}`,
      workspaceId: automation.tenantId,
      metadata: {
        automationId: String(automation._id),
        triggerSource,
        recipientCount: recipients.length,
        recipients,
        error: error?.message || 'Failed to execute automation'
      }
    });

    await AutomationExecution.create({
      tenantId: automation.tenantId,
      automationId: automation._id,
      status: 'failed',
      recipients,
      error: error?.message || 'Failed to execute automation',
      triggerSource,
      context
    });

    emit('automation:completed', {
      automationId: automation._id,
      tenantId: automation.tenantId,
      name: automation.name,
      status: 'failed',
      recipientsCount: recipients.length,
      error: error?.message || 'Failed to execute automation'
    });
  }
};

export const handleChangelogAutomation = async (entry) => {
  const triggerIds = resolveTriggerIds(entry);
  if (triggerIds.length === 0) return;

  let actor = null;
  if (entry?.changedBy) {
    actor = await User.findById(entry.changedBy).select('email full_name').lean();
  }

  const automations = await EmailAutomation.find({
    tenantId: entry.tenantId,
    status: 'active',
    'trigger.type': 'changelog',
    'trigger.changelogTriggerId': { $in: triggerIds }
  });

  for (const automation of automations) {
    const payload = {
      entityType: entry.entityType,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityId,
      diff: entry.diff,
      changedBy: entry.changedBy,
      changedByEmail: actor?.email || null,
      changedByName: actor?.full_name || null,
      projectId: entry.diff?.projectId?.to || null
    };

    const passesTriggerFilters = evaluateRules(automation.trigger?.filters, payload);
    const passesConditions = evaluateRules(automation.conditions, payload);

    if (!passesTriggerFilters || !passesConditions) {
      continue;
    }

    await executeAutomation(automation, payload, 'changelog');
  }
};

const runScheduledAutomations = async () => {
  const now = new Date();
  const due = await EmailAutomation.find({
    status: 'active',
    'trigger.type': 'schedule',
    nextRun: { $lte: now }
  });

  for (const automation of due) {
    await executeAutomation(automation, { now }, 'schedule');
  }
};

export const initializeAutomationRunner = ({ io } = {}) => {
  if (isInitialized) return;
  isInitialized = true;
  ioRef = io || null;

  cron.schedule('* * * * *', async () => {
    await runScheduledAutomations();
  });
};

export const primeAutomationNextRuns = async () => {
  const scheduleAutomations = await EmailAutomation.find({ 'trigger.type': 'schedule', status: { $in: ['active', 'draft'] } });
  await Promise.all(scheduleAutomations.map(async (automation) => {
    if (!automation.nextRun) {
      automation.nextRun = computeNextRunForAutomation(automation, new Date());
      await automation.save();
    }
  }));
};

export const seedAutomationsFromChangelog = async () => {
  const latest = await ChangelogEntry.find().sort({ createdAt: -1 }).limit(1).lean();
  return latest;
};
