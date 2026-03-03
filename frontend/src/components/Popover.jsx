/**
 * AetherTrack 2030 Popover Component
 * Reference: System_UI_Shift.md Section 2.2 - Modal System → Layered Surface System
 * 
 * Features:
 * - Inline anchored, no backdrop
 * - Click outside to close
 * - Various placement options
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Popover Placement
 */
const PLACEMENTS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  'TOP-START': 'top-start',
  'TOP-END': 'top-end',
  'BOTTOM-START': 'bottom-start',
  'BOTTOM-END': 'bottom-end',
  'LEFT-START': 'left-start',
  'LEFT-END': 'left-end',
  'RIGHT-START': 'right-start',
  'RIGHT-END': 'right-end',
};

/**
 * Popover Component
 */
const Popover = ({
  isOpen,
  onClose,
  trigger,
  children,
  placement = PLACEMENTS.BOTTOM,
  offset = 8,
  withArrow = true,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Calculate position based on placement
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    // Get base placement (top, bottom, left, right)
    const basePlacement = placement.split('-')[0];
    const alignment = placement.split('-')[1];

    switch (basePlacement) {
      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        break;
      case 'left':
        left = triggerRect.left - popoverRect.width - offset;
        break;
      case 'right':
        left = triggerRect.right + offset;
        break;
      default:
        top = triggerRect.bottom + offset;
    }

    // Handle alignment
    if (alignment === 'start') {
      if (basePlacement === 'top' || basePlacement === 'bottom') {
        left = triggerRect.left;
      } else {
        top = triggerRect.top;
      }
    } else if (alignment === 'end') {
      if (basePlacement === 'top' || basePlacement === 'bottom') {
        left = triggerRect.right - popoverRect.width;
      } else {
        top = triggerRect.bottom - popoverRect.height;
      }
    } else {
      // Center alignment
      if (basePlacement === 'top' || basePlacement === 'bottom') {
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
      } else {
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
      }
    }

    setPosition({ top, left });
    
    // Calculate arrow position
    let arrowTop = 0;
    let arrowLeft = 0;
    const arrowSize = 8;

    switch (basePlacement) {
      case 'top':
        arrowTop = popoverRect.height - arrowSize / 2;
        arrowLeft = popoverRect.width / 2 - arrowSize / 2;
        break;
      case 'bottom':
        arrowTop = -arrowSize / 2;
        arrowLeft = popoverRect.width / 2 - arrowSize / 2;
        break;
      case 'left':
        arrowLeft = popoverRect.width - arrowSize / 2;
        arrowTop = popoverRect.height / 2 - arrowSize / 2;
        break;
      case 'right':
        arrowLeft = -arrowSize / 2;
        arrowTop = popoverRect.height / 2 - arrowSize / 2;
        break;
    }
    
    setArrowPosition({ top: arrowTop, left: arrowLeft });
  }, [placement, offset]);

  // Update position when opened
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      
      // Recalculate on resize
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
      
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition, true);
      };
    }
  }, [isOpen, calculatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) {
        return;
      }
      onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Get arrow rotation based on placement
  const getArrowRotation = () => {
    const basePlacement = placement.split('-')[0];
    switch (basePlacement) {
      case 'top':
        return 'rotate(180deg)';
      case 'bottom':
        return 'rotate(0deg)';
      case 'left':
        return 'rotate(90deg)';
      case 'right':
        return 'rotate(-90deg)';
      default:
        return 'rotate(0deg)';
    }
  };

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} onClick={() => isOpen ? onClose?.() : null}>
        {trigger}
      </div>

      {/* Popover */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          role="popover"
          aria-modal="false"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 'var(--z-popover)',
          }}
          className={`
            bg-[var(--bg-raised)]
            border border-[var(--border-soft)]
            rounded-[var(--r-lg)]
            shadow-[var(--shadow-lg)]
            py-2 px-0
            min-w-[200px]
            animate-fade-in
          `}
        >
          {/* Arrow */}
          {withArrow && (
            <div
              className="absolute w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent"
              style={{
                top: arrowPosition.top,
                left: arrowPosition.left,
                borderTopColor: 'var(--border-soft)',
                transform: getArrowRotation(),
              }}
              aria-hidden="true"
            />
          )}
          
          {/* Content */}
          <div className="py-1">
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

/**
 * Popover Item
 */
const PopoverItem = ({ 
  children, 
  onClick, 
  icon, 
  disabled = false,
  destructive = false,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-sm text-left
        transition-colors duration-[var(--fast)]
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : destructive 
            ? 'text-[var(--danger)] hover:bg-[var(--danger-dim)]'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

/**
 * Popover Separator
 */
const PopoverSeparator = () => (
  <div className="my-1 border-t border-[var(--border-hair)]" />
);

/**
 * Popover Label
 */
const PopoverLabel = ({ children, className = '' }) => (
  <div className={`px-4 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider ${className}`}>
    {children}
  </div>
);

export default Popover;
export { Popover, PopoverItem, PopoverSeparator, PopoverLabel, PLACEMENTS };
