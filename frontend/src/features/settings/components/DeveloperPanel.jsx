import { useState } from 'react';
import { Code, Key, Globe, Plus, Trash2, Copy, Check, Eye, EyeOff, X } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useApiKeys, useWebhooks } from '../hooks/useSettings';

/* ─────────── helpers ─────────── */
const fmt = iso => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const inputCls = 'w-full px-3 py-2 rounded border text-sm outline-none transition-colors';
const inputStyle = { background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' };

const WEBHOOK_EVENTS = ['task.created','task.updated','task.completed','task.deleted','project.created','project.updated','user.invited','user.removed'];
const SCOPES = ['tasks:read','tasks:write','projects:read','projects:write','users:read'];

/* ─────────── tiny components ─────────── */
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors"
      style={{ borderColor: 'var(--border-mid)', color: 'var(--text-muted)' }}>
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const Badge = ({ label, color }) => (
  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: `${color}20`, color }}>
    {label}
  </span>
);

/* ─────────── API Key revealed modal ─────────── */
const RevealModal = ({ rawKey, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
    <div className="rounded-xl border shadow-2xl p-6 w-full max-w-md" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Your New API Key</h3>
        <button onClick={onClose}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        Copy this key now — <strong style={{ color: 'var(--text-primary)' }}>it will not be shown again.</strong>
      </p>
      <div className="flex items-center gap-2 p-3 rounded border font-mono text-sm break-all" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' }}>
        <span className="flex-1">{rawKey}</span>
        <CopyBtn text={rawKey} />
      </div>
      <button onClick={onClose} className="mt-4 w-full py-2 text-sm font-bold text-white rounded" style={{ background: 'var(--brand)' }}>
        Done — I've saved my key
      </button>
    </div>
  </div>
);

/* ─────────── API Keys section ─────────── */
const ApiKeysSection = () => {
  const { theme } = useTheme();
  const { keys, loading, generate, revoke } = useApiKeys();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', scopes: [], expires_days: '' });
  const [submitting, setSubmitting] = useState(false);
  const [rawKey, setRawKey]         = useState('');
  const [err, setErr]               = useState('');

  const toggleScope = s => setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }));

  const handleGenerate = async () => {
    if (!form.name.trim()) return setErr('Key name is required.');
    setSubmitting(true); setErr('');
    const r = await generate({ name: form.name.trim(), scopes: form.scopes, expires_days: form.expires_days ? parseInt(form.expires_days, 10) : undefined });
    setSubmitting(false);
    if (r.success) { setRawKey(r.rawKey); setShowForm(false); setForm({ name: '', scopes: [], expires_days: '' }); }
    else setErr(r.error || 'Failed to generate key.');
  };

  if (loading) return <div className="animate-pulse h-24 rounded" style={{ background: 'var(--border-soft)' }} />;

  return (
    <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
      {rawKey && <RevealModal rawKey={rawKey} onClose={() => setRawKey('')} />}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key size={16} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>API Keys</h3>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded transition-opacity"
          style={{ background: 'var(--brand)' }}>
          <Plus size={13} /> New Key
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 rounded border" style={{ borderColor: 'var(--border-mid)', background: 'var(--bg-canvas)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Key Name *</label>
              <input className={inputCls} style={inputStyle} placeholder="e.g. CI Pipeline" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Expires in (days, optional)</label>
              <input type="number" min="1" max="365" className={inputCls} style={inputStyle} placeholder="Never" value={form.expires_days} onChange={e => setForm(p => ({ ...p, expires_days: e.target.value }))} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Scopes</label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map(s => {
                const active = form.scopes.includes(s);
                return (
                  <button key={s} onClick={() => toggleScope(s)}
                    className="px-2 py-1 rounded text-xs border transition-colors"
                    style={{ borderColor: active ? 'var(--brand)' : 'var(--border-mid)', background: active ? 'var(--brand)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)' }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          {err && <p className="text-xs mb-2" style={{ color: theme === 'dark' ? '#f87171' : '#dc2626' }}>{err}</p>}
          <div className="flex gap-2">
            <button onClick={handleGenerate} disabled={submitting}
              className="px-3 py-1.5 text-xs font-bold text-white rounded disabled:opacity-50" style={{ background: 'var(--brand)' }}>
              {submitting ? 'Generating…' : 'Generate Key'}
            </button>
            <button onClick={() => { setShowForm(false); setErr(''); }} className="px-3 py-1.5 text-xs rounded border" style={{ borderColor: 'var(--border-mid)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No API keys yet. Create one above to get started.</p>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k._id} className="flex items-start justify-between gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{k.name}</span>
                  <Badge label={k.is_active ? 'Active' : 'Revoked'} color={k.is_active ? '#22c55e' : '#ef4444'} />
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{k.key_prefix}••••••••</span>
                  {k.scopes?.map(s => <Badge key={s} label={s} color="var(--brand)" />)}
                </div>
                <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Created {fmt(k.created_at)}</span>
                  <span>Last used {fmt(k.last_used_at)}</span>
                  {k.expires_at && <span>Expires {fmt(k.expires_at)}</span>}
                </div>
              </div>
              {k.is_active && (
                <button onClick={() => revoke(k._id)} className="flex-shrink-0 p-1.5 rounded hover:bg-red-500/10 transition-colors" title="Revoke">
                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────── Webhooks section ─────────── */
const WebhooksSection = () => {
  const { theme } = useTheme();
  const { webhooks, loading, create, update, remove } = useWebhooks();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', url: '', events: [], secret: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const toggleEvent = e => setForm(p => ({ ...p, events: p.events.includes(e) ? p.events.filter(x => x !== e) : [...p.events, e] }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.url.trim()) return setErr('Name and URL are required.');
    setSubmitting(true); setErr('');
    const r = await create({ name: form.name.trim(), url: form.url.trim(), events: form.events, secret: form.secret });
    setSubmitting(false);
    if (r.success) { setShowForm(false); setForm({ name: '', url: '', events: [], secret: '' }); }
    else setErr(r.error || 'Failed to create webhook.');
  };

  if (loading) return <div className="animate-pulse h-24 rounded" style={{ background: 'var(--border-soft)' }} />;

  return (
    <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={16} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Webhooks</h3>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded"
          style={{ background: 'var(--brand)' }}>
          <Plus size={13} /> Add Webhook
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 rounded border" style={{ borderColor: 'var(--border-mid)', background: 'var(--bg-canvas)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Name *</label>
              <input className={inputCls} style={inputStyle} placeholder="My Webhook" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Endpoint URL *</label>
              <input className={inputCls} style={inputStyle} placeholder="https://example.com/hook" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Events to Subscribe</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map(e => {
                const active = form.events.includes(e);
                return (
                  <button key={e} onClick={() => toggleEvent(e)}
                    className="px-2 py-1 rounded text-xs border transition-colors"
                    style={{ borderColor: active ? 'var(--brand)' : 'var(--border-mid)', background: active ? 'var(--brand)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)' }}>
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Secret (optional)</label>
            <div className="relative">
              <input type={showSecret ? 'text' : 'password'} className={`${inputCls} pr-8`} style={inputStyle} placeholder="Signing secret" value={form.secret} onChange={e => setForm(p => ({ ...p, secret: e.target.value }))} />
              <button type="button" tabIndex={-1} onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {err && <p className="text-xs mb-2" style={{ color: theme === 'dark' ? '#f87171' : '#dc2626' }}>{err}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={submitting} className="px-3 py-1.5 text-xs font-bold text-white rounded disabled:opacity-50" style={{ background: 'var(--brand)' }}>
              {submitting ? 'Creating…' : 'Create Webhook'}
            </button>
            <button onClick={() => { setShowForm(false); setErr(''); }} className="px-3 py-1.5 text-xs rounded border" style={{ borderColor: 'var(--border-mid)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No webhooks configured. Add one to receive real-time event payloads.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh._id} className="flex items-start justify-between gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{wh.name}</span>
                  <Badge label={wh.is_active ? 'Active' : 'Paused'} color={wh.is_active ? '#22c55e' : '#f59e0b'} />
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(wh.events || []).map(ev => <Badge key={ev} label={ev} color="var(--brand)" />)}
                </div>
                <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Deliveries: {wh.delivery_count ?? 0}</span>
                  {wh.last_triggered && <span>Last: {fmt(wh.last_triggered)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => update(wh._id, { is_active: !wh.is_active })}
                  className="px-2 py-1 text-xs rounded border transition-colors"
                  style={{ borderColor: 'var(--border-mid)', color: 'var(--text-muted)' }}>
                  {wh.is_active ? 'Pause' : 'Enable'}
                </button>
                <button onClick={() => remove(wh._id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors" title="Delete">
                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────── Main Panel ─────────── */
const DeveloperPanel = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Developer</h2>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage API keys and webhook endpoints for programmatic access to AetherTrack.</p>
    </div>
    <ApiKeysSection />
    <WebhooksSection />
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-mid)', background: 'var(--bg-raised)' }}>
      <div className="flex items-start gap-3">
        <Code size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>API Documentation</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            See the full REST API reference for integration patterns, payload schemas, and authentication examples.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default DeveloperPanel;
