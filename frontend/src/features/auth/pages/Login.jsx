import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight, Zap, Shield, Users } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [accountDeactivated, setAccountDeactivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setAccountDeactivated(false);
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
      if (result.requiresVerification) setNeedsVerification(true);
      if (result.accountDeactivated) setAccountDeactivated(true);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-shell" style={{ minHeight: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-body)', padding: '24px 12px' }}>
      <div className="auth-frame" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', minHeight: 'calc(100vh - 48px)', display: 'grid', alignItems: 'center' }}>
        <div className="auth-card" style={{
          background: 'var(--bg-raised)',
          border: '1.5px solid var(--border-mid)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 1px 0 rgba(255,255,255,0.65) inset, 0 18px 40px rgba(20, 24, 32, 0.10), 0 4px 12px rgba(20, 24, 32, 0.06)',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 36%) 1fr',
          minHeight: '680px',
        }}>
          <aside className="auth-side hidden lg:flex" style={{
            background: 'linear-gradient(180deg, #17100B 0%, #231710 100%)',
            color: '#E4D9CC',
            padding: '42px 34px',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(212, 144, 90, 0.18)',
          }}>
            <div>
              <p className="auth-side-title auth-side-title-desktop" style={{ fontFamily: 'var(--font-heading)', fontSize: '38px', lineHeight: 1.1, marginBottom: '20px' }}>
                Operations,<br />HR,<br />and delivery<br />unified
              </p>
              <p className="auth-side-title auth-side-title-tablet" style={{ fontFamily: 'var(--font-heading)', fontSize: '38px', lineHeight: 1.1, marginBottom: '12px' }}>
                Unified operations, HR, and delivery
              </p>
              <p className="auth-side-copy auth-side-copy-desktop" style={{ color: '#A9957D', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
                One platform for your entire workforce, from geofenced attendance to sprint delivery.
              </p>
              <p className="auth-side-copy auth-side-copy-tablet" style={{ color: '#A9957D', fontSize: '15px', lineHeight: 1.55, marginBottom: '16px' }}>
                One platform for attendance, people workflows, and sprint execution in a single operational workspace.
              </p>
              <div className="auth-side-features" style={{ display: 'grid', gap: '12px' }}>
                {[
                  { icon: Zap, label: 'Live project velocity' },
                  { icon: Shield, label: 'Enterprise-grade security' },
                  { icon: Users, label: 'People and work in one flow' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      display: 'grid', placeItems: 'center',
                      background: 'rgba(212, 144, 90, 0.15)', border: '1px solid rgba(212, 144, 90, 0.2)',
                    }}>
                      <Icon size={14} color="#D4905A" />
                    </span>
                    <span style={{ color: '#B8A48E', fontSize: '13px' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="auth-side-quote" style={{ color: '#8D7864', fontSize: '12px' }}>
              Priya Sharma, HR Manager<br />"The HR calendar alone saved us hours every month."
            </div>
          </aside>

          <section className="auth-panel" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 22px',
            background: 'linear-gradient(180deg, var(--bg-canvas) 0%, var(--bg-base) 100%)',
          }}>
            <div className="auth-form-wrap" style={{ width: '100%', maxWidth: '420px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '6px',
                    display: 'grid', placeItems: 'center',
                    background: 'linear-gradient(145deg, #D4905A, #C4713A)',
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                  }}>A</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '17px' }}>AetherTrack</span>
                </div>
                <h1 className="auth-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '44px', lineHeight: 1, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Welcome back
                </h1>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Sign in to your workspace</p>
              </div>

              <div style={{ marginBottom: '18px', border: '1px solid var(--border-mid)', color: 'var(--brand)', borderRadius: '999px', padding: '8px 14px', fontSize: '13px', textAlign: 'center', background: 'rgba(196, 113, 58, 0.06)' }}>
                nexus-demo.aethertrack.io
              </div>

              {successMessage && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', padding: '11px 13px', borderRadius: '10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a', fontSize: '13px' }}>
                  <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="auth-social-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <button type="button" style={{ height: '42px', borderRadius: '10px', border: '1px solid var(--border-mid)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Google
                </button>
                <button type="button" style={{ height: '42px', borderRadius: '10px', border: '1px solid var(--border-mid)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Microsoft
                </button>
              </div>

              <div style={{ margin: '14px 0 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-hair)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>OR EMAIL</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-hair)' }} />
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    required
                    data-testid="login-email"
                    style={{ height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid var(--border-mid)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--brand)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(196,113,58,0.14)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border-mid)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
                    <Link to="/forgot-password" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brand)', textDecoration: 'none' }}>Forgot password?</Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="........"
                      required
                      data-testid="login-password"
                      style={{ width: '100%', height: '44px', padding: '0 44px 0 14px', borderRadius: '10px', border: '1px solid var(--border-mid)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                      onFocus={e => {
                        e.target.style.borderColor = 'var(--brand)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(196,113,58,0.14)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'var(--border-mid)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: '13px' }} data-testid="login-error">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <p>{error}</p>
                      {needsVerification && (
                        <button
                          type="button"
                          onClick={() => navigate('/verify-email', { state: { email: formData.email } })}
                          style={{ marginTop: '6px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600, fontSize: '13px', padding: 0 }}
                        >
                          Go to verification page
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={loading}
                  data-testid="login-submit"
                  style={{ height: '46px', borderRadius: '11px', border: '1px solid var(--border-mid)', background: loading ? 'var(--brand-dim)' : 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '31px', fontFamily: 'var(--font-heading)', lineHeight: 1, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'loginSpin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Signing in...</span>
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--brand)', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Remember this device</span>
                </label>
              </form>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                New to AetherTrack? <span style={{ color: 'var(--brand)' }}>Request access</span>
              </div>

              <style>{`
                .auth-shell {
                  padding: clamp(10px, 2.2vw, 24px) clamp(8px, 1.8vw, 16px);
                }

                .auth-card {
                  min-height: min(680px, calc(100vh - 32px));
                }

                .auth-panel {
                  padding: clamp(20px, 3vw, 36px) clamp(14px, 2.6vw, 22px);
                }

                .auth-title {
                  font-size: clamp(36px, 4vw, 44px);
                }

                .auth-submit {
                  height: 50px !important;
                  font-size: 26px !important;
                }

                .auth-side-title-tablet,
                .auth-side-copy-tablet {
                  display: none;
                }

                @media (max-width: 1023px) {
                  .auth-frame {
                    min-height: auto !important;
                    align-items: stretch !important;
                  }

                  .auth-card {
                    grid-template-columns: 1fr;
                    min-height: auto;
                    max-width: 680px;
                    margin: 0 auto;
                  }

                  .auth-panel {
                    align-items: flex-start !important;
                    padding-top: 24px !important;
                    padding-bottom: 24px !important;
                  }

                  .auth-form-wrap {
                    max-width: 520px !important;
                  }

                  .auth-title {
                    font-size: clamp(34px, 8vw, 40px) !important;
                  }

                  .auth-submit {
                    font-size: 22px !important;
                  }
                }

                @media (min-width: 641px) and (max-width: 1023px) {
                  .auth-shell {
                    padding: 12px;
                  }

                  .auth-card {
                    max-width: 860px;
                    border-radius: 18px !important;
                  }

                  .auth-side {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: flex-start !important;
                    justify-content: space-between !important;
                    gap: 22px;
                    padding: 24px 22px !important;
                    border-right: none !important;
                    border-bottom: 1px solid rgba(212, 144, 90, 0.18);
                  }

                  .auth-side-title {
                    font-size: 31px !important;
                    line-height: 1.16 !important;
                  }

                  .auth-side-title-desktop,
                  .auth-side-copy-desktop {
                    display: none;
                  }

                  .auth-side-title-tablet,
                  .auth-side-copy-tablet {
                    display: block;
                  }

                  .auth-side-copy {
                    max-width: 520px;
                  }

                  .auth-side-features {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 9px !important;
                  }

                  .auth-side-quote {
                    display: none;
                  }

                  .auth-panel {
                    align-items: center !important;
                    padding: 26px 22px !important;
                  }

                  .auth-form-wrap {
                    max-width: 560px !important;
                  }

                  .auth-title {
                    font-size: 42px !important;
                  }

                  .auth-social-row {
                    grid-template-columns: 1fr 1fr;
                  }

                  .auth-submit {
                    font-size: 24px !important;
                  }
                }

                @media (max-width: 640px) {
                  .auth-shell {
                    padding: 6px;
                  }

                  .auth-side {
                    display: none !important;
                  }

                  .auth-card {
                    border-radius: 14px !important;
                  }

                  .auth-panel {
                    padding: 18px 12px !important;
                  }

                  .auth-form-wrap {
                    max-width: 100% !important;
                  }

                  .auth-title {
                    font-size: clamp(28px, 10vw, 34px) !important;
                  }

                  .auth-social-row {
                    grid-template-columns: 1fr;
                  }

                  .auth-submit {
                    height: 46px !important;
                    font-size: 18px !important;
                    font-family: var(--font-body) !important;
                    font-weight: 700 !important;
                  }
                }

                @media (max-height: 760px) and (max-width: 1023px) {
                  .auth-shell {
                    min-height: auto;
                  }

                  .auth-frame {
                    min-height: auto !important;
                  }
                }

                @keyframes loginSpin {
                  from { transform: rotate(0deg); }
                  to   { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </section>
        </div>
      </div>

      {/* ── Account Deactivated Modal ── */}
      {accountDeactivated && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-base)', borderRadius: '16px',
            border: '1px solid var(--border-soft)',
            padding: '32px', maxWidth: '400px', width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              }}>
                <AlertCircle size={24} color="#dc2626" />
              </div>
              <h3 style={{
                fontSize: '18px', fontWeight: 600,
                color: 'var(--text-primary)', marginBottom: '8px',
              }}>
                Account Deactivated
              </h3>
              <p style={{
                fontSize: '14px', color: 'var(--text-muted)',
                lineHeight: 1.6, marginBottom: '24px',
              }}>
                Your account has been deactivated. Please contact your administrator for assistance.
              </p>
              <button
                onClick={() => setAccountDeactivated(false)}
                style={{
                  width: '100%', height: '44px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #D4905A 0%, #C4713A 100%)',
                  color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(196,113,58,0.3)',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
