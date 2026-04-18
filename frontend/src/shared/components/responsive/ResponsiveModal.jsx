import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * ResponsiveModal - Mobile-first modal component
 * Uses React Portal to render outside the main app hierarchy
 * 
 * Features:
 * - Renders at document.body level via Portal
 * - Full screen on mobile (< 640px)
 * - Centered card on tablet/desktop
 * - Smooth animations
 * - Scrollable content
 * - Accessible (ESC to close, focus trap)
 * 
 * NOTE: Using inline styles for reliability. The original Tailwind-based
 * implementation had issues with modal visibility - this inline-styled
 * version ensures consistent behavior across different environments.
 */
const ResponsiveModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'default', // 'small', 'default', 'large', 'full'
  noPadding = false
}) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Size configurations for max-width
  const sizeMaxWidths = {
    small: '28rem',    // max-w-md
    default: '42rem', // max-w-2xl
    large: '64rem',    // max-w-5xl
    full: 'min(100vw - 1rem, 1440px)'
  };

  // Render at document body level using Portal
  // Using inline styles for reliability - ensures modal visibility
  // Using design system z-index value from CSS custom property
  const zIndexValue = getComputedStyle(document.documentElement).getPropertyValue('--z-modal').trim() || '2147483400';
  
  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: parseInt(zIndexValue),
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal'}
    >
      <div style={{
        background: 'var(--bg-raised)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: sizeMaxWidths[size] || sizeMaxWidths.default,
        width: '100%',
        maxHeight: 'calc(100dvh - 2rem)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-xl)'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-soft)',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          flex: 'none'
        }}>
          <h2 style={{
            fontWeight: 'bold',
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)',
            margin: 0,
            paddingRight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none'
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: noPadding ? '0' : '16px 24px',
          minHeight: '100px'
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            flex: 'none',
            padding: noPadding ? '0' : '12px 16px',
            borderTop: '1px solid var(--border-soft)',
            background: 'var(--bg-raised)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ResponsiveModal;
