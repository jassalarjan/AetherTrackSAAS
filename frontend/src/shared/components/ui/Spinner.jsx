/**
 * Spinner — unified loading indicator
 * Single source of truth for all rotation-based loading animations.
 *
 * Exported components:
 *  Spinner      — inline arc-ring spinner (default export)
 *  PageLoader   — full-viewport loading screen
 *  SectionLoader — inline panel loader
 *
 * PageLoader note:
 *  variant is accepted for backwards compatibility, but the app now uses a
 *  single centered loading treatment during page/navigation transitions.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const SIZE = { xs: 16, sm: 22, md: 38, lg: 52 };
const COLOR = {
  brand: 'var(--brand, #C4713A)',
  white: 'rgba(255,255,255,0.9)',
  muted: 'var(--text-muted, #a89c8d)',
};

// ─── Arc-ring SVG (used by Spinner + variant="spin") ────────────────────────

/**
 * Inline arc-ring spinner.
 * Sizes: 'xs'=16 | 'sm'=22 | 'md'=38 | 'lg'=52 px
 * Colors: 'brand' | 'white' | 'muted'
 */
const Spinner = ({ size = 'md', color = 'brand', className = '', style = {} }) => {
  const px  = SIZE[size]  ?? SIZE.md;
  const col = COLOR[color] ?? COLOR.brand;
  // circumference of r=22 circle ≈ 138; 75% arc = 104, gap = 34
  // dashoffset=34 starts the arc at 12 o'clock (shifts 25% of circumference back)
  return (
    <div
      className={`aether-spinner-ring shrink-0 ${className}`}
      style={{
        width: px, height: px,
        animation: 'aether-spin 0.85s linear infinite',
        willChange: 'transform',
        flexShrink: 0,
        ...style,
      }}
      role="status"
      aria-label="Loading"
    >
      <svg width={px} height={px} viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <circle cx="26" cy="26" r="22" stroke={col} strokeWidth="4" strokeOpacity="0.18" />
        <circle cx="26" cy="26" r="22"
          stroke={col} strokeWidth="4" strokeLinecap="round"
          strokeDasharray="104 34" strokeDashoffset="34"
        />
      </svg>
    </div>
  );
};

// ─── Exported components ────────────────────────────────────────────────────

/**
 * PageLoader — full-viewport centred loading overlay.
 *
 * Props:
 *  variant : accepted for backwards compatibility, ignored for a unified UX
 *  label   : optional status text below the indicator
 */
export const PageLoader = ({ label, variant: _variant = 'spin' }) => {
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{
        background: 'color-mix(in srgb, var(--bg-canvas, #F7F3EE) 90%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 'max(24px, var(--safe-top, 0px)) max(20px, var(--safe-right, 0px)) max(24px, var(--safe-bottom, 0px)) max(20px, var(--safe-left, 0px))',
        animation: 'aether-fade-in 0.28s cubic-bezier(0.2, 0, 0, 1) both',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          gap: '14px',
          width: 'min(100%, 280px)',
          padding: '24px 20px',
          borderRadius: '24px',
          background: 'color-mix(in srgb, var(--bg-raised, #fff) 88%, transparent)',
          border: '1px solid color-mix(in srgb, var(--border-soft, rgba(0,0,0,0.08)) 90%, transparent)',
          boxShadow: '0 24px 60px rgba(26, 18, 11, 0.14)',
        }}
      >
        <Spinner size="lg" color="brand" />

        <p style={{
          fontFamily: 'var(--font-heading, Fraunces, serif)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--brand, #C4713A)',
          opacity: 0.7,
        }}>
          AetherTrack
        </p>

        {label && (
          <p style={{
            fontFamily: 'var(--font-body, Instrument Sans, sans-serif)',
            fontSize: '13px',
            fontWeight: 450,
            color: 'var(--text-muted)',
            letterSpacing: '0.01em',
            maxWidth: '22ch',
          }}>
            {label}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * SectionLoader — inline/panel loading state.
 * Use inside cards, lists, or sections while fetching.
 *
 * Props:
 *  label    : optional message
 *  minHeight: css value, default '120px'
 *  size     : Spinner size, default 'sm'
 */
export const SectionLoader = ({ label, minHeight = '120px', size = 'sm' }) => (
  <div
    className="flex flex-col items-center justify-center gap-3 w-full"
    style={{ minHeight }}
    role="status"
    aria-live="polite"
  >
    <Spinner size={size} color="brand" />
    {label && (
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize:   '13px',
        color:      'var(--text-muted)',
      }}>
        {label}
      </p>
    )}
  </div>
);

export default Spinner;
