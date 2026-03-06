/**
 * AetherTrack 2030 Theme Toggle Component
 * Reference: System_UI_Shift.md Section 10 - Theme System Enhancements
 * 
 * Includes:
 * - Theme toggle (Light/Dark/Auto)
 * - Color scheme picker (5 schemes)
 * - Density mode (Default/Compact)
 * - Contrast mode (Default/High)
 */

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette, 
  ChevronDown, 
  Minimize2,
  Maximize2,
  Contrast,
} from 'lucide-react';

/**
 * Theme Toggle Component
 */
const ThemeToggle = ({ className = '' }) => {
  const { 
    theme, 
    colorScheme, 
    toggleTheme, 
    setTheme, 
    setColorScheme, 
    colorSchemes,
    densityMode,
    toggleDensity,
    contrastMode,
    toggleContrast,
    themes,
    densityModes,
    contrastModes,
    enterpriseBranding,
  } = useTheme();
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'auto':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getThemeName = () => {
    const themeNames = {
      light: 'Light',
      dark: 'Dark',
      auto: 'Auto',
    };
    return themeNames[theme] || 'Light';
  };

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-[var(--bg-raised)]',
          'border border-[var(--border-hair)]',
          'hover:bg-[var(--bg-base)]',
          'transition-colors duration-[var(--fast)]',
          'text-[var(--text-primary)]',
          'text-sm font-medium'
        )}
        aria-label="Theme settings"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        {/* Current theme icon */}
        {getThemeIcon()}
        
        {/* Color scheme indicator */}
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: colorSchemes[colorScheme]?.primaryHex || '#2563eb' }}
        />
        
        {/* Density indicator */}
        {densityMode === 'compact' && (
          <Minimize2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        )}
        
        {/* Contrast indicator */}
        {contrastMode === 'high' && (
          <Contrast className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        )}
        
        <ChevronDown 
          className={cn(
            'w-4 h-4 transition-transform duration-[var(--fast)]',
            showMenu && 'rotate-180'
          )} 
        />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div 
          className={cn(
            'absolute right-0 top-full mt-1.5 z-50',
            'w-64 bg-[var(--bg-raised)]',
            'rounded-lg shadow-[var(--shadow-lg)]',
            'border border-[var(--border-hair)]',
            'divide-y divide-[var(--border-hair)]'
          )}
          role="menu"
        >
          {/* Theme Section */}
          <div className="p-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Theme
            </div>
            {Object.entries(themes).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md',
                  'text-sm transition-colors',
                  theme === key 
                    ? 'bg-[var(--brand-dim)] text-[var(--brand)]' 
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                )}
                role="menuitem"
              >
                {key === 'light' && <Sun className="w-4 h-4" />}
                {key === 'dark' && <Moon className="w-4 h-4" />}
                {key === 'auto' && <Monitor className="w-4 h-4" />}
                <span>{value.charAt(0).toUpperCase() + value.slice(1)}</span>
                {key === 'auto' && (
                  <span className="ml-auto text-xs text-[var(--text-muted)]">System</span>
                )}
              </button>
            ))}
          </div>

          {/* Color Scheme Section */}
          <div className="p-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Color Scheme
            </div>
            <div className="grid grid-cols-5 gap-2 px-3 py-2 flex-wrap">
              {Object.entries(colorSchemes).map(([key, scheme]) => (
                <button
                  key={key}
                  onClick={() => setColorScheme(key)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    'hover:scale-110',
                    colorScheme === key && 'ring-2 ring-offset-2 ring-[var(--brand)]'
                  )}
                  style={{ backgroundColor: scheme.primaryHex }}
                  title={scheme.name}
                  aria-label={`${scheme.name} color scheme`}
                />
              ))}
            </div>
          </div>

          {/* Accessibility Section */}
          <div className="p-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Accessibility
            </div>
            
            {/* Density Toggle */}
            <button
              onClick={toggleDensity}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md',
                'text-sm transition-colors',
                densityMode === 'compact'
                  ? 'bg-[var(--brand-dim)] text-[var(--brand)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
              )}
              role="menuitem"
            >
              <div className="flex items-center gap-3">
                <Minimize2 className="w-4 h-4" />
                <span>Compact Mode</span>
              </div>
              <div className={cn(
                'w-8 h-5 rounded-full p-0.5 transition-colors',
                densityMode === 'compact' ? 'bg-[var(--brand)]' : 'bg-[var(--bg-surface)]'
              )}>
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  densityMode === 'compact' ? 'translate-x-3' : 'translate-x-0'
                )} />
              </div>
            </button>

            {/* Contrast Toggle */}
            <button
              onClick={toggleContrast}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md',
                'text-sm transition-colors',
                contrastMode === 'high'
                  ? 'bg-[var(--brand-dim)] text-[var(--brand)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
              )}
              role="menuitem"
            >
              <div className="flex items-center gap-3">
                <Contrast className="w-4 h-4" />
                <span>High Contrast</span>
              </div>
              <div className={cn(
                'w-8 h-5 rounded-full p-0.5 transition-colors',
                contrastMode === 'high' ? 'bg-[var(--brand)]' : 'bg-[var(--bg-surface)]'
              )}>
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  contrastMode === 'high' ? 'translate-x-3' : 'translate-x-0'
                )} />
              </div>
            </button>
          </div>

          {/* Enterprise Branding Section */}
          {enterpriseBranding && (
            <div className="p-2 border-t border-[var(--border-hair)]">
              <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Enterprise
              </div>
              <div className="flex items-center gap-3 px-3 py-2">
                {enterpriseBranding.logo && (
                  <img 
                    src={enterpriseBranding.logo} 
                    alt="Company logo" 
                    className="w-8 h-8 rounded object-contain"
                  />
                )}
                <span className="text-sm text-[var(--text-primary)]">
                  {enterpriseBranding.name || 'Branded'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
