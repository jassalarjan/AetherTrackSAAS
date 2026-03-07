import { useState, useEffect } from 'react';
import { Building2, Globe, Save } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useWorkspaceSettings } from '../hooks/useSettings';

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full px-3 py-2 rounded border text-sm outline-none transition-colors';
const inputStyle = { background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' };

const OrganizationPanel = () => {
  const { theme } = useTheme();
  const { settings, loading, saving, updateSection } = useWorkspaceSettings();

  const [form, setForm] = useState({ name: '', description: '', timezone: 'UTC', date_format: 'DD/MM/YYYY', language: 'en' });
  const [msg, setMsg]   = useState({ type: '', text: '' });

  useEffect(() => {
    if (settings?.general) setForm({ ...settings.general });
  }, [settings]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const handleSave = async () => {
    const r = await updateSection('general', form);
    showMsg(r.success ? 'success' : 'error', r.success ? 'Organization info saved!' : r.error);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Organization</h2></div>
        <div className="rounded-xl border p-6 animate-pulse" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
          {[1,2,3].map(i => <div key={i} className="h-10 rounded mb-3" style={{ background: 'var(--border-soft)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Organization</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your organization's identity, branding, and domain configuration.</p>
      </div>

      {/* Org info */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-5">
          <Building2 size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Organization Info</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Organization Name">
            <input className={inputCls} style={inputStyle} value={form.name ?? ''}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Acme Corp" />
          </Field>
          <Field label="Primary Language">
            <select className={inputCls} style={inputStyle} value={form.language ?? 'en'}
              onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description / Tagline">
              <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: 72 }}
                value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of your organization" rows={3} />
            </Field>
          </div>
        </div>

        {msg.text && (
          <div className={`mb-4 p-3 rounded border text-sm ${
            msg.type === 'success'
              ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
              : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
          }`}>{msg.text}</div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50"
          style={{ background: 'var(--brand)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Organization Info'}
        </button>
      </div>

      {/* Domain settings placeholder */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-4">
          <Globe size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Domain Settings</h3>
        </div>
        <div className="p-4 rounded-lg border border-dashed" style={{ borderColor: 'var(--border-mid)' }}>
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Custom domain configuration is available on the <strong style={{ color: 'var(--brand)' }}>Pro</strong> and <strong style={{ color: 'var(--brand)' }}>Enterprise</strong> plans.
          </p>
          <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
            Upgrade to map your own domain at <code>app.yourcompany.com</code>.
          </p>
        </div>
      </div>

      {/* Admin controls */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Admin Controls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'User Management', desc: 'Add, edit, and remove workspace members', href: '/users' },
            { label: 'Role Assignment',  desc: 'Control what each user can access', href: '/users' },
            { label: 'Audit Log',        desc: 'Review all system activity', href: '/changelog' },
            { label: 'Feature Matrix',   desc: 'Enable/disable feature flags', href: '/feature-matrix' },
          ].map(({ label, desc, href }) => (
            <a key={label} href={href}
              className="block p-4 rounded-lg border transition-all hover:opacity-80 group"
              style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-base)', textDecoration: 'none' }}>
              <p className="text-sm font-semibold group-hover:underline" style={{ color: 'var(--brand)' }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrganizationPanel;
