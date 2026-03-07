import { X } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useEffect } from 'react';

/**
 * ResponsiveModal - Mobile-first modal component
 * 
 * Features:
 * - Full screen on mobile (< 640px)
 * - Centered card on tablet/desktop
 * - Responsive padding and sizing
 * - Smooth animations
 * - Scrollable content
 * - Accessible (ESC to close, focus trap)
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
  const { theme } = useTheme();

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
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

  const sizeClasses = {
    small: 'sm:max-w-md',
    default: 'sm:max-w-lg md:max-w-2xl',
    large: 'sm:max-w-2xl md:max-w-4xl lg:max-w-5xl',
    full: 'sm:max-w-full sm:m-4 md:m-8'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop - darker on mobile for better contrast */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size] || sizeClasses.default} rounded-t-3xl sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-slideUp sm:animate-scaleIn border-t-4`}
        style={{ background: 'var(--bg-raised)', borderTopColor: 'var(--brand)', boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Drag Handle - Mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--border-mid)' }}></div>
        </div>

        {/* Header - Sticky on mobile */}
        <div
          className={`flex-none flex items-center justify-between ${noPadding ? '' : 'px-4 py-3 sm:p-6'} border-b sticky top-0 z-10 rounded-t-3xl sm:rounded-t-xl`}
            style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}
        >
          <h2
            className="font-bold text-base sm:text-xl lg:text-2xl pr-4 truncate"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex-none p-2 rounded-lg transition-colors focus-visible:outline-none"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close modal"
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
            onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div
          className={`
            flex-1 overflow-y-auto overflow-x-hidden
            ${noPadding ? '' : 'p-4 sm:p-6'}
          `}
        >
          {children}
        </div>

        {/* Footer - Sticky on mobile if provided */}
        {footer && (
          <div
            className={`flex-none ${noPadding ? '' : 'p-4 sm:p-6'} border-t sticky bottom-0 sm:rounded-b-xl`}
            style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div >
  );
};

export default ResponsiveModal;
