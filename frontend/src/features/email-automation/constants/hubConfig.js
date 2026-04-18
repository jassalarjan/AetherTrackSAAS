export const HUB_TABS = [
  { id: 'compose',     label: 'Compose & Send',    icon: 'PenSquare' },
  { id: 'sequences',   label: 'Sequences',         icon: 'GitBranch' },
  { id: 'campaigns',   label: 'Campaigns',         icon: 'Megaphone' },
  { id: 'templates',   label: 'Templates',         icon: 'FileText' },
  { id: 'automation',  label: 'Automation Rules',  icon: 'Zap' },
  { id: 'analytics',   label: 'Analytics',         icon: 'BarChart3' },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'outreach',    label: 'Outreach',   color: '#C4713A' },
  { id: 'follow-up',   label: 'Follow-up',  color: '#D4905A' },
  { id: 'proposal',    label: 'Proposal',   color: '#9B6A3F' },
  { id: 'cold',        label: 'Cold',       color: '#7A5640' },
  { id: 'onboarding',  label: 'Onboarding', color: '#B67B48' },
  { id: 'general',     label: 'General',    color: '#9A8A7A' },
  { id: 'custom',      label: 'Custom',     color: '#C4713A' },
];

export const AVAILABLE_VARIABLES = [
  { key: '{{firstName}}',  label: 'First Name',  example: 'John' },
  { key: '{{lastName}}',   label: 'Last Name',   example: 'Doe' },
  { key: '{{fullName}}',   label: 'Full Name',   example: 'John Doe' },
  { key: '{{email}}',      label: 'Email',       example: 'john@example.com' },
  { key: '{{company}}',    label: 'Company',     example: 'Acme Corp' },
  { key: '{{jobTitle}}',   label: 'Job Title',   example: 'CTO' },
  { key: '{{workspaceName}}', label: 'Workspace', example: 'AetherTrack' },
  { key: '{{currentDate}}', label: 'Today',       example: 'Jan 1, 2026' },
  { key: '{{senderName}}', label: 'Sender Name', example: 'Jane Smith' },
];

export const TRIGGER_TYPES = [
  { id: 'task.status.changed',  label: 'Task Status Changed',    icon: 'RefreshCw' },
  { id: 'task.created',         label: 'New Task Created',       icon: 'Plus' },
  { id: 'project.created',      label: 'New Project Created',    icon: 'FolderPlus' },
  { id: 'member.invited',       label: 'Member Invited',         icon: 'UserPlus' },
  { id: 'member.joined',        label: 'Member Joined',          icon: 'UserCheck' },
  { id: 'manual',               label: 'Manual Trigger',         icon: 'Play' },
];
