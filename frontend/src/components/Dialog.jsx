/**
 * AetherTrack 2030 Dialog Component
 * Reference: System_UI_Shift.md Section 2.2 - Modal System → Layered Surface System
 * 
 * Features:
 * - Centered desktop, max 560px
 * - Destructive actions only
 * - Focus trap
 * - Escape to close
 */

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Dialog Component
 */
const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  description,
  size = 'md', // sm, md, lg
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  isDestructive = false,
}) => {
  const dialogRef = useRef(null);
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

    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus the dialog
    dialog.focus();

    // Handle tab key for focus trap
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = dialog.querySelectorAll(
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
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-description' : undefined}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-[var(--bg-raised)]
          border border-[var(--border-soft)]
          rounded-[var(--r-xl)]
          shadow-[var(--shadow-xl)]
          animate-scale-in
        `}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-hair)]">
            {title && (
              <h2 
                id="dialog-title" 
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] rounded-[var(--r-md)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p 
            id="dialog-description" 
            className="px-4 pt-4 text-sm text-[var(--text-secondary)]"
          >
            {description}
          </p>
        )}

        {/* Content */}
        <div className="p-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border-hair)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Dialog;
