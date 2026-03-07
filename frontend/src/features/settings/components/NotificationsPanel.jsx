import { Bell, Mail, Smartphone, CheckCircle } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import NotificationSettings from '@/features/notifications/components/NotificationSettings';
import { useUserSettings } from '../hooks/useSettings';

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
    style={{ background: checked ? 'var(--brand)' : 'var(--border-mid)' }}
  >
    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
      style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
  </button>
);

const NotificationsPanel = () => {
  const { theme } = useTheme();
  const { settings, loading, saving, update } = useUserSettings();

  const notif = settings?.notifications ?? {};

  const toggle = async (key) => {
    await update({ notifications: { ...notif, [key]: !notif[key] } });
  };

  const EMAIL_PREFS = [
    { key: 'email_task_assigned',   label: 'Task assigned to you',           desc: 'When a task is assigned to your account' },
    { key: 'email_task_due',        label: 'Task due date reminders',         desc: 'Reminder emails before tasks are due' },
    { key: 'email_mentions',        label: 'Mentions & comments',             desc: 'When someone mentions you in a comment' },
    { key: 'email_project_updates', label: 'Project status updates',          desc: 'When project milestones are reached' },
    { key: 'email_weekly_digest',   label: 'Weekly activity digest',          desc: 'Summary email every Monday morning' },
  ];

  const PUSH_PREFS = [
    { key: 'push_enabled',        label: 'Enable push notifications',         desc: 'Master toggle for all browser notifications' },
    { key: 'push_task_assigned',  label: 'Task assigned to you',              desc: 'Instant alert when you get a new task' },
    { key: 'push_mentions',       label: 'Mentions & replies',                desc: 'When someone mentions you' },
    { key: 'push_due_reminders',  label: 'Due date approaching',              desc: 'Alert when a due date is near' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Notifications</h2></div>
        <div className="rounded-xl border p-6 animate-pulse" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
          <div className="h-4 w-32 rounded mb-4" style={{ background: 'var(--border-mid)' }} />
          {[1,2,3].map(i => <div key={i} className="h-10 rounded mb-3" style={{ background: 'var(--border-soft)' }} />)}
        </div>
      </div>
    );
  }

  const PrefRow = ({ pref, disabled = false }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border-soft)' }}>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pref.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pref.desc}</p>
      </div>
      <Toggle checked={!!notif[pref.key]} onChange={() => toggle(pref.key)} disabled={saving || disabled} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Notifications</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Control when and how you receive alerts.</p>
      </div>

      {/* Email notifications */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-4">
          <Mail size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Email Notifications</h3>
          {saving && <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Saving…</span>}
        </div>
        {EMAIL_PREFS.map(p => <PrefRow key={p.key} pref={p} />)}
      </div>

      {/* Push notifications */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-4">
          <Smartphone size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Push Notifications</h3>
        </div>
        {PUSH_PREFS.map(p => (
          <PrefRow key={p.key} pref={p} disabled={p.key !== 'push_enabled' && !notif['push_enabled']} />
        ))}
      </div>

      {/* Browser push setup (existing component) */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-4">
          <Bell size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Browser Push Setup</h3>
        </div>
        <NotificationSettings />
      </div>
    </div>
  );
};

export default NotificationsPanel;
