import api from '@/shared/services/axios';

const ENDPOINT_AVAILABILITY_STORAGE_KEY = 'emailHubEndpointAvailability';
let endpointAvailability = null;

const ensureEndpointAvailability = () => {
  if (endpointAvailability) return endpointAvailability;
  endpointAvailability = {};
  try {
    const raw = sessionStorage.getItem(ENDPOINT_AVAILABILITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        endpointAvailability = parsed;
      }
    }
  } catch {
    endpointAvailability = {};
  }
  return endpointAvailability;
};

const setEndpointAvailability = (key, value) => {
  const current = ensureEndpointAvailability();
  current[key] = value;
  try {
    sessionStorage.setItem(ENDPOINT_AVAILABILITY_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Non-blocking cache write.
  }
};

const isEndpointUnavailable = (key) => {
  const current = ensureEndpointAvailability();
  return current[key] === false;
};

const isNotFoundError = (error) => error?.response?.status === 404;

const withEndpointFallback = async (endpointKey, requestFn, fallbackFn) => {
  if (isEndpointUnavailable(endpointKey)) {
    return typeof fallbackFn === 'function' ? fallbackFn() : fallbackFn;
  }

  try {
    const response = await requestFn();
    setEndpointAvailability(endpointKey, true);
    return response;
  } catch (error) {
    if (isNotFoundError(error)) {
      setEndpointAvailability(endpointKey, false);
      return typeof fallbackFn === 'function' ? fallbackFn() : fallbackFn;
    }
    throw error;
  }
};

const FALLBACK_TRIGGER_TYPES = [
  {
    id: 'task.created',
    label: 'Task Created',
    entityType: 'task',
    action: 'created',
    availableFields: ['taskName', 'assignee', 'project', 'priority'],
    description: 'Fires when a new task is created'
  },
  {
    id: 'task.completed',
    label: 'Task Completed',
    entityType: 'task',
    action: 'completed',
    availableFields: ['taskName', 'assignee', 'completedBy', 'project'],
    description: 'Fires when a task is marked completed'
  },
  {
    id: 'task.status_changed',
    label: 'Task Status Changed',
    entityType: 'task',
    action: 'status_changed',
    availableFields: ['taskName', 'fromStatus', 'toStatus', 'assignee', 'project'],
    description: 'Fires when a task changes status'
  },
  {
    id: 'task.deleted',
    label: 'Task Deleted',
    entityType: 'task',
    action: 'deleted',
    availableFields: ['taskName', 'project', 'deletedBy'],
    description: 'Fires when a task is deleted'
  },
  {
    id: 'task.assigned',
    label: 'Task Assigned',
    entityType: 'task',
    action: 'assigned',
    availableFields: ['taskName', 'assignee', 'assignedBy', 'project'],
    description: 'Fires when a task assignee changes'
  },
  {
    id: 'project.created',
    label: 'Project Created',
    entityType: 'project',
    action: 'created',
    availableFields: ['projectName', 'owner', 'priority', 'dueDate'],
    description: 'Fires when a project is created'
  },
  {
    id: 'project.updated',
    label: 'Project Updated',
    entityType: 'project',
    action: 'updated',
    availableFields: ['projectName', 'updatedBy', 'changedField'],
    description: 'Fires when project details are updated'
  },
  {
    id: 'project.deleted',
    label: 'Project Deleted',
    entityType: 'project',
    action: 'deleted',
    availableFields: ['projectName', 'deletedBy'],
    description: 'Fires when a project is deleted'
  },
  {
    id: 'project.milestone_reached',
    label: 'Project Milestone Reached',
    entityType: 'milestone',
    action: 'completed',
    availableFields: ['milestoneName', 'project', 'completedBy'],
    description: 'Fires when a milestone is completed'
  },
  {
    id: 'member.added',
    label: 'Member Added',
    entityType: 'member',
    action: 'created',
    availableFields: ['memberName', 'memberEmail', 'role'],
    description: 'Fires when a member is added to workspace'
  },
  {
    id: 'member.removed',
    label: 'Member Removed',
    entityType: 'member',
    action: 'deleted',
    availableFields: ['memberName', 'memberEmail', 'role'],
    description: 'Fires when a member is removed from workspace'
  },
  {
    id: 'team.created',
    label: 'Team Created',
    entityType: 'team',
    action: 'created',
    availableFields: ['teamName', 'owner'],
    description: 'Fires when a team is created'
  },
  {
    id: 'team.updated',
    label: 'Team Updated',
    entityType: 'team',
    action: 'updated',
    availableFields: ['teamName', 'updatedBy', 'changedField'],
    description: 'Fires when a team is updated'
  },
  {
    id: 'team.deleted',
    label: 'Team Deleted',
    entityType: 'team',
    action: 'deleted',
    availableFields: ['teamName', 'deletedBy'],
    description: 'Fires when a team is deleted'
  },
  {
    id: 'sprint.started',
    label: 'Sprint Started',
    entityType: 'sprint',
    action: 'status_changed',
    availableFields: ['sprintName', 'project', 'startDate', 'endDate'],
    description: 'Fires when sprint becomes active'
  },
  {
    id: 'sprint.completed',
    label: 'Sprint Completed',
    entityType: 'sprint',
    action: 'completed',
    availableFields: ['sprintName', 'project', 'velocity'],
    description: 'Fires when sprint is completed'
  },
  {
    id: 'attendance.check_in',
    label: 'Attendance Check-In',
    entityType: 'attendance',
    action: 'check_in',
    availableFields: ['employeeName', 'checkInTime', 'location'],
    description: 'Fires when user checks in'
  },
  {
    id: 'attendance.check_out',
    label: 'Attendance Check-Out',
    entityType: 'attendance',
    action: 'check_out',
    availableFields: ['employeeName', 'checkOutTime', 'workHours'],
    description: 'Fires when user checks out'
  },
  {
    id: 'leave.submitted',
    label: 'Leave Submitted',
    entityType: 'leave',
    action: 'created',
    availableFields: ['employeeName', 'leaveType', 'fromDate', 'toDate'],
    description: 'Fires when a leave request is submitted'
  },
  {
    id: 'leave.approved',
    label: 'Leave Approved',
    entityType: 'leave',
    action: 'approved',
    availableFields: ['employeeName', 'leaveType', 'approvedBy'],
    description: 'Fires when leave request is approved'
  },
  {
    id: 'leave.rejected',
    label: 'Leave Rejected',
    entityType: 'leave',
    action: 'rejected',
    availableFields: ['employeeName', 'leaveType', 'rejectedBy'],
    description: 'Fires when leave request is rejected'
  },
  {
    id: 'email.sent',
    label: 'Email Sent',
    entityType: 'email',
    action: 'sent',
    availableFields: ['recipient', 'subject', 'templateName'],
    description: 'Fires when an email is sent'
  },
  {
    id: 'email.failed',
    label: 'Email Failed',
    entityType: 'email',
    action: 'failed',
    availableFields: ['recipient', 'subject', 'errorMessage'],
    description: 'Fires when an email send fails'
  },
  {
    id: 'notification.sent',
    label: 'Notification Sent',
    entityType: 'notification',
    action: 'sent',
    availableFields: ['recipient', 'channel', 'messageType'],
    description: 'Fires when system notification is sent'
  },
  {
    id: 'user.login',
    label: 'User Login',
    entityType: 'auth',
    action: 'login',
    availableFields: ['userName', 'email', 'ipAddress'],
    description: 'Fires when user logs in'
  },
  {
    id: 'user.logout',
    label: 'User Logout',
    entityType: 'auth',
    action: 'logout',
    availableFields: ['userName', 'email', 'ipAddress'],
    description: 'Fires when user logs out'
  },
  {
    id: 'comment.added',
    label: 'Comment Added',
    entityType: 'comment',
    action: 'created',
    availableFields: ['author', 'taskName', 'project'],
    description: 'Fires when a task comment is added'
  },
  {
    id: 'bulk.import',
    label: 'Bulk Import',
    entityType: 'system',
    action: 'bulk_import',
    availableFields: ['entityType', 'importedCount', 'failedCount'],
    description: 'Fires on bulk import completion'
  }
];

const buildFallbackResponse = () => ({ data: FALLBACK_TRIGGER_TYPES });

const titleize = (value) => String(value || '')
  .replace(/[._-]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const mapLegacyEventTypeToTrigger = (eventType) => {
  const raw = String(eventType || '');
  const tokens = raw.split('.');
  const actionToken = tokens.length > 1 ? tokens[tokens.length - 1] : 'event';
  const entityToken = tokens.length > 1 ? tokens.slice(0, -1).join('.') : raw;

  return {
    id: raw,
    label: titleize(raw),
    entityType: entityToken,
    action: actionToken,
    availableFields: [],
    description: `Legacy trigger for ${titleize(raw)}`
  };
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.templates)) return payload.templates;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const mapLegacyCategory = (category) => {
  if (category === 'onboarding') return 'onboarding';
  if (category === 'custom') return 'custom';
  return 'general';
};

const mapLegacyTemplate = (template) => ({
  _id: template?._id,
  name: template?.name || 'Untitled Template',
  subject: template?.subject || '',
  body: template?.htmlContent || '',
  category: mapLegacyCategory(template?.category),
  variables: Array.isArray(template?.variables)
    ? template.variables.map((v) => (typeof v === 'string' ? v : v?.name)).filter(Boolean)
    : [],
  isActive: true,
  source: 'legacy-email-template',
});

const emailHubApi = {
  // Templates
  getTemplates: (params = {}) => api.get('/email-hub/templates', { params }),
  getTemplatesList: async (params = {}) => {
    const response = await api.get('/email-hub/templates', { params });
    const hubTemplates = extractList(response?.data);
    if (hubTemplates.length > 0) return hubTemplates;

    // Fallback for environments where Email Hub templates are empty but HR templates exist.
    try {
      const legacyResponse = await api.get('/hr/email-templates', { params });
      const legacyTemplates = extractList(legacyResponse?.data).map(mapLegacyTemplate);
      return legacyTemplates;
    } catch {
      return hubTemplates;
    }
  },
  createTemplate: (data) => api.post('/email-hub/templates', data),
  updateTemplate: (id, data) => api.put(`/email-hub/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/email-hub/templates/${id}`),

  // Compose & Send
  sendEmail: (data) => api.post('/email-hub/send', data),
  scheduleEmail: (data) => api.post('/email-hub/schedule', data),
  testSend: (data) => api.post('/email-hub/test-send', data),

  // Sequences
  getSequences: () => api.get('/email-hub/sequences'),
  getSequence: (id) => api.get(`/email-hub/sequences/${id}`),
  createSequence: (data) => api.post('/email-hub/sequences', data),
  updateSequence: (id, data) => api.put(`/email-hub/sequences/${id}`, data),
  deleteSequence: (id) => api.delete(`/email-hub/sequences/${id}`),
  enrollSequence: (id, contacts) => api.post(`/email-hub/sequences/${id}/enroll`, { contacts }),
  cloneSequence: (id) => api.post(`/email-hub/sequences/${id}/clone`),

  // Campaigns
  getCampaigns: () => api.get('/email-hub/campaigns'),
  createCampaign: (data) => api.post('/email-hub/campaigns', data),
  updateCampaign: (id, data) => api.put(`/email-hub/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/email-hub/campaigns/${id}`),
  launchCampaign: (id) => api.post(`/email-hub/campaigns/${id}/launch`),
  getCampaignStats: (id) => api.get(`/email-hub/campaigns/${id}/stats`),

  // Automation Rules
  getRules: () => api.get('/email-hub/automation-rules'),
  createRule: (data) => api.post('/email-hub/automation-rules', data),
  updateRule: (id, data) => api.put(`/email-hub/automation-rules/${id}`, data),
  deleteRule: (id) => api.delete(`/email-hub/automation-rules/${id}`),
  toggleRule: (id) => api.patch(`/email-hub/automation-rules/${id}/toggle`),

  // Changelog trigger library
  getTriggerTypes: async () => {
    // If we already know trigger-types exists, use the fast cached path.
    if (!isEndpointUnavailable('changelog.trigger-types')) {
      try {
        const response = await api.get('/changelog/trigger-types');
        setEndpointAvailability('changelog.trigger-types', true);
        return response;
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        setEndpointAvailability('changelog.trigger-types', false);
      }
    }

    // Fallback to older backend route if trigger manifest endpoint is missing.
    const legacyEventTypeResponse = await withEndpointFallback(
      'changelog.event-types',
      () => api.get('/changelog/event-types'),
      { data: [] }
    );

    const legacyEventTypes = Array.isArray(legacyEventTypeResponse?.data)
      ? legacyEventTypeResponse.data
      : [];

    if (legacyEventTypes.length > 0) {
      return { data: legacyEventTypes.map(mapLegacyEventTypeToTrigger) };
    }

    return buildFallbackResponse();
  },
  getChangelog: (params = {}) => api.get('/changelog', { params }),

  // Event Automations (Phase 2)
  getAutomations: (params = {}) => withEndpointFallback(
    'automations.list',
    () => api.get('/automations', { params }),
    { data: { page: 1, limit: 20, total: 0, items: [] } }
  ),
  getAutomation: (id) => api.get(`/automations/${id}`),
  createAutomation: (data) => api.post('/automations', data),
  updateAutomation: (id, data) => api.patch(`/automations/${id}`, data),
  deleteAutomation: (id) => api.delete(`/automations/${id}`),
  toggleAutomation: (id) => api.post(`/automations/${id}/toggle`),
  triggerAutomation: (id) => api.post(`/automations/${id}/trigger`),
  testAutomation: (id, data) => api.post(`/automations/${id}/test`, data),
  testAutomationDraft: (data) => api.post('/automations/test-draft', data),
  getAutomationHistory: (id) => withEndpointFallback(
    'automations.history',
    () => api.get(`/automations/${id}/history`),
    { data: [] }
  ),

  // Report Automations (Phase 3)
  getReportAutomations: (params = {}) => withEndpointFallback(
    'report-automations.list',
    () => api.get('/report-automations', { params }),
    { data: { page: 1, limit: 20, total: 0, items: [] } }
  ),
  createReportAutomation: (data) => api.post('/report-automations', data),
  getReportAutomation: (id) => api.get(`/report-automations/${id}`),
  updateReportAutomation: (id, data) => api.patch(`/report-automations/${id}`, data),
  deleteReportAutomation: (id) => api.delete(`/report-automations/${id}`),
  toggleReportAutomation: (id) => api.post(`/report-automations/${id}/toggle`),
  previewReportAutomation: (id) => withEndpointFallback(
    'report-automations.preview',
    () => api.get(`/report-automations/${id}/preview`),
    { data: { summary: { tasksTotal: 0, completionRate: 0 } } }
  ),
  getReportAutomationHistory: (id) => withEndpointFallback(
    'report-automations.history',
    () => api.get(`/report-automations/${id}/history`),
    { data: [] }
  ),
  testReportAutomation: (id, data) => api.post(`/report-automations/${id}/test`, data),
  sendReportNow: (id) => withEndpointFallback(
    'report-automations.send-now',
    () => api.post(`/report-automations/${id}/send-now`),
    { data: { success: false, message: 'Report automation endpoint is unavailable.' } }
  ),

  // Analytics
  getAnalytics: () => api.get('/email-hub/analytics'),
  getJobs: (params = {}) => api.get('/email-hub/jobs', { params }),
};

export default emailHubApi;
