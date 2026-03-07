/**
 * AetherTrack 2030 Button Component
 * Reference: System_UI_Shift.md Section 4.2 - Buttons
 * 
 * Features:
 * - Variants: Primary, Secondary, Ghost, Danger, Link
 * - Sizes: sm (32px), md (40px), lg (48px)
 * - Loading: shimmer fill left→right (not spinner)
 * - Hover: scale(1.01) + shadow increase
 * - Focus: 2px offset ring using --brand
 * - Icon-only: always requires aria-label + tooltip
 */

import { forwardRef, useMemo } from 'react';

/**
 * Button Variants
 */
const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DANGER: 'danger',
  LINK: 'link',
};

/**
 * Button Sizes
 */
const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
};

/**
 * Button Component
 */
const Button = forwardRef(({
  children,
  variant = BUTTON_VARIANTS.PRIMARY,
  size = BUTTON_SIZES.MD,
  isLoading = false,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  fullWidth = false,
  type = 'button',
  ariaLabel,
  ...props
}, ref) => {
  // Size classes
  const sizeClasses = useMemo(() => {
    switch (size) {
      case BUTTON_SIZES.SM:
        return 'h-8 px-3 text-sm';
      case BUTTON_SIZES.LG:
        return 'h-12 px-6 text-base';
      case BUTTON_SIZES.MD:
      default:
        return 'h-10 px-4 text-sm';
    }
  }, [size]);

  // Variant classes
  const variantClasses = useMemo(() => {
    switch (variant) {
      case BUTTON_VARIANTS.SECONDARY:
        return 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border border-[var(--border-soft)]';
      case BUTTON_VARIANTS.GHOST:
        return 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]';
      case BUTTON_VARIANTS.DANGER:
        return 'bg-[var(--danger)] text-white hover:opacity-90';
      case BUTTON_VARIANTS.LINK:
        return 'bg-transparent text-[var(--brand)] hover:text-[var(--brand-light)] hover:underline p-0 h-auto';
      case BUTTON_VARIANTS.PRIMARY:
      default:
        return 'bg-[var(--brand)] text-white hover:bg-[var(--brand-light)]';
    }
  }, [variant]);

  // Base classes
  const baseClasses = useMemo(() => [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-[var(--r-md)]',
    'transition-all duration-[var(--fast)]',
    'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.99]',
    fullWidth && 'w-full',
  ].filter(Boolean).join(' '), [fullWidth]);

  // Hover scale effect (only for primary and danger)
  const hoverClasses = useMemo(() => {
    if (variant === BUTTON_VARIANTS.PRIMARY || variant === BUTTON_VARIANTS.DANGER) {
      return 'hover:scale-[1.01] hover:shadow-md';
    }
    return '';
  }, [variant]);

  // Loading shimmer animation
  const isShimmerLoading = isLoading;

  // Combine all classes
  const combinedClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    hoverClasses,
    className,
  ].filter(Boolean).join(' ');

  // Button content
  const content = (
    <>
      {isShimmerLoading && (
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
          <span 
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            aria-hidden="true"
          />
        </span>
      )}
      {!isShimmerLoading && leftIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className={isShimmerLoading ? 'opacity-70' : ''}>
        {children}
      </span>
      {!isShimmerLoading && rightIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </>
  );

  // Render based on variant
  if (variant === BUTTON_VARIANTS.LINK) {
    return (
      <button
        ref={ref}
        type={type}
        className={combinedClasses}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        {...props}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`${combinedClasses} relative overflow-hidden`}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      aria-busy={isLoading}
      {...props}
    >
      {content}
    </button>
  );
});

Button.displayName = 'Button';

/**
 * Icon Button Component (for icon-only buttons)
 */
const IconButton = forwardRef(({
  children,
  variant = BUTTON_VARIANTS.GHOST,
  size = BUTTON_SIZES.MD,
  isLoading = false,
  disabled = false,
  className = '',
  ariaLabel,
  tooltip,
  ...props
}, ref) => {
  // Size classes for icon buttons
  const sizeClasses = useMemo(() => {
    switch (size) {
      case BUTTON_SIZES.SM:
        return 'w-8 h-8';
      case BUTTON_SIZES.LG:
        return 'w-12 h-12';
      case BUTTON_SIZES.MD:
      default:
        return 'w-10 h-10';
    }
  }, [size]);

  // Variant classes
  const variantClasses = useMemo(() => {
    switch (variant) {
      case BUTTON_VARIANTS.PRIMARY:
        return 'bg-[var(--brand)] text-white hover:bg-[var(--brand-light)]';
      case BUTTON_VARIANTS.SECONDARY:
        return 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border border-[var(--border-soft)]';
      case BUTTON_VARIANTS.DANGER:
        return 'bg-[var(--danger)] text-white hover:opacity-90';
      case BUTTON_VARIANTS.GHOST:
      default:
        return 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]';
    }
  }, [variant]);

  const baseClasses = [
    'inline-flex items-center justify-center',
    'rounded-[var(--r-md)]',
    'transition-all duration-[var(--fast)]',
    'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95',
  ].filter(Boolean).join(' ');

  const combinedClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={combinedClasses}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      title={tooltip}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        children
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';

export default Button;
export { Button, IconButton, BUTTON_VARIANTS, BUTTON_SIZES };
