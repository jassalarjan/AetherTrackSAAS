import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import api from '@/shared/services/axios';

const REQUIREMENTS = [
  { key: 'length',    label: 'At least 12 characters',           test: (p) => p.length >= 12 },
  { key: 'uppercase', label: 'One uppercase letter (A-Z)',        test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter (a-z)',        test: (p) => /[a-z]/.test(p) },
  { key: 'number',    label: 'One number (0-9)',                  test: (p) => /[0-9]/.test(p) },
  { key: 'special',   label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=[\]{}|;:',.<>?]/.test(p) },
];

const strength = (checks) => {
  const count = Object.values(checks).filter(Boolean).length;
  if (count <= 1) return { label: 'Very Weak', color: '#ef4444', pct: 20 };
  if (count === 2) return { label: 'Weak',    color: '#f97316', pct: 40 };
  if (count === 3) return { label: 'Fair',    color: '#eab308', pct: 60 };
  if (count === 4) return { label: 'Strong',  color: '#22c55e', pct: 80 };
  return { label: 'Very Strong', color: '#10b981', pct: 100 };
};

const SecurityPanel = () => {
  const { theme } = useTheme();
  const [form, setForm]   = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow]   = useState({ old: false, new: false, confirm: false });
  const [checks, setChecks] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg]     = useState({ type: '', text: '' });

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 5000); };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'newPassword') {
      const c = {};
      REQUIREMENTS.forEach(r => { c[r.key] = r.test(value); });
      setChecks(c);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { showMsg('error', 'New passwords do not match'); return; }
    const allMet = REQUIREMENTS.every(r => r.test(form.newPassword));
    if (!allMet) { showMsg('error', 'Password does not meet the security requirements'); return; }

    setIsSaving(true);
    try {
      const resp = await api.post('/users/me/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      showMsg('success', resp.data.message || 'Password changed successfully');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setChecks({});
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const { label: strLabel, color: strColor, pct: strPct } = form.newPassword ? strength(checks) : {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Security</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your password and access credentials.</p>
      </div>

      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-6">
          <Lock size={20} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
          {/* Current password */}
          {[
            { id: 'old', field: 'oldPassword', label: 'Current Password', showKey: 'old' },
            { id: 'new', field: 'newPassword', label: 'New Password',     showKey: 'new' },
            { id: 'confirm', field: 'confirmPassword', label: 'Confirm New Password', showKey: 'confirm' },
          ].map(({ id, field, label, showKey }) => (
            <div key={id}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <div className="relative">
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  value={form[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded border outline-none transition-colors text-sm"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' }}
                  required
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShow(prev => ({ ...prev, [showKey]: !prev[showKey] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {show[showKey] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength bar + requirements for new password */}
              {field === 'newPassword' && form.newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-mid)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${strPct}%`, background: strColor }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: strColor }}>{strLabel}</span>
                  </div>
                  <ul className="space-y-1">
                    {REQUIREMENTS.map(req => (
                      <li key={req.key} className="flex items-center gap-1.5 text-xs"
                        style={{ color: checks[req.key] ? '#22c55e' : 'var(--text-muted)' }}>
                        {checks[req.key]
                          ? <CheckCircle size={12} className="text-green-500" />
                          : <XCircle size={12} style={{ color: 'var(--text-muted)' }} />}
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {msg.text && (
            <div className={`p-3 rounded border text-sm ${
              msg.type === 'success'
                ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
                : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            }`}>{msg.text}</div>
          )}

          <button type="submit" disabled={isSaving}
            className="px-6 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50"
            style={{ background: 'var(--brand)' }}>
            {isSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Active Sessions Note */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-primary)' }}>Session Security</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your session uses short-lived JWT access tokens (15 min) with refresh tokens (7 days).
          Changing your password invalidates all existing sessions on next expiry.
        </p>
      </div>
    </div>
  );
};

export default SecurityPanel;
