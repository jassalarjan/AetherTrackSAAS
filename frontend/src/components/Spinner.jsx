/**
 * Spinner — unified loading indicator
 * Single source of truth for all rotation-based loading animations.
 *
 * Props:
 *  size   : 'xs' | 'sm' | 'md' | 'lg'   (default: 'md')
 *  color  : 'brand' | 'white' | 'muted'  (default: 'brand')
 *  className : extra class string
 */
const SIZE = {
  xs: 16,
  sm: 22,
  md: 38,
  lg: 52,
};

const BORDER = {
  xs: 2,
  sm: 2,
  md: 3,
  lg: 4,
};

const COLOR = {
  brand: 'var(--brand, #C4713A)',
  white: 'rgba(255,255,255,0.9)',
  muted: 'var(--text-muted, #a89c8d)',
};

const Spinner = ({ size = 'md', color = 'brand', className = '', style = {} }) => {
  const px   = SIZE[size]   ?? SIZE.md;
  const bw   = BORDER[size] ?? BORDER.md;
  const col  = COLOR[color] ?? COLOR.brand;

  return (
    <div
      className={`animate-spin rounded-full shrink-0 ${className}`}
      style={{
        width:       px,
        height:      px,
        border:      `${bw}px solid transparent`,
        borderTopColor:   col,
        borderRightColor: col,
        ...style,
      }}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * PageLoader — full-viewport centred loading state
 * Use as the return value of a page component while data is loading.
 *
 * Props:
 *  label : optional message (default: 'Loading…')
 */
export const PageLoader = ({ label = 'Loading\u2026' }) => (
  <div
    className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4"
    style={{ background: 'var(--bg-canvas, #F7F3EE)' }}
    role="status"
    aria-live="polite"
  >
    <Spinner size="lg" color="brand" />
    {label && (
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize:   '14px',
          fontWeight: 500,
          color:      'var(--text-secondary)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </p>
    )}
  </div>
);

/**
 * SectionLoader — inline/panel loading state
 * Use inside cards, lists, or sections while fetching.
 *
 * Props:
 *  label    : optional message
 *  minHeight: css value, default '120px'
 *  size     : spinner size, default 'sm'
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
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize:   '13px',
          color:      'var(--text-muted)',
        }}
      >
        {label}
      </p>
    )}
  </div>
);

export default Spinner;
