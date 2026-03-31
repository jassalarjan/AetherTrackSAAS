/**
 * AetherTrack 2030 Toast Component
 * Reference: System_UI_Shift.md Section 2.2 - Modal System → Layered Surface System
 * 
 * Features:
 * - Bottom-right stack position
 * - Auto-dismiss
 * - Multiple toast types (success, error, warning, info)
 * - Stacked animations
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Toast Types
 */
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Default duration
 */
const DEFAULT_DURATION = 5000;

/**
 * Toast Context
 */
const ToastContext = createContext(undefined);

/**
 * Hook to use toast
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

/**
 * Toast Provider
 */
export const ToastProvider = ({ children, position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState([]);
  
  // Add toast
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: toast.type || TOAST_TYPES.INFO,
      title: toast.title,
      message: toast.message,
      duration: toast.duration ?? DEFAULT_DURATION,
      action: toast.action,
      onAction: toast.onAction,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }, []);
  
  // Remove toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  // Convenience methods
  const success = useCallback((title, message, options) => 
    addToast({ type: TOAST_TYPES.SUCCESS, title, message, ...options }), [addToast]);
  
  const error = useCallback((title, message, options) => 
    addToast({ type: TOAST_TYPES.ERROR, title, message, ...options }), [addToast]);
  
  const warning = useCallback((title, message, options) => 
    addToast({ type: TOAST_TYPES.WARNING, title, message, ...options }), [addToast]);
  
  const info = useCallback((title, message, options) => 
    addToast({ type: TOAST_TYPES.INFO, title, message, ...options }), [addToast]);
  
  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    // Simple toast function for compatibility with reference UI
    toast: (message, type = 'info') => {
      addToast({ type, message });
    },
  };
  
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} position={position} />
    </ToastContext.Provider>
  );
};

/**
 * Toast Icons
 */
const ToastIcons = {
  [TOAST_TYPES.SUCCESS]: (
    <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  [TOAST_TYPES.ERROR]: (
    <svg className="w-5 h-5 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  [TOAST_TYPES.WARNING]: (
    <svg className="w-5 h-5 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  [TOAST_TYPES.INFO]: (
    <svg className="w-5 h-5 text-[var(--ai-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

/**
 * Toast Container
 */
const ToastContainer = ({ toasts, onRemove, position }) => {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };
  
  return (
    <div 
      className={`fixed ${positionClasses[position]} flex flex-col gap-2 max-w-sm w-full pointer-events-none`}
      style={{ zIndex: 9999 }}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast, index) => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  );
};

/**
 * Individual Toast
 */
const Toast = ({ toast, onRemove, style }) => {
  const { type, title, message, action, onAction } = toast;
  
  // Handle reduced motion
  const reducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        pointer-events-auto
        bg-[var(--bg-raised)]
        border border-[var(--border-soft)]
        rounded-[var(--r-lg)]
        shadow-[var(--shadow-lg)]
        p-4
        flex items-start gap-3
        animate-slide-up
        ${reducedMotion ? 'reduced-motion' : ''}
      `}
      style={style}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {ToastIcons[type]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-medium text-[var(--text-primary)]">
            {title}
          </p>
        )}
        {message && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {message}
          </p>
        )}
        {action && (
          <button
            onClick={onAction}
            className="mt-2 text-sm font-medium text-[var(--brand)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 rounded"
          >
            {action}
          </button>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-base)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ToastProvider;
