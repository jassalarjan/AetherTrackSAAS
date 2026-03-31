/**
 * AetherTrack 2030 Drawer Component
 * Reference: System_UI_Shift.md Section 2.2 - Modal System → Layered Surface System
 * 
 * Features:
 * - Right panel 480px (detail views, replaces most modals)
 * - Slide-in animation
 * - Focus trap
 * - Mobile: full-screen slide-up
 */

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Drawer Component
 */
const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  description,
  size = 'md', // sm, md, lg, full
  position = 'right', // right, left
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  renderHeader,
}) => {
  const drawerRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Store the currently focused element before opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    // Focus the drawer
    drawer.focus();

    // Handle tab key for focus trap
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = drawer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when open
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

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', // 480px
    lg: 'max-w-lg',
    full: 'max-w-full',
  };

  // Position classes
  const positionClasses = {
    right: 'right-0 top-0 h-full border-l',
    left: 'left-0 top-0 h-full border-r',
  };

  // Animation classes
  const animationClasses = {
    right: {
      enter: 'animate-slide-in-right',
      exit: 'animate-slide-out-right',
    },
    left: {
      enter: 'animate-slide-in-left',
      exit: 'animate-slide-out-left',
    },
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex"
      style={{ zIndex: 9999 }}
      role="presentation"
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby={description ? 'drawer-description' : undefined}
        className={`
          relative w-full ${sizeClasses[size]} ${positionClasses[position]}
          bg-[var(--bg-raised)]
          border-[var(--border-hair)]
          shadow-[var(--shadow-xl)]
          animate-slide-in-right
          flex flex-col
          focus:outline-none
        `}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton || renderHeader) && (
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-hair)] flex-shrink-0">
            <div>
              {title && (
                <h2 
                  id="drawer-title" 
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  id="drawer-description" 
                  className="text-sm text-[var(--text-secondary)] mt-1"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] rounded-[var(--r-md)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ml-4"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Custom Header Render */}
        {renderHeader && (
          <div className="flex-shrink-0">
            {renderHeader()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border-hair)] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Drawer;
