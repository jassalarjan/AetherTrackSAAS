/**
 * AppVersionIndicator
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed badge (bottom-left) that shows the running app version and whether
 * the latest build is loaded.  Click/tap to expand a status card.
 *
 * States:
 *  idle / checking  → spinning dot
 *  current          → green dot  "Up to date"
 *  outdated         → amber pulsing dot + "Update available" card
 *  error            → grey dot   "Couldn't check"
 */
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, WifiOff, X, Loader2 } from 'lucide-react';
import { useVersionStatus } from '@/shared/hooks/useVersionStatus';
import { useSidebar } from '@/features/workspace/context/SidebarContext';

// How long ago the last check was, as a human string
function timeAgo(date) {
  if (!date) return 'never';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const STATUS_CONFIG = {
  idle:     { color: 'var(--text-faint)',   label: 'Checking…',     Icon: Loader2 },
  checking: { color: 'var(--text-faint)',   label: 'Checking…',     Icon: Loader2 },
  current:  { color: '#22c55e',             label: 'Up to date',    Icon: CheckCircle },
  outdated: { color: '#f59e0b',             label: 'Update ready',  Icon: AlertCircle },
  error:    { color: 'var(--text-muted)',   label: "Can't check",   Icon: WifiOff },
};

export function AppVersionIndicator() {
  const {
    currentVersion,
    latestVersion,
    status,
    lastChecked,
    isOutdated,
    checkNow,
    reloadToUpdate,
  } = useVersionStatus();

  const { isMobile } = useSidebar();
  const [open,     setOpen]     = useState(false);
  const [reloading, setReloading] = useState(false);

  // Auto-open panel when an update is discovered
  useEffect(() => {
    if (isOutdated) setOpen(true);
  }, [isOutdated]);

  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const Icon = cfg.Icon;

  const handleReload = async () => {
    setReloading(true);
    await reloadToUpdate();
  };

  const handleCheck = (e) => {
    e.stopPropagation();
    checkNow();
  };

  return (
    <>
      {/* ── Expanded card ─────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position:     'fixed',
            bottom:       isMobile ? 'calc(64px + env(safe-area-inset-bottom, 0px))' : '56px',
            right:        '12px',
            zIndex:       1000,
            width:        '260px',
            background:   'var(--bg-raised)',
            border:       '1px solid var(--border-soft)',
            borderRadius: '14px',
            boxShadow:    'var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.18))',
            overflow:     'hidden',
          }}
          role="status"
          aria-live="polite"
        >
          {/* Card header */}
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              padding:      '10px 14px 8px',
              borderBottom: '1px solid var(--border-hair)',
            }}
          >
            <span style={{
              fontFamily:    'var(--font-heading, sans-serif)',
              fontSize:      '13px',
              fontWeight:    700,
              color:         'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              App Version
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', borderRadius: '6px', display: 'flex' }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Version rows */}
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '12px', color: 'var(--text-muted)' }}>
                Running
              </span>
              <code style={{
                fontFamily:   'var(--font-mono, monospace)',
                fontSize:     '12px',
                color:        'var(--text-primary)',
                background:   'var(--bg-canvas)',
                padding:      '1px 7px',
                borderRadius: '4px',
                border:       '1px solid var(--border-hair)',
              }}>
                v{currentVersion}
              </code>
            </div>

            {latestVersion && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Latest
                </span>
                <code style={{
                  fontFamily:   'var(--font-mono, monospace)',
                  fontSize:     '12px',
                  color:        isOutdated ? '#f59e0b' : '#22c55e',
                  background:   isOutdated ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                  padding:      '1px 7px',
                  borderRadius: '4px',
                  border:       `1px solid ${isOutdated ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
                }}>
                  v{latestVersion}
                </code>
              </div>
            )}

            {/* Status row */}
            <div style={{
              display:       'flex',
              alignItems:    'center',
              gap:           '6px',
              marginTop:     '2px',
              padding:       '6px 8px',
              background:    isOutdated ? 'rgba(245,158,11,0.06)' : 'var(--bg-canvas)',
              borderRadius:  '8px',
              border:        '1px solid var(--border-hair)',
            }}>
              <Icon
                size={13}
                style={{
                  color:     cfg.color,
                  flexShrink: 0,
                  animation: (status === 'checking' || status === 'idle') ? 'spin 1s linear infinite' : undefined,
                }}
              />
              <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '12px', color: cfg.color, flex: 1 }}>
                {cfg.label}
              </span>
              {lastChecked && (
                <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '11px', color: 'var(--text-faint)' }}>
                  {timeAgo(lastChecked)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            padding:      '0 14px 12px',
            display:      'flex',
            gap:          '8px',
          }}>
            {isOutdated ? (
              <button
                onClick={handleReload}
                disabled={reloading}
                style={{
                  flex:          1,
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent: 'center',
                  gap:           '6px',
                  padding:       '8px 12px',
                  background:    'var(--brand)',
                  color:         '#fff',
                  border:        'none',
                  borderRadius:  '8px',
                  cursor:        reloading ? 'not-allowed' : 'pointer',
                  fontSize:      '13px',
                  fontFamily:    'var(--font-body, sans-serif)',
                  fontWeight:    600,
                  opacity:       reloading ? 0.7 : 1,
                  transition:    'opacity 120ms',
                }}
              >
                <RefreshCw size={13} style={{ animation: reloading ? 'spin 0.8s linear infinite' : undefined }} />
                {reloading ? 'Reloading…' : 'Reload & Update'}
              </button>
            ) : (
              <button
                onClick={handleCheck}
                disabled={status === 'checking'}
                style={{
                  flex:          1,
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent: 'center',
                  gap:           '6px',
                  padding:       '8px 12px',
                  background:    'var(--bg-canvas)',
                  color:         'var(--text-secondary)',
                  border:        '1px solid var(--border-soft)',
                  borderRadius:  '8px',
                  cursor:        status === 'checking' ? 'not-allowed' : 'pointer',
                  fontSize:      '13px',
                  fontFamily:    'var(--font-body, sans-serif)',
                  fontWeight:    500,
                  opacity:       status === 'checking' ? 0.6 : 1,
                  transition:    'opacity 120ms',
                }}
              >
                <RefreshCw size={13} style={{ animation: status === 'checking' ? 'spin 1s linear infinite' : undefined }} />
                Check now
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Floating pill trigger ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={`App v${currentVersion} — ${cfg.label}`}
        aria-label={`App version ${currentVersion}, ${cfg.label}. Click to ${open ? 'close' : 'open'} details.`}
        style={{
          position:      'fixed',
          bottom:        isMobile ? 'calc(60px + env(safe-area-inset-bottom, 0px))' : '14px',
          right:         '12px',
          zIndex:        999,
          display:       'flex',
          alignItems:    'center',
          gap:           '5px',
          padding:       '4px 9px 4px 7px',
          background:    isOutdated ? 'rgba(245,158,11,0.12)' : 'var(--bg-raised)',
          border:        isOutdated
            ? '1px solid rgba(245,158,11,0.40)'
            : '1px solid var(--border-soft)',
          borderRadius:  '20px',
          cursor:        'pointer',
          boxShadow:     isOutdated
            ? '0 0 0 3px rgba(245,158,11,0.15), var(--shadow-md, 0 4px 16px rgba(0,0,0,0.10))'
            : 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.10))',
          transition:    'box-shadow 200ms, border-color 200ms, background 200ms',
        }}
      >
        {/* Status dot */}
        <span
          style={{
            width:        '7px',
            height:       '7px',
            borderRadius: '50%',
            background:   cfg.color,
            flexShrink:   0,
            animation:    isOutdated
              ? 'version-pulse 1.6s ease-in-out infinite'
              : (status === 'checking' || status === 'idle')
                ? 'spin 1s linear infinite'
                : undefined,
          }}
        />
        {/* Version text */}
        <span
          style={{
            fontFamily:    'var(--font-mono, monospace)',
            fontSize:      '11px',
            fontWeight:    600,
            color:         isOutdated ? '#f59e0b' : 'var(--text-muted)',
            letterSpacing: '0.01em',
            lineHeight:    1,
          }}
        >
          v{currentVersion}
        </span>
        {/* Update badge */}
        {isOutdated && (
          <span style={{
            fontSize:      '9px',
            fontFamily:    'var(--font-body, sans-serif)',
            fontWeight:    700,
            color:         '#f59e0b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight:    1,
          }}>
            UPDATE
          </span>
        )}
      </button>

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes version-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default AppVersionIndicator;
