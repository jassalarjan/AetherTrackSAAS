import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-canvas)', fontFamily: 'var(--font-body)' }}>

      {/* ── Left decorative panel (visible lg+) ── */}
      <div
        className="lg:flex"
        style={{
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          width: '45%',
          flexShrink: 0,
          background: 'linear-gradient(160deg, #1C1510 0%, #2A1E16 60%, #3A2A1E 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '360px', height: '360px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,113,58,0.18) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '60px', left: '-60px',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,113,58,0.10) 0%, transparent 70%)',
          }} />
        </div>

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(145deg, #D4905A, #C4713A)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, color: '#fff',
              boxShadow: '0 4px 16px rgba(196,113,58,0.45)',
            }}>Æ</div>
            <span style={{
              fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500,
              color: '#C8B89A', letterSpacing: '-0.02em',
            }}>AetherTrack</span>
          </div>
        </div>

        {/* Headline + features */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: '36px', fontWeight: 400,
            lineHeight: 1.15, color: '#EDE7DC', letterSpacing: '-0.03em', marginBottom: '16px',
          }}>
            One workspace.<br />Every team.
          </h2>
          <p style={{
            fontSize: '15px', color: '#9A8570', lineHeight: 1.6,
            marginBottom: '40px', maxWidth: '320px',
          }}>
            Tasks, attendance, projects, HR — all connected in a single intelligent platform built for modern teams.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { icon: Zap,    label: 'Real-time task & project tracking' },
              { icon: Shield, label: 'Role-based access & audit logs' },
              { icon: Users,  label: 'HR, attendance & leave management' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(196,113,58,0.15)', border: '1px solid rgba(196,113,58,0.22)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon size={15} color="#D4905A" />
                </div>
                <span style={{ fontSize: '13px', color: '#8A7A66', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '12px', color: '#5A4A3A' }}>
            © 2025 AetherTrack · Enterprise Edition
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg-canvas)',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Mobile logo */}
          <div
            className="lg:hidden"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '32px', justifyContent: 'center',
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: 'linear-gradient(145deg, #D4905A, #C4713A)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: '#fff',
              boxShadow: '0 4px 14px rgba(196,113,58,0.4)',
            }}>Æ</div>
            <span style={{
              fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 500,
              color: 'var(--text-primary)', letterSpacing: '-0.02em',
            }}>AetherTrack</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 500,
              color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px',
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Sign in to your workspace to continue.
            </p>
          </div>

          {/* Success banner */}
          {successMessage && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px',
              padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              color: '#16a34a', fontSize: '13px',
            }}>
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Work email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                required
                data-testid="login-email"
                style={{
                  height: '44px', padding: '0 14px', borderRadius: '10px',
                  border: '1px solid var(--border-mid)', background: 'var(--bg-base)',
                  color: 'var(--text-primary)', fontSize: '14px',
                  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--brand)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(196,113,58,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-mid)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brand)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.target.style.opacity = '0.75')}
                  onMouseLeave={e => (e.target.style.opacity = '1')}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  data-testid="login-password"
                  style={{
                    width: '100%', height: '44px', padding: '0 44px 0 14px', borderRadius: '10px',
                    border: '1px solid var(--border-mid)', background: 'var(--bg-base)',
                    color: 'var(--text-primary)', fontSize: '14px',
                    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--brand)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(196,113,58,0.15)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--border-mid)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--brand)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Remember me for 30 days</span>
            </label>

            {/* Error banner */}
            {error && (
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#dc2626', fontSize: '13px',
                }}
                data-testid="login-error"
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p>{error}</p>
                  {needsVerification && (
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email', { state: { email: formData.email } })}
                      style={{
                        marginTop: '6px', color: '#dc2626', background: 'none', border: 'none',
                        cursor: 'pointer', textDecoration: 'underline', fontWeight: 600,
                        fontSize: '13px', padding: 0,
                      }}
                    >
                      Go to verification page →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              style={{
                height: '46px', borderRadius: '10px', border: 'none',
                background: loading
                  ? 'var(--brand-dim)'
                  : 'linear-gradient(135deg, #D4905A 0%, #C4713A 100%)',
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(196,113,58,0.35)',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
                marginTop: '4px',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(196,113,58,0.45)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 14px rgba(196,113,58,0.35)';
              }}
            >
              {loading ? (
                <>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: 'loginSpin 0.8s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <style>{`
              @keyframes loginSpin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
              }
            `}</style>
          </form>

          {/* Divider */}
          <div style={{ margin: '24px 0 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-hair)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Have an invitation?</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-hair)' }} />
          </div>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-faint)' }}>
            Contact your administrator to get started.
          </p>
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
