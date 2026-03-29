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

// ─── Morphing loader-backed Spinner API ─────────────────────────────────────

/**
 * Inline loader.
 * Sizes: 'xs'=16 | 'sm'=22 | 'md'=38 | 'lg'=52 px
 * Colors prop is accepted for backwards compatibility.
 */
const Spinner = ({ size = 'md', color: _color = 'brand', className = '', style = {} }) => {
  const px = SIZE[size] ?? SIZE.md;
  const scale = Math.max(0.16, px / 100);

  return (
    <MorphingLoader
      scale={scale}
      className={className}
      style={style}
    />
  );
};

const MorphingLoader = ({ scale = 1, className = '', style = {} }) => {
  return (
    <>
      <style>{`
        .aether-morph-loader {
          --color-one: #ffbf48;
          --color-two: #be4a1d;
          --color-three: #ffbf4780;
          --color-four: #bf4a1d80;
          --color-five: #ffbf4740;
          --time-animation: 2s;
          --size: 1;
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          transform: scale(var(--size));
          box-shadow: 0 0 25px 0 var(--color-three), 0 20px 50px 0 var(--color-four);
          animation: aether-loader-colorize calc(var(--time-animation) * 3) ease-in-out infinite;
          isolation: isolate;
        }

        .aether-morph-loader::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border-top: solid 1px var(--color-one);
          border-bottom: solid 1px var(--color-two);
          background: linear-gradient(180deg, var(--color-five), var(--color-four));
          box-shadow: inset 0 10px 10px 0 var(--color-three), inset 0 -10px 10px 0 var(--color-four);
          z-index: 0;
        }

        .aether-morph-loader .aether-loader-box {
          width: 100px;
          height: 100px;
          background: linear-gradient(180deg, var(--color-one) 30%, var(--color-two) 70%);
          mask: url(#aether-loader-clipping);
          -webkit-mask: url(#aether-loader-clipping);
          position: relative;
          z-index: 1;
        }

        .aether-morph-loader svg {
          position: absolute;
          inset: 0;
          width: 100px;
          height: 100px;
        }

        .aether-morph-loader svg #aether-loader-clipping {
          filter: contrast(15);
          animation: aether-loader-roundness calc(var(--time-animation) / 2) linear infinite;
        }

        .aether-morph-loader svg #aether-loader-clipping polygon {
          filter: blur(7px);
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(1) {
          transform-origin: 75% 25%;
          transform: rotate(90deg);
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(2) {
          transform-origin: 50% 50%;
          animation: aether-loader-rotation var(--time-animation) linear infinite reverse;
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(3) {
          transform-origin: 50% 60%;
          animation: aether-loader-rotation var(--time-animation) linear infinite;
          animation-delay: calc(var(--time-animation) / -3);
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(4) {
          transform-origin: 40% 40%;
          animation: aether-loader-rotation var(--time-animation) linear infinite reverse;
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(5) {
          transform-origin: 40% 40%;
          animation: aether-loader-rotation var(--time-animation) linear infinite reverse;
          animation-delay: calc(var(--time-animation) / -2);
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(6) {
          transform-origin: 60% 40%;
          animation: aether-loader-rotation var(--time-animation) linear infinite;
        }

        .aether-morph-loader svg #aether-loader-clipping polygon:nth-child(7) {
          transform-origin: 60% 40%;
          animation: aether-loader-rotation var(--time-animation) linear infinite;
          animation-delay: calc(var(--time-animation) / -1.5);
        }

        @keyframes aether-loader-rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes aether-loader-roundness {
          0% { filter: contrast(15); }
          20% { filter: contrast(3); }
          40% { filter: contrast(3); }
          60% { filter: contrast(15); }
          100% { filter: contrast(15); }
        }

        @keyframes aether-loader-colorize {
          0% { filter: hue-rotate(0deg); }
          20% { filter: hue-rotate(-30deg); }
          40% { filter: hue-rotate(-60deg); }
          60% { filter: hue-rotate(-90deg); }
          80% { filter: hue-rotate(-45deg); }
          100% { filter: hue-rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .aether-morph-loader,
          .aether-morph-loader svg #aether-loader-clipping,
          .aether-morph-loader svg #aether-loader-clipping polygon {
            animation: none !important;
            filter: none !important;
          }
        }
      `}</style>

      <div
        className={`aether-morph-loader ${className}`.trim()}
        style={{ '--size': scale, ...style }}
        aria-hidden="true"
      >
        <svg width={100} height={100} viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <mask id="aether-loader-clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        <div className="aether-loader-box" />
      </div>
    </>
  );
};

// ─── Exported components ────────────────────────────────────────────────────

/**
 * PageLoader — full-viewport centred loading overlay.
 *
 * Props:
 *  label   : optional status text below the indicator
 */
export const PageLoader = ({ label = 'Loading...' }) => {
  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '100svh',
        background: 'color-mix(in srgb, var(--bg-canvas, #F7F3EE) 90%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 'max(24px, var(--safe-top, 0px)) max(20px, var(--safe-right, 0px)) max(24px, var(--safe-bottom, 0px)) max(20px, var(--safe-left, 0px))',
        animation: 'aether-fade-in 0.28s cubic-bezier(0.2, 0, 0, 1) both',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          gap: '14px',
          width: 'min(100%, 280px)',
          margin: '0 auto',
        }}
      >
        <MorphingLoader />

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
