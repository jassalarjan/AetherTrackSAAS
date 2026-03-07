import { useEffect } from 'react';
import { X, AlertTriangle, Trash2, LogOut, Info } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger', 'warning', 'info'
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Variant styles
  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: isDark ? 'bg-red-500/10' : 'bg-red-50',
      iconColor: 'text-red-500',
      buttonBg: 'aether-btn-danger',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
      iconColor: 'text-yellow-500',
      buttonBg: 'aether-btn-warning',
    },
    logout: {
      icon: LogOut,
      iconBg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
      iconColor: 'text-orange-500',
      buttonBg: 'aether-btn-danger',
    },
    info: {
      icon: Info,
      iconBg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      iconColor: 'text-blue-500',
      buttonBg: 'aether-btn-primary',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.info;
  const Icon = currentVariant.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={!isLoading ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-xl animate-scale-in overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
          onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
          onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full ${currentVariant.iconBg}`}>
              <Icon size={24} className={currentVariant.iconColor} />
            </div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--border-soft)', color: 'var(--text-primary)' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-mid)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.background = 'var(--border-soft)'; }}
              onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
              onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`aether-btn ${currentVariant.buttonBg}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
