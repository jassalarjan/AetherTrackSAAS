import { useState, useEffect } from 'react';
import { Zap, Save, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
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

const SecretInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-8 rounded border text-sm outline-none transition-colors"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' }} />
      <button type="button" tabIndex={-1} onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

const inputCls = 'w-full px-3 py-2 rounded border text-sm outline-none transition-colors';
const inputStyle = { background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' };

const IntegrationsPanel = () => {
  const { theme } = useTheme();
  const { settings, loading, saving, updateSection } = useWorkspaceSettings();

  const [form, setForm] = useState({});
  const [msg, setMsg]   = useState({ type: '', text: '' });

  useEffect(() => {
    if (settings?.integrations) setForm({ ...settings.integrations });
  }, [settings]);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000); };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    const r = await updateSection('integrations', form);
    showMsg(r.success ? 'success' : 'error', r.success ? 'Integrations saved!' : r.error);
  };

  const INTEGRATIONS = [
    {
      id: 'slack',
      label: 'Slack',
      description: 'Send task and project notifications to a Slack channel.',
      statusKey: 'slack_enabled',
      logo: '💬',
      fields: [
        { key: 'slack_webhook_url', label: 'Incoming Webhook URL', type: 'secret', placeholder: 'https://hooks.slack.com/...' },
        { key: 'slack_channel', label: 'Channel', type: 'text', placeholder: '#general' },
      ],
    },
    {
      id: 'github',
      label: 'GitHub',
      description: 'Link commits and pull requests to AetherTrack tasks.',
      statusKey: 'github_enabled',
      logo: '🐙',
      fields: [
        { key: 'github_token', label: 'Personal Access Token', type: 'secret', placeholder: 'ghp_...' },
        { key: 'github_repo', label: 'Repository (owner/repo)', type: 'text', placeholder: 'acme/backend' },
      ],
    },
    {
      id: 'jira',
      label: 'Jira',
      description: 'Sync issues between Jira and AetherTrack.',
      statusKey: 'jira_enabled',
      logo: '🔵',
      fields: [
        { key: 'jira_base_url', label: 'Jira Base URL', type: 'text', placeholder: 'https://yourorg.atlassian.net' },
        { key: 'jira_token', label: 'API Token', type: 'secret', placeholder: 'ATATT3xFfGF0...' },
        { key: 'jira_project_key', label: 'Project Key', type: 'text', placeholder: 'PROJ' },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Integrations</h2></div>
        {[1,2,3].map(i => (
          <div key={i} className="rounded-xl border p-6 animate-pulse" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
            <div className="h-4 w-24 rounded mb-3" style={{ background: 'var(--border-mid)' }} />
            <div className="h-8 rounded mb-2" style={{ background: 'var(--border-soft)' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Integrations</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Connect external services to extend AetherTrack's capabilities.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50 flex-shrink-0"
          style={{ background: 'var(--brand)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {msg.text && (
        <div className={`p-3 rounded border text-sm ${
          msg.type === 'success'
            ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
            : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
        }`}>{msg.text}</div>
      )}

      {INTEGRATIONS.map(intg => {
        const isEnabled = !!form[intg.statusKey];
        return (
          <div key={intg.id} className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{intg.logo}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{intg.label}</h3>
                    {isEnabled
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <XCircle size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{intg.description}</p>
                </div>
              </div>
              <Toggle checked={isEnabled} onChange={v => set(intg.statusKey, v)} />
            </div>

            {isEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                {intg.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                    {f.type === 'secret'
                      ? <SecretInput value={form[f.key] ?? ''} onChange={v => set(f.key, v)} placeholder={f.placeholder} />
                      : <input className={inputCls} style={inputStyle} value={form[f.key] ?? ''} placeholder={f.placeholder}
                          onChange={e => set(f.key, e.target.value)} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: 'var(--border-mid)' }}>
        <Zap size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>More integrations coming soon</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Zapier, Google Workspace, Microsoft 365, and more — submit a request to fast-track your favourite.
        </p>
      </div>
    </div>
  );
};

export default IntegrationsPanel;
