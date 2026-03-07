import { useState, useEffect } from 'react';
import { Building, Globe, Clock, Save, Shield, AlertCircle } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useWorkspaceSettings } from '../hooks/useSettings';

const TIMEZONES = [
  'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
  'Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Asia/Shanghai',
  'Australia/Sydney','Pacific/Auckland',
];

const DATE_FORMATS = ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'];

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full px-3 py-2 rounded border text-sm outline-none transition-colors';
const inputStyle = { background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' };

const WorkspacePanel = () => {
  const { theme } = useTheme();
  const { settings, loading, saving, updateSection } = useWorkspaceSettings();

  const [general, setGeneral]   = useState({});
  const [security, setSecurity] = useState({});
  const [msgs, setMsgs] = useState({});

  useEffect(() => {
    if (settings) {
      setGeneral(settings.general ?? {});
      setSecurity(settings.security ?? {});
    }
  }, [settings]);

  const showMsg = (section, type, text) => {
    setMsgs(prev => ({ ...prev, [section]: { type, text } }));
    setTimeout(() => setMsgs(prev => { const n = { ...prev }; delete n[section]; return n; }), 4000);
  };

  const saveGeneral = async () => {
    const r = await updateSection('general', general);
    showMsg('general', r.success ? 'success' : 'error', r.success ? 'General settings saved!' : r.error);
  };

  const saveSecurity = async () => {
    const r = await updateSection('security', security);
    showMsg('security', r.success ? 'success' : 'error', r.success ? 'Security policy saved!' : r.error);
  };

  const MsgBanner = ({ section }) => {
    const m = msgs[section];
    if (!m) return null;
    return (
      <div className={`p-3 rounded border text-sm ${
        m.type === 'success'
          ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
          : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
      }`}>{m.text}</div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Workspace Settings</h2></div>
        {[1,2].map(i => (
          <div key={i} className="rounded-xl border p-6 animate-pulse" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
            {[1,2,3].map(j => <div key={j} className="h-10 rounded mb-3" style={{ background: 'var(--border-soft)' }} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Workspace Settings</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure global workspace defaults. Admin only.</p>
      </div>

      {/* General Settings */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-5">
          <Globe size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider flex-1" style={{ color: 'var(--text-primary)' }}>General</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Workspace Name">
            <input className={inputCls} style={inputStyle} value={general.name ?? ''} onChange={e => setGeneral(p => ({ ...p, name: e.target.value }))} />
          </Field>
          <Field label="Language">
            <select className={inputCls} style={inputStyle} value={general.language ?? 'en'} onChange={e => setGeneral(p => ({ ...p, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select className={inputCls} style={inputStyle} value={general.timezone ?? 'UTC'} onChange={e => setGeneral(p => ({ ...p, timezone: e.target.value }))}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Date Format">
            <select className={inputCls} style={inputStyle} value={general.date_format ?? 'DD/MM/YYYY'} onChange={e => setGeneral(p => ({ ...p, date_format: e.target.value }))}>
              {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: 80 }}
                value={general.description ?? ''} onChange={e => setGeneral(p => ({ ...p, description: e.target.value }))} rows={3} />
            </Field>
          </div>
        </div>
        <MsgBanner section="general" />
        <button onClick={saveGeneral} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50"
          style={{ background: 'var(--brand)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save General Settings'}
        </button>
      </div>

      {/* Security Policy */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-5">
          <Shield size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Security Policy</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Session Timeout (minutes)">
            <input type="number" min={15} max={1440} className={inputCls} style={inputStyle}
              value={security.session_timeout_minutes ?? 480}
              onChange={e => setSecurity(p => ({ ...p, session_timeout_minutes: +e.target.value }))} />
          </Field>
          <Field label="Min Password Length">
            <input type="number" min={8} max={32} className={inputCls} style={inputStyle}
              value={security.password_min_length ?? 12}
              onChange={e => setSecurity(p => ({ ...p, password_min_length: +e.target.value }))} />
          </Field>
          <Field label="Audit Log Retention (days)">
            <input type="number" min={7} max={365} className={inputCls} style={inputStyle}
              value={security.audit_log_retention_days ?? 90}
              onChange={e => setSecurity(p => ({ ...p, audit_log_retention_days: +e.target.value }))} />
          </Field>
        </div>
        {/* Boolean toggles */}
        <div className="space-y-3 mb-5">
          {[
            { key: 'password_require_uppercase', label: 'Require uppercase letters in passwords' },
            { key: 'password_require_numbers',   label: 'Require numbers in passwords' },
            { key: 'password_require_symbols',   label: 'Require special characters in passwords' },
            { key: 'restrict_signups_to_domains', label: 'Restrict sign-ups to allowed domains only' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={!!security[key]}
                onChange={e => setSecurity(p => ({ ...p, [key]: e.target.checked }))}
                className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
            </label>
          ))}
        </div>
        {security.restrict_signups_to_domains && (
          <div className="mb-5">
            <Field label="Allowed Sign-up Domains (comma-separated)">
              <input className={inputCls} style={inputStyle}
                placeholder="company.com, partner.com"
                value={(security.allowed_signup_domains ?? []).join(', ')}
                onChange={e => setSecurity(p => ({
                  ...p,
                  allowed_signup_domains: e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                }))} />
            </Field>
          </div>
        )}
        <MsgBanner section="security" />
        <button onClick={saveSecurity} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50 mt-3"
          style={{ background: 'var(--brand)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Security Policy'}
        </button>
      </div>
    </div>
  );
};

export default WorkspacePanel;
