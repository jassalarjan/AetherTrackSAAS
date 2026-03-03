import { useTheme } from '../../context/ThemeContext';

/**
 * ResponsiveCard - A mobile-first card component
 * 
 * Features:
 * - Responsive padding (smaller on mobile)
 * - Optional hover effects
 * - Consistent theming
 * - Flexible layout
 */
const ResponsiveCard = ({ 
  children, 
  className = '',
  noPadding = false,
  hover = false,
  onClick
}) => {
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-colors ${noPadding ? '' : 'p-4 sm:p-6'} ${hover ? 'cursor-pointer' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--bg-raised)',
        borderColor: 'var(--border-soft)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveCard;
