/**
 * ShortcutsOverlay
 * Displays all active page keyboard shortcuts in a modal.
 * Opened by pressing '?' anywhere (not inside an input) or by
 * clicking the '?' button in the AppHeader.
 */
import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

const GLOBAL_SHORTCUTS = [
  { key: '⌘K', label: 'Open Command Palette' },
  { key: '?', label: 'Show / hide this help' },
  { key: 'Esc', label: 'Close modal / overlay' },
];

/**
 * Render a single <kbd> chip for a key string like 'N', '/', 'Alt+T', etc.
 */
const KeyChip = ({ keyStr }) => (
  <kbd
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '26px',
      padding: '2px 6px',
      borderRadius: 'var(--r-sm, 4px)',
      border: '1px solid var(--border-mid, #D4BFA8)',
      background: 'var(--bg-surface, #F0EAE2)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: '1.5',
    }}
  >
    {keyStr}
  </kbd>
);

/**
 * Build a human-readable key label from a shortcut definition.
 */
const buildKeyLabel = (sc) => {
  const parts = [];
  if (sc.ctrl)  parts.push('Ctrl');
  if (sc.meta)  parts.push('⌘');
  if (sc.alt)   parts.push('Alt');
  if (sc.shift) parts.push('Shift');
  parts.push(sc.key === '/' ? '/' : sc.key.toUpperCase());
  return parts.join('+');
};

const ShortcutsOverlay = ({ show, onClose, shortcuts = [], pageName = 'Page' }) => {
  // Close on Escape key
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9200] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--card-border, var(--border-soft))',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <div className="flex items-center gap-3">
            <Keyboard size={18} style={{ color: 'var(--brand)' }} />
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors focus-visible:outline-none"
            style={{ color: 'var(--text-muted)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-base)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Page-specific shortcuts */}
          {shortcuts.length > 0 && (
            <section>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                {pageName}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                    style={{ background: 'var(--bg-base)' }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {sc.label}
                      </span>
                      {sc.description && (
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: '1px',
                          }}
                        >
                          {sc.description}
                        </p>
                      )}
                    </div>
                    <KeyChip keyStr={buildKeyLabel(sc)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Global shortcuts */}
          <section>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            >
              Global
            </h3>
            <div className="space-y-2">
              {GLOBAL_SHORTCUTS.map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                  style={{ background: 'var(--bg-base)' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {sc.label}
                  </span>
                  <KeyChip keyStr={sc.key} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-center"
          style={{ borderColor: 'var(--border-hair)' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            Press <KeyChip keyStr="?" /> anywhere outside an input to toggle
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsOverlay;
