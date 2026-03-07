import { useState, useEffect } from 'react';
import { Bot, Save } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useWorkspaceSettings } from '../hooks/useSettings';

const Toggle = ({ checked, onChange, disabled }) => (
  <button role="switch" aria-checked={checked} onClick={() => !disabled && onChange(!checked)} disabled={disabled}
    className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors disabled:opacity-50"
    style={{ background: checked ? 'var(--brand)' : 'var(--border-mid)' }}>
    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
      style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
  </button>
);

const RuleRow = ({ label, description, checked, onToggle, children }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b last:border-0"
    style={{ borderColor: 'var(--border-soft)' }}>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {checked && children && <div className="mt-3">{children}</div>}
    </div>
    <Toggle checked={checked} onToggle={onToggle} onChange={onToggle} />
  </div>
);

const NumberInput = ({ value, onChange, min = 1, max = 365, unit = 'days' }) => (
  <div className="flex items-center gap-2">
    <input type="number" min={min} max={max} value={value || ''} onChange={e => onChange(parseInt(e.target.value, 10) || min)}
      className="w-20 px-2 py-1.5 rounded border text-sm text-center outline-none"
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' }} />
    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>
  </div>
);

const AutomationPanel = () => {
  const { theme } = useTheme();
  const { settings, loading, saving, updateSection } = useWorkspaceSettings();

  const defaults = {
    auto_close_resolved: false,
    auto_close_resolved_days: 7,
    auto_assign_unassigned_tasks: false,
    due_reminder_days_before: 2,
    notify_on_overdue: true,
    auto_archive_completed_projects: false,
    auto_archive_days: 30,
  };

  const [form, setForm] = useState(defaults);
  const [msg, setMsg]   = useState({ type: '', text: '' });

  useEffect(() => {
    if (settings?.automation) setForm({ ...defaults, ...settings.automation });
  }, [settings]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000); };

  const handleSave = async () => {
    const r = await updateSection('automation', form);
    showMsg(r.success ? 'success' : 'error', r.success ? 'Automation rules saved!' : (r.error || 'Save failed.'));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Automation</h2></div>
        <div className="rounded-xl border p-6 animate-pulse" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded mb-4" style={{ background: 'var(--border-soft)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Automation</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Automate repetitive workspace actions to keep your projects clean and your team on track.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50 flex-shrink-0"
          style={{ background: 'var(--brand)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {msg.text && (
        <div className={`p-3 rounded border text-sm ${
          msg.type === 'success'
            ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
            : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
        }`}>{msg.text}</div>
      )}

      {/* Task Rules */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Task Rules</h3>
        </div>
        <div>
          <RuleRow
            label="Auto-close resolved tasks"
            description="Automatically close tasks that have been in a resolved state for a set number of days."
            checked={!!form.auto_close_resolved}
            onToggle={v => set('auto_close_resolved', v)}>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Close after</span>
              <NumberInput value={form.auto_close_resolved_days} onChange={v => set('auto_close_resolved_days', v)} min={1} max={180} unit="days" />
            </div>
          </RuleRow>

          <RuleRow
            label="Auto-assign unassigned tasks"
            description="Automatically assign unassigned tasks to available team members using round-robin distribution."
            checked={!!form.auto_assign_unassigned_tasks}
            onToggle={v => set('auto_assign_unassigned_tasks', v)}
          />

          <RuleRow
            label="Due date reminder"
            description="Send a reminder notification to assignees before a task's due date."
            checked={form.due_reminder_days_before > 0}
            onToggle={v => set('due_reminder_days_before', v ? 2 : 0)}>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Remind</span>
              <NumberInput value={form.due_reminder_days_before} onChange={v => set('due_reminder_days_before', v)} min={1} max={30} unit="days before" />
            </div>
          </RuleRow>

          <RuleRow
            label="Overdue task notifications"
            description="Notify task assignees and project leads when tasks become overdue."
            checked={!!form.notify_on_overdue}
            onToggle={v => set('notify_on_overdue', v)}
          />
        </div>
      </div>

      {/* Project Rules */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Project Rules</h3>
        </div>
        <div>
          <RuleRow
            label="Auto-archive completed projects"
            description="Automatically archive projects after all tasks are complete and they've been idle for a set period."
            checked={!!form.auto_archive_completed_projects}
            onToggle={v => set('auto_archive_completed_projects', v)}>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Archive after</span>
              <NumberInput value={form.auto_archive_days} onChange={v => set('auto_archive_days', v)} min={1} max={365} unit="days of inactivity" />
            </div>
          </RuleRow>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Automation rules run daily. Changes take effect on the next scheduled run.
      </p>
    </div>
  );
};

export default AutomationPanel;
