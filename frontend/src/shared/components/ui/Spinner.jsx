/**
 * Spinner — unified loading indicator
 * Single source of truth for all rotation-based loading animations.
 *
 * Exported components:
 *  Spinner      — inline arc-ring spinner (default export)
 *  PageLoader   — full-viewport loading screen (variant prop selects animation)
 *  SectionLoader — inline panel loader
 *
 * PageLoader variants:
 *  'spin'  (default) — SVG arc ring, general purpose
 *  'bars'            — equalizer bars, use for Analytics / Gantt / Workload / Sprint
 *  'pulse'           — breathing dots, use for Kanban / HR / Attendance
 *  'dots'            — bouncing chat dots, use for Notifications
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

// ─── PageLoader sub-indicators ──────────────────────────────────────────────

/** variant="bars" — five equalizer bars, staggered */
const BarsIndicator = () => {
  const heights = [16, 28, 38, 28, 16];
  const delays  = [0, 110, 220, 330, 440];
  return (
    <div
      className="aether-bars-loader"
      aria-hidden="true"
      style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 44 }}
    >
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 6, height: h, borderRadius: 3,
          background: 'var(--brand, #C4713A)',
          transformOrigin: 'bottom',
          animation: `aether-bar-bounce 1.1s ease-in-out ${delays[i]}ms infinite`,
        }} />
      ))}
    </div>
  );
};

/** variant="pulse" — three breathing dots in sequence */
const PulseIndicator = () => {
  const delays = [0, 200, 400];
  return (
    <div
      className="aether-pulse-loader"
      aria-hidden="true"
      style={{ display: 'flex', gap: 10, alignItems: 'center' }}
    >
      {delays.map((d, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--brand, #C4713A)',
          animation: `aether-pulse-dot 1.4s ease-in-out ${d}ms infinite`,
        }} />
      ))}
    </div>
  );
};

/** variant="dots" — three bouncing chat-style dots */
const DotsIndicator = () => {
  const delays = [0, 160, 320];
  return (
    <div
      className="aether-dots-loader"
      aria-hidden="true"
      style={{ display: 'flex', gap: 7, alignItems: 'center' }}
    >
      {delays.map((d, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--brand, #C4713A)',
          animation: `aether-dot-bounce 1.2s ease-in-out ${d}ms infinite`,
        }} />
      ))}
    </div>
  );
};

// Map variant name → indicator component
const INDICATOR = {
  spin:  () => <Spinner size="lg" color="brand" />,
  bars:  BarsIndicator,
  pulse: PulseIndicator,
  dots:  DotsIndicator,
};

// ─── Exported components ────────────────────────────────────────────────────

/**
 * PageLoader — full-viewport centred loading overlay.
 *
 * Props:
 *  variant : 'spin' | 'bars' | 'pulse' | 'dots'  (default: 'spin')
 *  label   : optional status text below the indicator
 */
export const PageLoader = ({ label, variant = 'spin' }) => {
  const Indicator = INDICATOR[variant] ?? INDICATOR.spin;
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{
        background: 'var(--bg-canvas, #F7F3EE)',
        gap: '18px',
        animation: 'aether-fade-in 0.28s cubic-bezier(0.2, 0, 0, 1) both',
      }}
      role="status"
      aria-live="polite"
    >
      <Indicator />

      {/* Brand wordmark — accent line */}
      <p style={{
        fontFamily:    'var(--font-heading, Fraunces, serif)',
        fontSize:      '11px',
        fontWeight:    600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         'var(--brand, #C4713A)',
        opacity:       0.55,
        marginTop:     '4px',
      }}>
        AetherTrack
      </p>

      {/* Optional status label — shown beneath wordmark */}
      {label && (
        <p style={{
          fontFamily:    'var(--font-body, Instrument Sans, sans-serif)',
          fontSize:      '13px',
          fontWeight:    450,
          color:         'var(--text-muted)',
          letterSpacing: '0.01em',
          marginTop:     '-6px',
        }}>
          {label}
        </p>
      )}
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
