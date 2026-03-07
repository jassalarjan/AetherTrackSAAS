import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Zap, Building, Save } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useWorkspaceSettings } from '../hooks/useSettings';

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    per: '/month',
    seats: 5,
    features: ['Up to 5 members','Basic task management','Email notifications','1GB storage'],
    color: '#64748b',
  },
  {
    id: 'starter',
    label: 'Starter',
    price: '$12',
    per: '/member/month',
    seats: 25,
    features: ['Up to 25 members','Advanced analytics','HR module','5GB storage','Priority support'],
    color: '#6366f1',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$29',
    per: '/member/month',
    seats: 100,
    features: ['Up to 100 members','Custom domain','API access','50GB storage','SLA support','Webhooks'],
    color: '#c4713a',
    popular: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    per: '',
    seats: Infinity,
    features: ['Unlimited members','Dedicated infrastructure','SSO / SAML','Audit log','Custom SLA','On-prem option'],
    color: '#14b8a6',
  },
];

const BillingPanel = () => {
  const { theme } = useTheme();
  const { settings, loading, saving, updateSection } = useWorkspaceSettings();

  const [billingEmail, setBillingEmail] = useState('');
  const [cycle, setCycle]               = useState('monthly');
  const [msg, setMsg]                   = useState({ type: '', text: '' });

  useEffect(() => {
    if (settings?.billing) {
      setBillingEmail(settings.billing.billing_email ?? '');
      setCycle(settings.billing.billing_cycle ?? 'monthly');
    }
  }, [settings]);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000); };

  const saveBilling = async () => {
    const r = await updateSection('billing', { billing_email: billingEmail, billing_cycle: cycle });
    showMsg(r.success ? 'success' : 'error', r.success ? 'Billing info updated!' : r.error);
  };

  const billing = settings?.billing ?? {};
  const currentPlan = PLANS.find(p => p.id === billing.plan) ?? PLANS[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Billing</h2></div>
        <div className="rounded-xl border p-6 animate-pulse" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
          {[1,2,3].map(i => <div key={i} className="h-10 rounded mb-3" style={{ background: 'var(--border-soft)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Billing</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your subscription, seats, and payment preferences.</p>
      </div>

      {/* Current plan summary */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-5">
          <CreditCard size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Current Subscription</h3>
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Plan</p>
            <span className="text-base font-bold px-3 py-1 rounded"
              style={{ background: `${currentPlan.color}20`, color: currentPlan.color }}>
              {currentPlan.label}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Seats Used</p>
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {billing.seats_used ?? 1} / {billing.seats_limit === Infinity ? '∞' : billing.seats_limit}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Billing Cycle</p>
            <p className="text-base font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{billing.billing_cycle ?? 'monthly'}</p>
          </div>
          {billing.trial_ends_at && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1 text-yellow-500">Trial Ends</p>
              <p className="text-base font-bold text-yellow-500">{new Date(billing.trial_ends_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Available Plans</h3>
          <div className="flex gap-1 p-0.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border-mid)' }}>
            {['monthly','annual'].map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className="px-3 py-1 rounded font-medium transition-colors capitalize"
                style={{
                  background: cycle === c ? 'var(--brand)' : 'transparent',
                  color: cycle === c ? '#fff' : 'var(--text-secondary)',
                }}>
                {c} {c === 'annual' && <span className="text-green-400">-20%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const isCurrent = plan.id === billing.plan;
            return (
              <div key={plan.id} className={`rounded-xl border p-4 relative ${isCurrent ? 'ring-2' : ''}`}
                style={{
                  borderColor: isCurrent ? plan.color : 'var(--border-soft)',
                  background: isCurrent ? `${plan.color}08` : 'var(--bg-base)',
                  '--ring-color': plan.color,
                  outline: isCurrent ? `2px solid ${plan.color}` : 'none',
                  outlineOffset: -1,
                }}>
                {plan.popular && !isCurrent && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: plan.color }}>Popular</span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: plan.color }}>Current</span>
                )}
                <p className="font-bold text-sm" style={{ color: plan.color }}>{plan.label}</p>
                <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {plan.price}
                  {plan.per && <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{plan.per}</span>}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <button className="mt-4 w-full py-1.5 text-xs font-bold rounded border transition-colors hover:opacity-80"
                    style={{ borderColor: plan.color, color: plan.color }}>
                    {plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing details */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Billing Details</h3>
        <div className="max-w-sm space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Billing Email</label>
            <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border text-sm outline-none"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-primary)' }}
              placeholder="billing@company.com" />
          </div>
          {msg.text && (
            <div className={`p-3 rounded border text-sm ${
              msg.type === 'success'
                ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
                : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            }`}>{msg.text}</div>
          )}
          <button onClick={saveBilling} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50"
            style={{ background: 'var(--brand)' }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Billing Info'}
          </button>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Invoice history and payment methods are managed via the billing portal. Contact support to update your payment method.
        </p>
      </div>
    </div>
  );
};

export default BillingPanel;
