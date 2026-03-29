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
    <>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Shell: full viewport, scrollable if needed ── */
        .at-shell {
          min-height: 100dvh;
          background: var(--bg-canvas);
          font-family: var(--font-body);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px 16px;
          overflow-x: hidden;
        }

        /* ── Frame: centers the card vertically on tall screens ── */
        .at-frame {
          width: 100%;
          max-width: 1100px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100dvh - 48px);
        }

        /* ── Card: two-col on xl, single-col below ── */
        .at-card {
          width: 100%;
          background: var(--bg-raised);
          border: 1.5px solid var(--border-mid);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.65) inset,
            0 18px 40px rgba(20,24,32,0.10),
            0 4px 12px rgba(20,24,32,0.06);
          display: grid;
          grid-template-columns: minmax(0, 38%) 1fr;
        }

        /* ── Sidebar ── */
        .at-side {
          background: linear-gradient(180deg, #17100B 0%, #231710 100%);
          color: #E4D9CC;
          padding: 42px 34px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid rgba(212,144,90,0.18);
        }

        .at-side-title {
          font-family: var(--font-heading);
          font-size: clamp(26px, 2.6vw, 38px);
          line-height: 1.1;
          margin-bottom: 16px;
        }

        .at-side-copy {
          color: #A9957D;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .at-side-features {
          display: grid;
          gap: 12px;
        }

        .at-side-quote {
          color: #8D7864;
          font-size: 12px;
          line-height: 1.55;
          margin-top: 32px;
        }

        /* ── Right panel ── */
        .at-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 4vw, 40px) clamp(16px, 3vw, 32px);
          background: linear-gradient(180deg, var(--bg-canvas) 0%, var(--bg-base) 100%);
          /* Prevent panel from ever being narrower than its content */
          min-width: 0;
        }

        .at-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        /* ── Headings ── */
        .at-title {
          font-family: var(--font-heading);
          font-size: clamp(30px, 4.5vw, 44px);
          line-height: 1;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        /* ── Inputs ── */
        .at-input {
          height: 44px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid var(--border-mid);
          background: var(--bg-raised);
          color: var(--text-primary);
          font-size: 16px;   /* 16px prevents iOS auto-zoom */
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }

        .at-input:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(196,113,58,0.14);
        }

        /* ── Submit button ── */
        .at-submit {
          width: 100%;
          height: 46px;
          border-radius: 11px;
          border: 1px solid var(--border-mid);
          background: var(--bg-surface);
          color: var(--text-primary);
          font-size: clamp(18px, 2.8vw, 26px);
          font-family: var(--font-heading);
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .at-submit:disabled {
          background: var(--brand-dim);
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ── Social row ── */
        .at-social-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        /* ── Label ── */
        .at-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: block;
          margin-bottom: 6px;
        }

        /* ── Divider ── */
        .at-divider {
          margin: 14px 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .at-divider-line {
          flex: 1;
          height: 1px;
          background: var(--border-hair);
        }

        /* ═══════════════════════════════
           RESPONSIVE BREAKPOINTS
           ═══════════════════════════════ */

        /* ── Below 1100px: hide sidebar, center form ── */
        @media (max-width: 1099px) {
          .at-card {
            grid-template-columns: 1fr;
            max-width: 580px;
            margin: 0 auto;
          }

          .at-side {
            display: none;
          }

          .at-frame {
            min-height: calc(100dvh - 48px);
          }
        }

        /* ── Below 640px: mobile ── */
        @media (max-width: 639px) {
          .at-shell {
            padding: 8px;
            align-items: flex-start;
          }

          .at-frame {
            min-height: calc(100dvh - 16px);
            align-items: flex-start;
          }

          .at-card {
            border-radius: 14px;
            box-shadow: 0 10px 22px rgba(20,24,32,0.08);
          }

          .at-panel {
            padding: 20px 14px;
            align-items: flex-start;
          }

          .at-social-row {
            grid-template-columns: 1fr;
          }

          .at-submit {
            height: 48px;
            font-size: 17px;
            font-family: var(--font-body);
            font-weight: 700;
          }
        }

        /* ── Short landscape screens ── */
        @media (max-height: 680px) and (max-width: 1099px) {
          .at-shell {
            align-items: flex-start;
          }

          .at-frame {
            min-height: auto;
            padding: 8px 0;
          }
        }

        @keyframes atSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="at-shell">
        <div className="at-frame">
          <div className="at-card">

            {/* ── Sidebar ── */}
            <aside className="at-side">
              <div>
                <p className="at-side-title">
                  Operations,<br />HR,<br />and delivery<br />unified
                </p>
                <p className="at-side-copy">
                  One platform for your entire workforce, from geofenced attendance to sprint delivery.
                </p>
                <div className="at-side-features">
                  {[
                    { icon: Zap, label: 'Live project velocity' },
                    { icon: Shield, label: 'Enterprise-grade security' },
                    { icon: Users, label: 'People and work in one flow' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                        background: 'rgba(212,144,90,0.15)', border: '1px solid rgba(212,144,90,0.2)',
                      }}>
                        <Icon size={14} color="#D4905A" />
                      </span>
                      <span style={{ color: '#B8A48E', fontSize: '13px' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="at-side-quote">
                Priya Sharma, HR Manager<br />"The HR calendar alone saved us hours every month."
              </div>
            </aside>

            {/* ── Form panel ── */}
            <section className="at-panel">
              <div className="at-form-wrap">

                {/* Wordmark */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '6px',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      background: 'linear-gradient(145deg, #D4905A, #C4713A)',
                      color: '#fff', fontSize: '11px', fontWeight: 700,
                    }}>A</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', color: 'var(--text-secondary)' }}>AetherTrack</span>
                  </div>
                  <h1 className="at-title">Welcome back</h1>
                  <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: 0 }}>Sign in to your workspace</p>
                </div>

                {/* Tenant badge */}
                <div style={{
                  marginBottom: '18px', border: '1px solid var(--border-mid)',
                  color: 'var(--brand)', borderRadius: '999px',
                  padding: '8px 14px', fontSize: '13px',
                  textAlign: 'center', background: 'rgba(196,113,58,0.06)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  nexus-demo.aethertrack.io
                </div>

                {/* Success message */}
                {successMessage && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    marginBottom: '16px', padding: '11px 13px', borderRadius: '10px',
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    color: '#16a34a', fontSize: '13px',
                  }}>
                    <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Social buttons */}
                <div className="at-social-row">
                  {['Google', 'Microsoft'].map(p => (
                    <button key={p} type="button" style={{
                      height: '42px', borderRadius: '10px',
                      border: '1px solid var(--border-mid)',
                      background: 'var(--bg-raised)',
                      color: 'var(--text-primary)',
                      fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                    }}>
                      {p}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="at-divider">
                  <div className="at-divider-line" />
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>OR EMAIL</span>
                  <div className="at-divider-line" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Email */}
                  <div>
                    <label className="at-label">Email</label>
                    <input
                      className="at-input"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@company.com"
                      required
                      data-testid="login-email"
                      autoComplete="email"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="at-label" style={{ margin: 0 }}>Password</label>
                      <Link to="/forgot-password" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brand)', textDecoration: 'none' }}>
                        Forgot password?
                      </Link>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="at-input"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="........"
                        required
                        data-testid="login-password"
                        autoComplete="current-password"
                        style={{ paddingRight: '44px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute', right: '12px', top: '50%',
                          transform: 'translateY(-50%)', background: 'none',
                          border: 'none', cursor: 'pointer', padding: '4px',
                          color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '12px 14px', borderRadius: '10px',
                      background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#dc2626', fontSize: '13px',
                    }} data-testid="login-error">
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div>
                        <p style={{ margin: 0 }}>{error}</p>
                        {needsVerification && (
                          <button
                            type="button"
                            onClick={() => navigate('/verify-email', { state: { email: formData.email } })}
                            style={{
                              marginTop: '6px', color: '#dc2626', background: 'none',
                              border: 'none', cursor: 'pointer', textDecoration: 'underline',
                              fontWeight: 600, fontSize: '13px', padding: 0,
                            }}
                          >
                            Go to verification page
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    className="at-submit"
                    type="submit"
                    disabled={loading}
                    data-testid="login-submit"
                  >
                    {loading ? (
                      <>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{ animation: 'atSpin 0.8s linear infinite', flexShrink: 0 }}
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                          Signing in...
                        </span>
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  {/* Remember me */}
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

                {/* Footer */}
                <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  New to AetherTrack?{' '}
                  <span style={{ color: 'var(--brand)', cursor: 'pointer' }}>Request access</span>
                </div>

              </div>
            </section>
          </div>
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
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Account Deactivated
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
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
    </>
  );
};

export default Login;
