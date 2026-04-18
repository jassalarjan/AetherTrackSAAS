import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  Plus,
  Trash2,
  Edit3,
  X,
  Clock,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Filter,
  Search,
  History,
  CheckCircle2,
  XCircle,
  CalendarClock,
  FileBarChart2,
  Send,
  Play,
  ArrowRight,
  Library,
  Puzzle,
  FlaskConical,
  Layers3,
  TrendingUp,
  LayoutGrid,
  Radar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import emailHubApi from '../services/emailHubApi';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/features/auth/context/AuthContext';

const createDefaultEventForm = () => ({
  name: '',
  description: '',
  status: 'draft',
  trigger: {
    type: 'changelog',
    changelogTriggerId: '',
    filters: [],
    schedule: { frequency: 'weekly', time: '09:00', dayOfWeek: 1, dayOfMonth: 1, cronExpression: '' }
  },
  actions: [{
    type: 'send_email',
    templateId: '',
    recipientType: 'custom_list',
    customRecipients: [],
    subjectOverride: '',
    variables: {}
  }],
  conditions: []
});

const createDefaultReportForm = () => ({
  name: '',
  reportType: 'project_summary',
  status: 'draft',
  schedule: { frequency: 'monthly', dayOfMonth: 1, dayOfWeek: 1, time: '09:00' },
  reportConfig: {
    includeProjectStats: true,
    includeTaskMetrics: true,
    includeTeamActivity: true,
    includeMilestones: false,
    includeOverdueTasks: true,
    dateRangeType: 'last_month',
    customDateFrom: '',
    customDateTo: '',
    projectFilter: [],
    groupBy: 'project'
  },
  recipients: [{ email: '', name: '' }],
  emailConfig: {
    subject: '{{month}} Report — AetherTrack',
    headerNote: '',
    footerNote: ''
  }
});

const normalizeRuleRows = (rows = []) => (
  Array.isArray(rows)
    ? rows
        .filter((row) => row && String(row.field || '').trim())
        .map((row) => ({
          field: String(row.field).trim(),
          operator: row.operator || 'eq',
          value: row.value ?? ''
        }))
    : []
);

const normalizeEventForm = (input = {}, { forSave = false } = {}) => {
  const base = createDefaultEventForm();
  const source = input || {};

  const trigger = {
    ...base.trigger,
    ...(source.trigger || {}),
    schedule: {
      ...base.trigger.schedule,
      ...(source.trigger?.schedule || {})
    },
    filters: normalizeRuleRows(source.trigger?.filters)
  };

  const actionSource = Array.isArray(source.actions) && source.actions.length > 0
    ? source.actions[0]
    : base.actions[0];

  const customRecipients = Array.isArray(actionSource.customRecipients)
    ? actionSource.customRecipients.map((email) => String(email || '').trim()).filter(Boolean)
    : [];

  const action = {
    ...base.actions[0],
    ...(actionSource || {}),
    customRecipients: actionSource?.recipientType === 'custom_list' ? customRecipients : []
  };

  const normalized = {
    ...base,
    ...source,
    trigger,
    actions: [action],
    conditions: normalizeRuleRows(source.conditions)
  };

  if (forSave && normalized.trigger.type !== 'changelog') {
    normalized.trigger.changelogTriggerId = '';
  }

  return normalized;
};

const normalizeReportForm = (input = {}, { forSave = false } = {}) => {
  const base = createDefaultReportForm();
  const source = input || {};

  const recipientsRaw = Array.isArray(source.recipients) ? source.recipients : base.recipients;
  const recipients = recipientsRaw
    .map((recipient) => ({
      email: String(recipient?.email || '').trim(),
      name: String(recipient?.name || '').trim()
    }))
    .filter((recipient) => recipient.email || (!forSave && recipient.name));

  return {
    ...base,
    ...source,
    schedule: {
      ...base.schedule,
      ...(source.schedule || {})
    },
    reportConfig: {
      ...base.reportConfig,
      ...(source.reportConfig || {})
    },
    emailConfig: {
      ...base.emailConfig,
      ...(source.emailConfig || source.emailTemplate || {})
    },
    recipients: forSave ? recipients : (recipients.length ? recipients : base.recipients)
  };
};

const simplifyReportPreview = (reportData = {}) => {
  if (!reportData) return null;
  return {
    dateRange: reportData?.dateRange?.label || '-',
    projectStats: reportData.projectStats,
    taskMetrics: reportData.taskMetrics,
    teamActivity: reportData.teamActivity || [],
    milestones: reportData.milestones || [],
    overdueTasks: reportData.overdueTasks || []
  };
};

export default function AutomationPane() {
  const { socket } = useAuth();
  const toast = useToast();
  const loadErrorToastShownRef = useRef(false);

  const [triggerTypes, setTriggerTypes] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [reportAutomations, setReportAutomations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showEventBuilder, setShowEventBuilder] = useState(false);
  const [eventStep, setEventStep] = useState(1);
  const [editingAutomationId, setEditingAutomationId] = useState(null);

  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [editingReportId, setEditingReportId] = useState(null);

  const [historyAutomationId, setHistoryAutomationId] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyExpandedId, setHistoryExpandedId] = useState(null);

  const [activeAutomationSection, setActiveAutomationSection] = useState('event');
  const [testPopover, setTestPopover] = useState({ type: null, id: null });
  const [eventListTestRecipient, setEventListTestRecipient] = useState('');
  const [reportListTestRecipient, setReportListTestRecipient] = useState('');
  const [reportListUseMockData, setReportListUseMockData] = useState(true);
  const [testFeedback, setTestFeedback] = useState({});

  const [eventBuilderTestRecipient, setEventBuilderTestRecipient] = useState('');
  const [eventBuilderMockMode, setEventBuilderMockMode] = useState('auto');
  const [eventBuilderCustomMockJson, setEventBuilderCustomMockJson] = useState('');
  const [eventBuilderTestResult, setEventBuilderTestResult] = useState(null);

  const [reportBuilderTestRecipient, setReportBuilderTestRecipient] = useState('');
  const [reportBuilderUseMockData, setReportBuilderUseMockData] = useState(true);
  const [reportBuilderPreviewData, setReportBuilderPreviewData] = useState(null);
  const [reportBuilderTestResult, setReportBuilderTestResult] = useState(null);

  const [reportPreviewPanel, setReportPreviewPanel] = useState({ open: false, title: '', data: null });

  const [eventForm, setEventForm] = useState(createDefaultEventForm());

  const [reportForm, setReportForm] = useState(createDefaultReportForm());

  const [saving, setSaving] = useState(false);

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl._id === eventForm.actions[0]?.templateId),
    [templates, eventForm.actions]
  );

  const renderOverlay = (node) => {
    if (typeof document === 'undefined') return null;
    return createPortal(node, document.body);
  };

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [triggerRes, templateList, automationRes, reportRes] = await Promise.allSettled([
          emailHubApi.getTriggerTypes(),
          emailHubApi.getTemplatesList(),
          emailHubApi.getAutomations(),
          emailHubApi.getReportAutomations()
        ]);

        if (isCancelled) return;

        if (triggerRes.status === 'fulfilled') {
          setTriggerTypes(triggerRes.value?.data || []);
        } else {
          setTriggerTypes([]);
        }

        if (templateList.status === 'fulfilled') {
          setTemplates(templateList.value || []);
        } else {
          setTemplates([]);
        }

        if (automationRes.status === 'fulfilled') {
          setAutomations(automationRes.value?.data?.items || []);
        } else {
          setAutomations([]);
        }

        if (reportRes.status === 'fulfilled') {
          setReportAutomations(reportRes.value?.data?.items || []);
        } else {
          setReportAutomations([]);
        }

        const failures = [triggerRes, templateList, automationRes, reportRes].filter((r) => r.status === 'rejected').length;
        if (failures > 0 && !loadErrorToastShownRef.current) {
          loadErrorToastShownRef.current = true;
          toast.error('Automation Load Incomplete', `Some automation data failed to load (${failures}/4).`);
        }
      } catch {
        if (!isCancelled && !loadErrorToastShownRef.current) {
          loadErrorToastShownRef.current = true;
          toast.error('Automation Load Failed', 'Unable to load automation data.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onTriggered = (payload) => {
      setAutomations((prev) => prev.map((item) => (
        String(item._id) === String(payload.automationId)
          ? { ...item, lastRun: new Date().toISOString() }
          : item
      )));
    };

    const onCompleted = (payload) => {
      setAutomations((prev) => prev.map((item) => (
        String(item._id) === String(payload.automationId)
          ? {
              ...item,
              lastRun: payload.lastRun || new Date().toISOString(),
              runCount: (item.runCount || 0) + 1
            }
          : item
      )));
    };

    const onReportCompleted = (payload) => {
      setReportAutomations((prev) => prev.map((item) => (
        String(item._id) === String(payload.reportId)
          ? {
              ...item,
              lastRun: payload.runAt || new Date().toISOString(),
              runCount: payload.status === 'success' ? (Number(item.runCount || 0) + 1) : Number(item.runCount || 0)
            }
          : item
      )));

      if (payload.status === 'success') {
        toast.success('Report Sent', `📊 ${payload.reportName || 'Report automation'} sent to ${payload.recipientCount || 0} recipients`);
      }
    };

    socket.on('automation:triggered', onTriggered);
    socket.on('automation:completed', onCompleted);
    socket.on('report:completed', onReportCompleted);

    return () => {
      socket.off('automation:triggered', onTriggered);
      socket.off('automation:completed', onCompleted);
      socket.off('report:completed', onReportCompleted);
    };
  }, [socket, toast]);

  const filteredAutomations = useMemo(() => {
    return automations.filter((item) => {
      const statusOk = statusFilter === 'all' ? true : item.status === statusFilter;
      const triggerOk = triggerFilter === 'all' ? true : item.trigger?.type === triggerFilter;
      const searchOk = search
        ? String(item.name || '').toLowerCase().includes(search.toLowerCase())
        : true;
      return statusOk && triggerOk && searchOk;
    });
  }, [automations, statusFilter, triggerFilter, search]);

  const hasActiveEventFilters = statusFilter !== 'all' || triggerFilter !== 'all' || Boolean(search.trim());

  const eventMetrics = useMemo(() => {
    const totalRuns = automations.reduce((sum, item) => sum + Number(item.runCount || 0), 0);
    return {
      total: automations.length,
      active: automations.filter((item) => item.status === 'active').length,
      scheduled: automations.filter((item) => item.trigger?.type === 'schedule').length,
      runs: totalRuns,
      visible: filteredAutomations.length
    };
  }, [automations, filteredAutomations]);

  const reportMetrics = useMemo(() => {
    const totalRuns = reportAutomations.reduce((sum, item) => sum + Number(item.runCount || 0), 0);
    return {
      total: reportAutomations.length,
      active: reportAutomations.filter((item) => item.status === 'active').length,
      monthly: reportAutomations.filter((item) => item.schedule?.frequency === 'monthly').length,
      runs: totalRuns
    };
  }, [reportAutomations]);

  const activeEventTestItem = useMemo(
    () => (testPopover.type === 'event' ? automations.find((item) => String(item._id) === String(testPopover.id)) : null),
    [automations, testPopover]
  );

  const activeReportTestItem = useMemo(
    () => (testPopover.type === 'report' ? reportAutomations.find((item) => String(item._id) === String(testPopover.id)) : null),
    [reportAutomations, testPopover]
  );

  const resetEventBuilder = () => {
    setEditingAutomationId(null);
    setEventStep(1);
    setEventForm(createDefaultEventForm());
    setEventBuilderTestRecipient('');
    setEventBuilderMockMode('auto');
    setEventBuilderCustomMockJson('');
    setEventBuilderTestResult(null);
  };

  const resetReportBuilder = () => {
    setEditingReportId(null);
    setReportStep(1);
    setReportForm(createDefaultReportForm());
    setReportBuilderTestRecipient('');
    setReportBuilderUseMockData(true);
    setReportBuilderPreviewData(null);
    setReportBuilderTestResult(null);
  };

  const validateEventStep = (step) => {
    if (step === 1) {
      if (!eventForm.name.trim()) return 'Automation name is required.';
      if (eventForm.trigger.type === 'changelog' && !eventForm.trigger.changelogTriggerId) {
        return 'Select a changelog trigger type.';
      }
      if (eventForm.trigger.type === 'schedule' && !eventForm.trigger.schedule?.time) {
        return 'Schedule time is required.';
      }
    }

    if (step === 2) {
      if (!eventForm.actions[0]?.templateId) return 'Select an email template.';
      if (eventForm.actions[0]?.recipientType === 'custom_list' && eventForm.actions[0]?.customRecipients?.length === 0) {
        return 'Add at least one custom recipient.';
      }
    }

    return null;
  };

  const validateReportStep = (step) => {
    if (step === 1 && !reportForm.name.trim()) return 'Report name is required.';
    if (step === 2) {
      if (!reportForm.schedule?.time) return 'Schedule time is required.';
      if (reportForm.schedule?.frequency === 'weekly' && (reportForm.schedule?.dayOfWeek == null || Number.isNaN(Number(reportForm.schedule?.dayOfWeek)))) {
        return 'Pick day of week for weekly schedule.';
      }
      if (reportForm.schedule?.frequency === 'monthly' && (!reportForm.schedule?.dayOfMonth || reportForm.schedule.dayOfMonth < 1 || reportForm.schedule.dayOfMonth > 28)) {
        return 'Day of month must be between 1 and 28.';
      }
    }
    if (step === 3 && reportForm.reportConfig.dateRangeType === 'custom') {
      if (!reportForm.reportConfig.customDateFrom || !reportForm.reportConfig.customDateTo) return 'Custom date range requires both from and to dates.';
      if (new Date(reportForm.reportConfig.customDateFrom) >= new Date(reportForm.reportConfig.customDateTo)) return 'Custom from date must be earlier than to date.';
    }
    if (step === 4 && !reportForm.recipients.some((r) => r.email)) return 'Add at least one recipient email.';
    return null;
  };

  const persistEventAutomation = async () => {
    try {
      setSaving(true);
      const payload = normalizeEventForm(eventForm, { forSave: true });
      if (editingAutomationId) {
        await emailHubApi.updateAutomation(editingAutomationId, payload);
        toast.success('Automation Updated', 'Automation configuration was saved.');
      } else {
        await emailHubApi.createAutomation(payload);
        toast.success('Automation Created', 'New automation has been created.');
      }

      const response = await emailHubApi.getAutomations();
      setAutomations(response?.data?.items || []);
      setShowEventBuilder(false);
      resetEventBuilder();
    } catch {
      toast.error('Save Failed', 'Unable to save automation.');
    } finally {
      setSaving(false);
    }
  };

  const persistReportAutomation = async () => {
    try {
      setSaving(true);
      const payload = normalizeReportForm(reportForm, { forSave: true });
      if (editingReportId) {
        await emailHubApi.updateReportAutomation(editingReportId, payload);
        toast.success('Report Automation Updated', 'Report automation has been updated.');
      } else {
        await emailHubApi.createReportAutomation(payload);
        toast.success('Report Automation Created', 'Report automation has been created.');
      }

      const response = await emailHubApi.getReportAutomations();
      setReportAutomations(response?.data?.items || []);
      setShowReportBuilder(false);
      resetReportBuilder();
    } catch {
      toast.error('Save Failed', 'Unable to save report automation.');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (automationId) => {
    try {
      const { data } = await emailHubApi.getAutomationHistory(automationId);
      setHistoryRows(data || []);
      setHistoryAutomationId(automationId);
      setHistoryExpandedId(null);
    } catch {
      toast.error('History Load Failed', 'Could not load execution history.');
    }
  };

  const openReportHistory = async (reportId) => {
    try {
      const { data } = await emailHubApi.getReportAutomationHistory(reportId);
      setHistoryRows(data || []);
      setHistoryAutomationId(reportId);
      setHistoryExpandedId(null);
    } catch {
      toast.error('History Load Failed', 'Could not load report history.');
    }
  };

  const toggleAutomation = async (automationId) => {
    try {
      await emailHubApi.toggleAutomation(automationId);
      const response = await emailHubApi.getAutomations();
      setAutomations(response?.data?.items || []);
      toast.success('Automation Updated', 'Automation status has been toggled.');
    } catch {
      toast.error('Action Failed', 'Could not toggle automation status.');
    }
  };

  const deleteAutomation = async (automationId) => {
    if (!window.confirm('Delete this automation?')) return;
    try {
      await emailHubApi.deleteAutomation(automationId);
      setAutomations((prev) => prev.filter((item) => String(item._id) !== String(automationId)));
      toast.success('Automation Deleted', 'Automation removed successfully.');
    } catch {
      toast.error('Delete Failed', 'Could not delete automation.');
    }
  };

  const deleteReportAutomation = async (automationId) => {
    if (!window.confirm('Delete this report automation?')) return;
    try {
      await emailHubApi.deleteReportAutomation(automationId);
      setReportAutomations((prev) => prev.filter((item) => String(item._id) !== String(automationId)));
      toast.success('Report Automation Deleted', 'Report automation removed successfully.');
    } catch {
      toast.error('Delete Failed', 'Could not delete report automation.');
    }
  };

  const sendReportNow = async (automationId) => {
    try {
      await emailHubApi.sendReportNow(automationId);
      toast.success('Send Triggered', 'Manual report send has been triggered.');
      const response = await emailHubApi.getReportAutomations();
      setReportAutomations(response?.data?.items || []);
    } catch {
      toast.error('Send Failed', 'Could not trigger report send.');
    }
  };

  const runRowEventTest = async (automationId) => {
    try {
      if (!eventListTestRecipient.trim()) {
        toast.warning('Test Recipient Required', 'Enter a recipient email for the test run.');
        return;
      }
      const { data } = await emailHubApi.testAutomation(automationId, { testRecipient: eventListTestRecipient.trim() });
      setTestFeedback((prev) => ({
        ...prev,
        [automationId]: {
          ok: true,
          message: data?.renderedSubject || 'Test sent successfully',
          at: Date.now()
        }
      }));
    } catch (error) {
      setTestFeedback((prev) => ({
        ...prev,
        [automationId]: {
          ok: false,
          message: error?.response?.data?.message || 'Test failed',
          at: Date.now()
        }
      }));
    }
  };

  const runRowReportTest = async (reportId) => {
    try {
      if (!reportListTestRecipient.trim()) {
        toast.warning('Test Recipient Required', 'Enter a recipient email for the test run.');
        return;
      }

      const { data } = await emailHubApi.testReportAutomation(reportId, {
        testRecipient: reportListTestRecipient.trim(),
        useMockData: reportListUseMockData
      });

      setTestFeedback((prev) => ({
        ...prev,
        [reportId]: {
          ok: true,
          message: data?.renderedSubject || 'Report test sent successfully',
          at: Date.now()
        }
      }));
    } catch (error) {
      setTestFeedback((prev) => ({
        ...prev,
        [reportId]: {
          ok: false,
          message: error?.response?.data?.message || 'Test failed',
          at: Date.now()
        }
      }));
    }
  };

  const testEventBuilder = async () => {
    try {
      if (!eventBuilderTestRecipient.trim()) {
        toast.warning('Test Recipient Required', 'Enter a test recipient before sending.');
        return;
      }

      let mockChangelogData = null;
      if (eventBuilderMockMode === 'custom') {
        try {
          mockChangelogData = JSON.parse(eventBuilderCustomMockJson || '{}');
        } catch {
          toast.warning('Invalid JSON', 'Custom mock payload must be valid JSON.');
          return;
        }
      }

      let response;
      if (editingAutomationId) {
        response = await emailHubApi.testAutomation(editingAutomationId, {
          testRecipient: eventBuilderTestRecipient.trim(),
          mockChangelogData
        });
      } else {
        response = await emailHubApi.testAutomationDraft({
          testRecipient: eventBuilderTestRecipient.trim(),
          mockChangelogData,
          automation: normalizeEventForm(eventForm, { forSave: true })
        });
      }

      setEventBuilderTestResult(response?.data || null);
      toast.success('Test Sent', 'Automation test email sent successfully.');
    } catch (error) {
      toast.error('Test Failed', error?.response?.data?.message || 'Could not send test email.');
    }
  };

  const previewReportFromBuilder = async () => {
    try {
      if (!editingReportId) {
        toast.info('Save First', 'Save this report automation before previewing real data.');
        return;
      }
      const { data } = await emailHubApi.previewReportAutomation(editingReportId);
      setReportBuilderPreviewData(simplifyReportPreview(data));
    } catch {
      toast.error('Preview Failed', 'Could not generate preview data.');
    }
  };

  const testReportFromBuilder = async () => {
    try {
      if (!editingReportId) {
        toast.info('Save First', 'Save this report automation before sending a test.');
        return;
      }
      if (!reportBuilderTestRecipient.trim()) {
        toast.warning('Test Recipient Required', 'Enter a test recipient email before sending.');
        return;
      }

      const { data } = await emailHubApi.testReportAutomation(editingReportId, {
        testRecipient: reportBuilderTestRecipient.trim(),
        useMockData: reportBuilderUseMockData
      });

      setReportBuilderTestResult(data);
      toast.success('Test Sent', 'Report test email sent successfully.');
    } catch (error) {
      toast.error('Test Failed', error?.response?.data?.message || 'Could not send report test email.');
    }
  };

  const openReportPreviewPanel = async (report) => {
    try {
      const { data } = await emailHubApi.previewReportAutomation(report._id);
      setReportPreviewPanel({ open: true, title: report.name, data: simplifyReportPreview(data) });
    } catch {
      toast.error('Preview Failed', 'Could not generate report preview.');
    }
  };

  const addRecipient = () => {
    setReportForm((prev) => ({
      ...prev,
      recipients: [...prev.recipients, { email: '', name: '' }]
    }));
  };

  const reportCards = reportAutomations.map((item) => {
    const nextRunLabel = item.nextRun ? new Date(item.nextRun).toLocaleString() : 'Not scheduled';
    const feedback = testFeedback[item._id];
    return (
      <div key={item._id} className="rounded-2xl border p-5 sm:p-6 space-y-5 relative transition-all duration-200 hover:-translate-y-0.5" style={{ background: 'var(--bg-raised)', borderColor: 'var(--border-soft)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{item.name}</h4>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.reportType?.replace(/_/g, ' ')}</p>
          </div>
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>{item.status}</span>
        </div>

        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <p>Next Run: {nextRunLabel}</p>
          <p>Recipients: {item.recipients?.length || 0}</p>
          <p>Last Run: {item.lastRun ? new Date(item.lastRun).toLocaleString() : 'Never'} | Runs: {item.runCount || 0}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}
            onClick={() => openReportPreviewPanel(item)}
          >
            Preview Data
          </button>
          <button
            type="button"
            className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}
            onClick={() => setTestPopover(testPopover.type === 'report' && testPopover.id === item._id ? { type: null, id: null } : { type: 'report', id: item._id })}
          >
            Send Test
          </button>
          <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => sendReportNow(item._id)}>
            <Send size={14} />
          </button>
          <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => openReportHistory(item._id)}>
            <History size={14} />
          </button>
          <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={async () => {
            await emailHubApi.toggleReportAutomation(item._id);
            const response = await emailHubApi.getReportAutomations();
            setReportAutomations(response?.data?.items || []);
          }}>
            {item.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
          <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--danger)' }} onClick={() => deleteReportAutomation(item._id)}>
            <Trash2 size={14} />
          </button>
        </div>

        {feedback ? (
          <p className="text-[11px]" style={{ color: feedback.ok ? 'var(--success)' : 'var(--danger)' }}>
            {feedback.ok ? '✓' : '✗'} {feedback.message}
          </p>
        ) : null}

      </div>
    );
  });

  const hasOpenOverlay = showEventBuilder || showReportBuilder || reportPreviewPanel.open || Boolean(historyAutomationId) || testPopover.type !== null;

  if (loading && !hasOpenOverlay) {
    return (
      <div className="h-full p-10" style={{ background: 'var(--bg-base)' }}>
        <div className="animate-pulse rounded-2xl h-28" style={{ background: 'var(--bg-surface)' }} />
        <div className="mt-4 animate-pulse rounded-2xl h-64" style={{ background: 'var(--bg-surface)' }} />
      </div>
    );
  }

  return (
    <div className="w-full py-2 sm:py-3 pb-28 sm:pb-12" style={{ background: 'transparent' }}>
      <div className="space-y-8 sm:space-y-10">
        <section
          className="relative overflow-hidden rounded-3xl border p-6 sm:p-7 lg:p-8"
          style={{
            borderColor: 'var(--border-soft)',
            background: 'radial-gradient(circle at 82% 22%, var(--brand-dim), transparent 45%), linear-gradient(140deg, var(--bg-raised), var(--bg-surface))'
          }}
        >
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full" style={{ background: 'var(--brand-dim)' }} />
          <div className="absolute -left-14 -bottom-14 h-36 w-36 rounded-full" style={{ background: 'var(--brand-dim)' }} />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                  <Zap size={12} /> Automation Control Center
                </span>
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Advanced Automation Workspace
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Build event-driven workflows and scheduled reporting pipelines with clearer controls, faster testing, and cleaner execution visibility.
                </p>
              </div>
              <div className="rounded-2xl border px-5 py-4 w-full sm:w-auto sm:min-w-[220px]" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                <p className="text-[11px] uppercase font-bold tracking-wide" style={{ color: 'var(--text-muted)' }}>Live Scope</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                  {activeAutomationSection === 'event' ? `${eventMetrics.visible} workflows in view` : `${reportMetrics.total} report flows configured`}
                </p>
                <p className="text-[11px] mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {activeAutomationSection === 'event'
                    ? `${eventMetrics.active} active • ${eventMetrics.runs} total runs`
                    : `${reportMetrics.active} active • ${reportMetrics.runs} total sends`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'total', label: 'Event Workflows', value: eventMetrics.total, icon: Layers3 },
                { key: 'active', label: 'Active Workflows', value: eventMetrics.active, icon: TrendingUp },
                { key: 'report', label: 'Report Pipelines', value: reportMetrics.total, icon: LayoutGrid },
                { key: 'runs', label: 'Total Executions', value: eventMetrics.runs + reportMetrics.runs, icon: Radar }
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.key} className="rounded-2xl border p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] sm:text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{metric.label}</p>
                      <Icon size={14} style={{ color: 'var(--brand)' }} />
                    </div>
                    <p className="mt-2 text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{metric.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="relative lg:sticky lg:top-4 z-20 rounded-2xl border p-3.5 sm:p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
          <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="px-3 py-3 rounded-xl text-sm font-semibold text-left sm:text-center"
            style={{
              color: activeAutomationSection === 'event' ? 'var(--brand)' : 'var(--text-secondary)',
              background: activeAutomationSection === 'event' ? 'var(--brand-dim)' : 'transparent',
              borderBottom: activeAutomationSection === 'event' ? '2px solid var(--brand)' : '2px solid transparent'
            }}
            onClick={() => setActiveAutomationSection('event')}
          >
            <span className="inline-flex items-center gap-1.5">⚡ Event Automations <span className="text-[11px]">({eventMetrics.visible})</span></span>
          </button>
          <button
            type="button"
            className="px-3 py-3 rounded-xl text-sm font-semibold text-left sm:text-center"
            style={{
              color: activeAutomationSection === 'report' ? 'var(--brand)' : 'var(--text-secondary)',
              background: activeAutomationSection === 'report' ? 'var(--brand-dim)' : 'transparent',
              borderBottom: activeAutomationSection === 'report' ? '2px solid var(--brand)' : '2px solid transparent'
            }}
            onClick={() => setActiveAutomationSection('report')}
          >
            <span className="inline-flex items-center gap-1.5">📊 Report Automations <span className="text-[11px]">({reportMetrics.total})</span></span>
          </button>
        </div>
        </div>

      {activeAutomationSection === 'event' && (
      <section className="mt-1 rounded-3xl border p-5 sm:p-7 lg:p-8 space-y-6 sm:space-y-7" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Event Automations</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Build trigger-driven workflows from changelog and schedules.</p>
          </div>
          <button
            type="button"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 4px 14px var(--brand-dim)' }}
            onClick={() => {
              resetEventBuilder();
              setShowEventBuilder(true);
            }}
          >
            <Plus size={14} /> New Automation
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Total Workflows</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{eventMetrics.total}</p>
          </div>
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Active</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{eventMetrics.active}</p>
          </div>
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Scheduled</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{eventMetrics.scheduled}</p>
          </div>
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Total Runs</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{eventMetrics.runs}</p>
          </div>
        </div>

        <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div className="relative w-full lg:max-w-sm">
              <Search size={14} className="absolute left-3.5 top-3" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search automations"
                className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm"
                style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="inline-flex flex-wrap items-center justify-end gap-2.5 w-full lg:w-auto">
              <span className="inline-flex items-center justify-center rounded-lg p-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
                <Filter size={13} style={{ color: 'var(--text-muted)' }} />
              </span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-xs w-full sm:w-auto sm:min-w-[130px]" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
              <select value={triggerFilter} onChange={(e) => setTriggerFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-xs w-full sm:w-auto sm:min-w-[155px]" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                <option value="all">All Trigger Types</option>
                <option value="changelog">Changelog</option>
                <option value="schedule">Schedule</option>
              </select>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Showing {filteredAutomations.length} of {automations.length} automations
            </p>
            {hasActiveEventFilters ? (
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
                style={{ borderColor: 'var(--border-soft)', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}
                onClick={() => {
                  setStatusFilter('all');
                  setTriggerFilter('all');
                  setSearch('');
                }}
              >
                Reset filters
              </button>
            ) : null}
          </div>

          <div className="space-y-4 md:hidden">
            {filteredAutomations.length === 0 ? (
              <div className="rounded-xl border p-5 text-center" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No automations found</p>
                <button
                  className="mt-4 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold"
                  style={{ color: 'var(--brand)', background: 'var(--brand-dim)' }}
                  onClick={() => {
                    resetEventBuilder();
                    setShowEventBuilder(true);
                  }}
                >
                  <Plus size={12} /> Create first automation
                </button>
              </div>
            ) : filteredAutomations.map((item) => (
              <div key={item._id} className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.description || 'No description'}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full uppercase text-[10px] font-bold" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  <p>Trigger: {item.trigger?.type === 'changelog' ? item.trigger?.changelogTriggerId : 'Scheduled'}</p>
                  <p>Runs: {item.runCount || 0}</p>
                  <p>Last: {item.lastRun ? new Date(item.lastRun).toLocaleString() : '-'}</p>
                  <p>Next: {item.nextRun ? new Date(item.nextRun).toLocaleString() : '-'}</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--brand)' }} onClick={() => {
                    setEditingAutomationId(item._id);
                    setEventForm(normalizeEventForm(item));
                    setEventStep(1);
                    setShowEventBuilder(true);
                  }}><Edit3 size={14} /></button>
                  <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => toggleAutomation(item._id)}>
                    {item.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                  <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => openHistory(item._id)}><History size={14} /></button>
                  <button
                    type="button"
                    className="p-2.5 rounded-lg"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setTestPopover(testPopover.type === 'event' && testPopover.id === item._id ? { type: null, id: null } : { type: 'event', id: item._id })}
                  >
                    <FlaskConical size={14} />
                  </button>
                  <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--danger)' }} onClick={() => deleteAutomation(item._id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto overflow-y-visible rounded-xl border" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
                  <th className="py-4 px-4">Name</th>
                  <th className="py-4 px-4">Trigger</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Last Run</th>
                  <th className="py-4 px-4">Next Run</th>
                  <th className="py-4 px-4">Run Count</th>
                  <th className="py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAutomations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-6 text-center" style={{ background: 'var(--bg-raised)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No automations found</p>
                      <button
                        className="mt-4 inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold"
                        style={{ color: 'var(--brand)', background: 'var(--brand-dim)' }}
                        onClick={() => {
                          resetEventBuilder();
                          setShowEventBuilder(true);
                        }}
                      >
                        <Plus size={12} /> Create first automation
                      </button>
                    </td>
                  </tr>
                ) : filteredAutomations.map((item) => (
                  <tr key={item._id} className="border-t" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
                    <td className="py-4 px-4">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p style={{ color: 'var(--text-muted)' }}>{item.description || 'No description'}</p>
                    </td>
                    <td className="py-4 px-4" style={{ color: 'var(--text-secondary)' }}>
                      {item.trigger?.type === 'changelog' ? item.trigger?.changelogTriggerId : 'Scheduled'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full uppercase text-[10px] font-bold" style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4" style={{ color: 'var(--text-secondary)' }}>{item.lastRun ? new Date(item.lastRun).toLocaleString() : '-'}</td>
                    <td className="py-4 px-4" style={{ color: 'var(--text-secondary)' }}>{item.nextRun ? new Date(item.nextRun).toLocaleString() : '-'}</td>
                    <td className="py-4 px-4" style={{ color: 'var(--text-secondary)' }}>{item.runCount || 0}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 relative">
                        <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--brand)' }} onClick={() => {
                          setEditingAutomationId(item._id);
                          setEventForm(normalizeEventForm(item));
                          setEventStep(1);
                          setShowEventBuilder(true);
                        }}><Edit3 size={13} /></button>
                        <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => toggleAutomation(item._id)}>
                          {item.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }} onClick={() => openHistory(item._id)}><History size={13} /></button>
                        <button
                          type="button"
                          className="p-2.5 rounded-lg"
                          style={{ color: 'var(--text-muted)' }}
                          onClick={() => setTestPopover(testPopover.type === 'event' && testPopover.id === item._id ? { type: null, id: null } : { type: 'event', id: item._id })}
                        >
                          <FlaskConical size={13} />
                        </button>
                        <button type="button" className="p-2.5 rounded-lg" style={{ color: 'var(--danger)' }} onClick={() => deleteAutomation(item._id)}><Trash2 size={13} /></button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Library size={15} style={{ color: 'var(--brand)' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Trigger Library</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {triggerTypes.map((trigger) => (
              <div key={trigger.id} className="rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{trigger.label}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{trigger.description}</p>
                  </div>
                  <Puzzle size={14} style={{ color: 'var(--brand)' }} />
                </div>
                <button
                  className="mt-4 px-3.5 py-2.5 rounded-lg text-xs font-semibold border"
                  style={{ borderColor: 'var(--border-soft)', color: 'var(--brand)', background: 'var(--brand-dim)' }}
                  onClick={() => {
                    const next = createDefaultEventForm();
                    next.trigger.changelogTriggerId = trigger.id;
                    setEditingAutomationId(null);
                    setEventForm(next);
                    setShowEventBuilder(true);
                    setEventStep(1);
                  }}
                >
                  + Use Trigger
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {testPopover.type === 'event' && activeEventTestItem && renderOverlay(
        <div className="fixed inset-0 bg-black/20 flex items-end sm:items-end justify-center sm:justify-end p-4 sm:p-5" style={{ zIndex: 'var(--z-modal, 2147483000)' }}>
          <div className="w-full max-w-sm rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Test Event Automation</p>
              <button type="button" className="p-1 rounded" style={{ color: 'var(--text-muted)' }} onClick={() => setTestPopover({ type: null, id: null })}>
                <X size={14} />
              </button>
            </div>
            <input
              className="mt-3 w-full rounded-lg border px-3 py-2.5 text-xs"
              style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)' }}
              placeholder="Send to email@company.com"
              value={eventListTestRecipient}
              onChange={(e) => setEventListTestRecipient(e.target.value)}
            />
            <button className="mt-4 px-3.5 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--border-soft)' }} onClick={() => runRowEventTest(activeEventTestItem._id)}>
              Run Test
            </button>
            {testFeedback[activeEventTestItem._id] ? (
              <p className="mt-2 text-[11px]" style={{ color: testFeedback[activeEventTestItem._id].ok ? 'var(--success)' : 'var(--danger)' }}>
                {testFeedback[activeEventTestItem._id].ok ? '✓' : '✗'} {testFeedback[activeEventTestItem._id].message}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {testPopover.type === 'report' && activeReportTestItem && renderOverlay(
        <div className="fixed inset-0 bg-black/20 flex items-end sm:items-end justify-center sm:justify-end p-4 sm:p-5" style={{ zIndex: 'var(--z-modal, 2147483000)' }}>
          <div className="w-full max-w-sm rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Test Report Automation</p>
              <button type="button" className="p-1 rounded" style={{ color: 'var(--text-muted)' }} onClick={() => setTestPopover({ type: null, id: null })}>
                <X size={14} />
              </button>
            </div>
            <input
              className="mt-3 w-full rounded-lg border px-3 py-2.5 text-xs"
              style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)' }}
              placeholder="Send to email@company.com"
              value={reportListTestRecipient}
              onChange={(e) => setReportListTestRecipient(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <label className="inline-flex items-center gap-1"><input type="radio" checked={reportListUseMockData} onChange={() => setReportListUseMockData(true)} /> Use mock data</label>
              <label className="inline-flex items-center gap-1"><input type="radio" checked={!reportListUseMockData} onChange={() => setReportListUseMockData(false)} /> Use real data</label>
            </div>
            <button className="mt-4 px-3.5 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--border-soft)' }} onClick={() => runRowReportTest(activeReportTestItem._id)}>
              Run Test
            </button>
            {testFeedback[activeReportTestItem._id] ? (
              <p className="mt-2 text-[11px]" style={{ color: testFeedback[activeReportTestItem._id].ok ? 'var(--success)' : 'var(--danger)' }}>
                {testFeedback[activeReportTestItem._id].ok ? '✓' : '✗'} {testFeedback[activeReportTestItem._id].message}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {activeAutomationSection === 'report' && (
      <section className="mt-1 rounded-3xl border p-5 sm:p-7 lg:p-8 space-y-6 sm:space-y-7" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Report Automations</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Weekly/monthly report pipelines with previews and manual sends.</p>
          </div>
          <button
            type="button"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 4px 14px var(--brand-dim)' }}
            onClick={() => {
              resetReportBuilder();
              setShowReportBuilder(true);
            }}
          >
            <Plus size={14} /> New Report Automation
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Total Pipelines</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{reportMetrics.total}</p>
          </div>
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Active</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{reportMetrics.active}</p>
          </div>
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Monthly</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{reportMetrics.monthly}</p>
          </div>
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Total Sends</p>
            <p className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{reportMetrics.runs}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {reportCards.length > 0 ? reportCards : (
            <div className="col-span-full text-center py-8">
              <FileBarChart2 size={22} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No report automations yet</p>
            </div>
          )}
        </div>
      </section>
      )}

      {showEventBuilder && renderOverlay(
        <div
          className="fixed inset-0 bg-black/30 flex justify-end"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in srgb, var(--text-primary) 65%, transparent)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 'var(--z-modal, 2147483000)'
          }}
        >
          <div
            className="w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-7 lg:p-8"
            style={{
              width: 'min(100%, 48rem)',
              height: '100%',
              overflowY: 'auto',
              background: 'var(--bg-raised)'
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                {editingAutomationId ? 'Edit Event Automation' : 'New Event Automation'}
              </h3>
              <button type="button" onClick={() => setShowEventBuilder(false)} className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <div className="mt-4 flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {[1, 2, 3].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full" style={{ background: eventStep === s ? 'var(--brand-dim)' : 'var(--bg-surface)', color: eventStep === s ? 'var(--brand)' : 'var(--text-muted)' }}>
                  Step {s}
                </span>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              {eventStep === 1 && (
                <>
                  <input
                    value={eventForm.name}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Automation name"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description"
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />

                  <select
                    value={eventForm.trigger.type}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, trigger: { ...prev.trigger, type: e.target.value } }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  >
                    <option value="changelog">Event-based (Changelog)</option>
                    <option value="schedule">Scheduled</option>
                  </select>

                  {eventForm.trigger.type === 'changelog' ? (
                    <select
                      value={eventForm.trigger.changelogTriggerId}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, trigger: { ...prev.trigger, changelogTriggerId: e.target.value } }))}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm"
                      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select trigger type</option>
                      {triggerTypes.map((trigger) => <option key={trigger.id} value={trigger.id}>{trigger.label}</option>)}
                    </select>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={eventForm.trigger.schedule.frequency}
                        onChange={(e) => setEventForm((prev) => ({ ...prev, trigger: { ...prev.trigger, schedule: { ...prev.trigger.schedule, frequency: e.target.value } } }))}
                        className="rounded-xl border px-3 py-2.5 text-sm"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom_cron">Custom Cron</option>
                      </select>
                      <input
                        type="time"
                        value={eventForm.trigger.schedule.time}
                        onChange={(e) => setEventForm((prev) => ({ ...prev, trigger: { ...prev.trigger, schedule: { ...prev.trigger.schedule, time: e.target.value } } }))}
                        className="rounded-xl border px-3 py-2.5 text-sm"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}
                </>
              )}

              {eventStep === 2 && (
                <>
                  <select
                    value={eventForm.actions[0]?.templateId || ''}
                    onChange={(e) => setEventForm((prev) => ({
                      ...prev,
                      actions: [{ ...prev.actions[0], templateId: e.target.value }]
                    }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Select email template</option>
                    {templates.map((tpl) => <option key={tpl._id} value={tpl._id}>{tpl.name}</option>)}
                  </select>

                  <select
                    value={eventForm.actions[0]?.recipientType || 'custom_list'}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, actions: [{ ...prev.actions[0], recipientType: e.target.value }] }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  >
                    <option value="trigger_actor">Trigger Actor</option>
                    <option value="assignee">Assignee</option>
                    <option value="project_members">Project Members</option>
                    <option value="custom_list">Custom List</option>
                  </select>

                  {eventForm.actions[0]?.recipientType === 'custom_list' && (
                    <input
                      placeholder="Comma-separated recipient emails"
                      value={(eventForm.actions[0]?.customRecipients || []).join(', ')}
                      onChange={(e) => setEventForm((prev) => ({
                        ...prev,
                        actions: [{ ...prev.actions[0], customRecipients: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }]
                      }))}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm"
                      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  )}

                  <input
                    placeholder="Optional subject override"
                    value={eventForm.actions[0]?.subjectOverride || ''}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, actions: [{ ...prev.actions[0], subjectOverride: e.target.value }] }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />

                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Template Variables</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(activeTemplate?.variables || []).map((variable) => (
                        <span key={variable} className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ color: 'var(--brand)', background: 'var(--brand-dim)' }}>
                          {String(variable)}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {eventStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Name: <strong style={{ color: 'var(--text-primary)' }}>{eventForm.name || '-'}</strong></p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Trigger: <strong style={{ color: 'var(--text-primary)' }}>{eventForm.trigger.type === 'changelog' ? eventForm.trigger.changelogTriggerId : `${eventForm.trigger.schedule.frequency} @ ${eventForm.trigger.schedule.time}`}</strong></p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Template: <strong style={{ color: 'var(--text-primary)' }}>{templates.find((tpl) => tpl._id === eventForm.actions[0]?.templateId)?.name || '-'}</strong></p>
                    <div className="pt-1">
                      <label className="text-xs mr-2" style={{ color: 'var(--text-secondary)' }}>Activate immediately</label>
                      <input
                        type="checkbox"
                        checked={eventForm.status === 'active'}
                        onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'draft' }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>🧪 Test This Automation</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Send a test email to verify rendering before activation.</p>
                    <input
                      className="mt-3 w-full rounded-lg border px-3.5 py-2.5 text-xs"
                      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)' }}
                      placeholder="Test recipient"
                      value={eventBuilderTestRecipient}
                      onChange={(e) => setEventBuilderTestRecipient(e.target.value)}
                    />
                    <div className="mt-3 flex items-center gap-3.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      <label><input type="radio" checked={eventBuilderMockMode === 'auto'} onChange={() => setEventBuilderMockMode('auto')} /> Auto-generate</label>
                      <label><input type="radio" checked={eventBuilderMockMode === 'custom'} onChange={() => setEventBuilderMockMode('custom')} /> Custom</label>
                    </div>
                    {eventBuilderMockMode === 'custom' && (
                      <textarea
                        rows={5}
                        className="mt-3 w-full rounded-lg border px-3.5 py-2.5 text-[11px]"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)' }}
                        placeholder='{"entityType":"task","action":"status_changed"}'
                        value={eventBuilderCustomMockJson}
                        onChange={(e) => setEventBuilderCustomMockJson(e.target.value)}
                      />
                    )}
                    <button className="mt-4 px-3.5 py-2.5 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--border-soft)' }} onClick={testEventBuilder}>
                      Send Test Email
                    </button>
                    {eventBuilderTestResult ? (
                      <p className="mt-2 text-[11px]" style={{ color: 'var(--success)' }}>
                        ✓ Test sent. Subject: {eventBuilderTestResult.renderedSubject}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-5 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-soft)' }}>
              <button
                className="px-4 py-2.5 rounded-lg text-xs font-semibold w-full sm:w-auto"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}
                onClick={() => setEventStep((prev) => Math.max(prev - 1, 1))}
              >
                Back
              </button>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {eventStep < 3 ? (
                  <button
                    className="px-4 py-2.5 rounded-lg text-xs font-bold text-white w-full sm:w-auto"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                    onClick={() => {
                      const error = validateEventStep(eventStep);
                      if (error) {
                        toast.warning('Missing Required Fields', error);
                        return;
                      }
                      setEventStep((prev) => Math.min(prev + 1, 3));
                    }}
                  >
                    Next <ArrowRight size={12} className="inline ml-1" />
                  </button>
                ) : (
                  <button
                    className="px-4 py-2.5 rounded-lg text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                    onClick={persistEventAutomation}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} {editingAutomationId ? 'Update' : 'Create'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportBuilder && renderOverlay(
        <div className="fixed inset-0 bg-black/30 flex justify-end" style={{ zIndex: 'var(--z-modal, 2147483000)' }}>
          <div className="w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-7 lg:p-8" style={{ background: 'var(--bg-raised)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                {editingReportId ? 'Edit Report Automation' : 'New Report Automation'}
              </h3>
              <button onClick={() => setShowReportBuilder(false)} className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <div className="mt-4 flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full" style={{ background: reportStep === s ? 'var(--brand-dim)' : 'var(--bg-surface)', color: reportStep === s ? 'var(--brand)' : 'var(--text-muted)' }}>
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              {reportStep === 1 && (
                <>
                  <input
                    value={reportForm.name}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Report automation name"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['project_summary', 'Project Summary'],
                      ['team_performance', 'Team Performance'],
                      ['task_completion', 'Task Completion'],
                      ['sprint_review', 'Sprint Review'],
                      ['custom', 'Custom']
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className="text-left rounded-xl border px-3 py-2.5 text-sm"
                        style={{
                          borderColor: reportForm.reportType === value ? 'var(--border-mid)' : 'var(--border-soft)',
                          background: reportForm.reportType === value ? 'var(--brand-dim)' : 'var(--bg-surface)',
                          color: reportForm.reportType === value ? 'var(--brand)' : 'var(--text-primary)'
                        }}
                        onClick={() => setReportForm((prev) => ({ ...prev, reportType: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {reportStep === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={reportForm.schedule.frequency}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, schedule: { ...prev.schedule, frequency: e.target.value } }))}
                    className="rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={reportForm.schedule.dayOfMonth}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, schedule: { ...prev.schedule, dayOfMonth: Number(e.target.value) || 1 } }))}
                    className="rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  />
                  <select
                    value={reportForm.schedule.dayOfWeek}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, schedule: { ...prev.schedule, dayOfWeek: Number(e.target.value) } }))}
                    className="rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  >
                    <option value={0}>Sun</option>
                    <option value={1}>Mon</option>
                    <option value={2}>Tue</option>
                    <option value={3}>Wed</option>
                    <option value={4}>Thu</option>
                    <option value={5}>Fri</option>
                    <option value={6}>Sat</option>
                  </select>
                  <input
                    type="time"
                    value={reportForm.schedule.time}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, schedule: { ...prev.schedule, time: e.target.value } }))}
                    className="rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  />
                  <p className="sm:col-span-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Next report will send automatically based on this schedule.
                  </p>
                </div>
              )}

              {reportStep === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['includeProjectStats', 'Include Project Stats'],
                    ['includeTaskMetrics', 'Include Task Metrics'],
                    ['includeTeamActivity', 'Include Team Activity'],
                    ['includeMilestones', 'Include Milestones'],
                    ['includeOverdueTasks', 'Include Overdue Tasks']
                  ].map(([key, label]) => (
                    <label key={key} className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(reportForm.reportConfig[key])}
                        onChange={(e) => setReportForm((prev) => ({
                          ...prev,
                          reportConfig: { ...prev.reportConfig, [key]: e.target.checked }
                        }))}
                      />
                      {label}
                    </label>
                  ))}
                  <select
                    value={reportForm.reportConfig.dateRangeType}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, reportConfig: { ...prev.reportConfig, dateRangeType: e.target.value } }))}
                    className="rounded-xl border px-3 py-2 text-sm sm:col-span-2"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  >
                    <option value="last_month">Last month</option>
                    <option value="last_week">Last week</option>
                    <option value="last_sprint">Last sprint</option>
                    <option value="custom">Custom range</option>
                  </select>
                  {reportForm.reportConfig.dateRangeType === 'custom' && (
                    <>
                      <input
                        type="date"
                        className="rounded-xl border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                        value={reportForm.reportConfig.customDateFrom || ''}
                        onChange={(e) => setReportForm((prev) => ({ ...prev, reportConfig: { ...prev.reportConfig, customDateFrom: e.target.value } }))}
                      />
                      <input
                        type="date"
                        className="rounded-xl border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                        value={reportForm.reportConfig.customDateTo || ''}
                        onChange={(e) => setReportForm((prev) => ({ ...prev, reportConfig: { ...prev.reportConfig, customDateTo: e.target.value } }))}
                      />
                    </>
                  )}
                </div>
              )}

              {reportStep === 4 && (
                <div className="space-y-3">
                  {reportForm.recipients.map((recipient, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        placeholder="Email"
                        value={recipient.email}
                        onChange={(e) => setReportForm((prev) => ({
                          ...prev,
                          recipients: prev.recipients.map((item, i) => i === idx ? { ...item, email: e.target.value } : item)
                        }))}
                        className="rounded-xl border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                      />
                      <input
                        placeholder="Name"
                        value={recipient.name}
                        onChange={(e) => setReportForm((prev) => ({
                          ...prev,
                          recipients: prev.recipients.map((item, i) => i === idx ? { ...item, name: e.target.value } : item)
                        }))}
                        className="rounded-xl border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                      />
                    </div>
                  ))}
                  <button className="px-3.5 py-2.5 rounded-lg text-xs font-semibold" style={{ color: 'var(--brand)', background: 'var(--brand-dim)' }} onClick={addRecipient}>
                    <Plus size={12} className="inline mr-1" /> Add recipient
                  </button>
                </div>
              )}

              {reportStep === 5 && (
                <div className="space-y-4">
                  <input
                    value={reportForm.emailConfig.subject}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, emailConfig: { ...prev.emailConfig, subject: e.target.value } }))}
                    placeholder="Subject"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  />
                  <textarea
                    rows={3}
                    value={reportForm.emailConfig.headerNote}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, emailConfig: { ...prev.emailConfig, headerNote: e.target.value } }))}
                    placeholder="Header note"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  />
                  <textarea
                    rows={3}
                    value={reportForm.emailConfig.footerNote}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, emailConfig: { ...prev.emailConfig, footerNote: e.target.value } }))}
                    placeholder="Footer note"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
                  />

                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>📊 Report Preview</p>
                    <div className="mt-3 flex items-center gap-3">
                      <button className="px-3.5 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--border-soft)' }} onClick={previewReportFromBuilder}>Preview Report Data</button>
                      <button className="px-3.5 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--border-soft)' }} onClick={testReportFromBuilder}>Send Test</button>
                    </div>
                    <div className="mt-3 flex items-center gap-3.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      <label><input type="radio" checked={!reportBuilderUseMockData} onChange={() => setReportBuilderUseMockData(false)} /> Use real data</label>
                      <label><input type="radio" checked={reportBuilderUseMockData} onChange={() => setReportBuilderUseMockData(true)} /> Use mock data</label>
                    </div>
                    <input
                      className="mt-3 w-full rounded-lg border px-3.5 py-2.5 text-xs"
                      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)' }}
                      placeholder="Test recipient email"
                      value={reportBuilderTestRecipient}
                      onChange={(e) => setReportBuilderTestRecipient(e.target.value)}
                    />

                    {reportBuilderPreviewData ? (
                      <div className="mt-4 text-[11px] space-y-2" style={{ color: 'var(--text-secondary)' }}>
                        <p>Date Range: <strong style={{ color: 'var(--text-primary)' }}>{reportBuilderPreviewData.dateRange}</strong></p>
                        {reportBuilderPreviewData.projectStats ? <p>Project Stats Active: {reportBuilderPreviewData.projectStats.totalActiveProjects}</p> : null}
                        {reportBuilderPreviewData.taskMetrics ? <p>Task Created: {reportBuilderPreviewData.taskMetrics.totalCreated} | Completed: {reportBuilderPreviewData.taskMetrics.totalCompleted}</p> : null}
                        {reportBuilderPreviewData.teamActivity?.length ? <p>Top Member: {reportBuilderPreviewData.teamActivity[0].memberName}</p> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {reportStep === 6 && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Name: <strong style={{ color: 'var(--text-primary)' }}>{reportForm.name || '-'}</strong></p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Type: <strong style={{ color: 'var(--text-primary)' }}>{reportForm.reportType}</strong></p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Recipients: <strong style={{ color: 'var(--text-primary)' }}>{reportForm.recipients.filter((r) => r.email).length}</strong></p>
                    <div>
                      <label className="text-xs mr-2" style={{ color: 'var(--text-secondary)' }}>Activate schedule now</label>
                      <input
                        type="checkbox"
                        checked={reportForm.status === 'active'}
                        onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'draft' }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>🧪 Test Before Launch</p>
                    <input
                      className="mt-3 w-full rounded-lg border px-3.5 py-2.5 text-xs"
                      style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)' }}
                      placeholder="Test recipient"
                      value={reportBuilderTestRecipient}
                      onChange={(e) => setReportBuilderTestRecipient(e.target.value)}
                    />
                    <button className="mt-3 px-3.5 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--border-soft)' }} onClick={testReportFromBuilder}>
                      Send Test Email
                    </button>
                    {reportBuilderTestResult ? <p className="mt-2 text-[11px]" style={{ color: 'var(--success)' }}>✓ {reportBuilderTestResult.renderedSubject}</p> : null}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-5 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-soft)' }}>
              <button
                className="px-4 py-2.5 rounded-lg text-xs font-semibold w-full sm:w-auto"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}
                onClick={() => setReportStep((prev) => Math.max(prev - 1, 1))}
              >
                Back
              </button>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {reportStep < 6 ? (
                  <button
                    className="px-4 py-2.5 rounded-lg text-xs font-bold text-white w-full sm:w-auto"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                    onClick={() => {
                      const error = validateReportStep(reportStep);
                      if (error) {
                        toast.warning('Missing Required Fields', error);
                        return;
                      }
                      setReportStep((prev) => Math.min(prev + 1, 6));
                    }}
                  >
                    Next <ArrowRight size={12} className="inline ml-1" />
                  </button>
                ) : (
                  <button
                    className="px-4 py-2.5 rounded-lg text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                    onClick={persistReportAutomation}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />} {editingReportId ? 'Update' : 'Schedule'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportPreviewPanel.open && renderOverlay(
        <div className="fixed inset-0 bg-black/30 flex justify-end" style={{ zIndex: 'var(--z-modal, 2147483000)' }}>
          <div className="w-full max-w-xl h-full overflow-y-auto p-7 sm:p-8" style={{ background: 'var(--bg-raised)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{reportPreviewPanel.title} · Data Preview</h3>
              <button onClick={() => setReportPreviewPanel({ open: false, title: '', data: null })} className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <div className="space-y-4 text-sm" style={{ color: 'var(--text-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Date Range: {reportPreviewPanel.data?.dateRange || '-'}</p>

              {reportPreviewPanel.data?.projectStats ? (
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                  <p className="text-xs font-bold">PROJECT STATS</p>
                  <p className="text-xs mt-1">Active: {reportPreviewPanel.data.projectStats.totalActiveProjects}</p>
                  <p className="text-xs">Completed: {reportPreviewPanel.data.projectStats.projectsCompletedInRange}</p>
                  <p className="text-xs">At Risk: {reportPreviewPanel.data.projectStats.projectsAtRisk}</p>
                </div>
              ) : null}

              {reportPreviewPanel.data?.taskMetrics ? (
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                  <p className="text-xs font-bold">TASK METRICS</p>
                  <p className="text-xs mt-1">Created: {reportPreviewPanel.data.taskMetrics.totalCreated}</p>
                  <p className="text-xs">Completed: {reportPreviewPanel.data.taskMetrics.totalCompleted}</p>
                  <p className="text-xs">Rate: {reportPreviewPanel.data.taskMetrics.completionRate}%</p>
                </div>
              ) : null}

              {reportPreviewPanel.data?.teamActivity?.length ? (
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                  <p className="text-xs font-bold">TEAM ACTIVITY</p>
                  {reportPreviewPanel.data.teamActivity.slice(0, 5).map((member, index) => (
                    <p key={`${member.userId}-${index}`} className="text-xs mt-1">{index + 1}. {member.memberName} · {member.tasksCompleted} tasks completed</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {historyAutomationId && renderOverlay(
        <div className="fixed inset-0 bg-black/30 flex justify-end" style={{ zIndex: 'var(--z-modal, 2147483000)' }}>
          <div className="w-full max-w-xl h-full overflow-y-auto p-7 sm:p-8" style={{ background: 'var(--bg-raised)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Execution History</h3>
              <button onClick={() => setHistoryAutomationId(null)} className="p-2.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <div className="space-y-3">
              {historyRows.map((row) => (
                <div key={row._id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: row.status === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                      {row.status === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {row.status}
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(row.createdAt || row.runAt).toLocaleString()}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{
                      background: (row.triggerSource || row.triggeredBy) === 'test' ? 'var(--bg-surface)' : ((row.triggerSource || row.triggeredBy) === 'manual' ? 'var(--bg-surface)' : 'var(--bg-surface)'),
                      color: 'var(--text-secondary)'
                    }}>
                      {(row.triggerSource || row.triggeredBy) === 'test' ? '🧪 Test' : (row.triggerSource || row.triggeredBy || 'schedule')}
                    </span>
                  </div>

                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Recipients: {row.recipients?.length || row.recipientCount || 0}</p>
                  {row.error || row.errorMessage ? <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>Error: {row.error || row.errorMessage}</p> : null}

                  {(row.context?.mockPayloadUsed || row.reportSnapshot) ? (
                    <div className="mt-2">
                      <button
                        className="text-[11px] font-semibold inline-flex items-center gap-1"
                        style={{ color: 'var(--brand)' }}
                        onClick={() => setHistoryExpandedId((prev) => prev === row._id ? null : row._id)}
                      >
                        View payload {historyExpandedId === row._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {historyExpandedId === row._id && (
                        <pre className="mt-3 rounded-lg p-3 text-[10px] overflow-auto" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                          {JSON.stringify(row.context?.mockPayloadUsed || row.reportSnapshot, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              {historyRows.length === 0 && (
                <p className="text-sm text-center py-10" style={{ color: 'var(--text-secondary)' }}>No runs yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
