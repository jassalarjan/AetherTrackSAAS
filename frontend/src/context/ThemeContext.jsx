/**
 * AetherTrack 2030 Theme System
 * Reference: System_UI_Shift.md Section 10 - Theme System Enhancements
 * 
 * Implements:
 * - System auto (follows OS preference)
 * - Light / Dark modes via data-theme attribute
 * - 5 color schemes (blue, purple, green, orange, pink)
 * - Compact density mode (−15% padding/font-size)
 * - High contrast mode (WCAG AAA)
 * - Custom enterprise branding (logo upload + primary color)
 * - Theme persistence (localStorage)
 * - Server-side theme persistence support
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const ThemeContext = createContext(undefined);

/**
 * Hook to use theme context
 * @returns {Object} Theme context value
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * Available themes
 */
export const THEMES = {
  light: 'light',
  dark: 'dark',
  auto: 'auto',
};

/**
 * Available color schemes (5 schemes per spec)
 */
export const COLOR_SCHEMES = {
  blue: {
    name: 'Blue',
    primaryHex: '#2563eb',
  },
  purple: {
    name: 'Purple',
    primaryHex: '#9333ea',
  },
  green: {
    name: 'Green',
    primaryHex: '#16a34a',
  },
  orange: {
    name: 'Orange',
    primaryHex: '#ea580c',
  },
  pink: {
    name: 'Pink',
    primaryHex: '#db2777',
  },
};

/**
 * Density modes
 */
export const DENSITY_MODES = {
  default: 'default',
  compact: 'compact',
};

/**
 * Contrast modes
 */
export const CONTRAST_MODES = {
  default: 'default',
  high: 'high',
};

/**
 * Theme Provider Component
 * @param {React.ReactNode} children - Child components
 */
export const ThemeProvider = ({ children }) => {
  // Theme mode: 'light', 'dark', or 'auto'
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return THEMES.light;
    return localStorage.getItem('theme') || THEMES.light;
  });

  // Color scheme: 'blue', 'purple', 'green', 'orange', 'pink'
  const [colorScheme, setColorScheme] = useState(() => {
    if (typeof window === 'undefined') return 'blue';
    return localStorage.getItem('colorScheme') || 'blue';
  });

  // Density mode: 'default' or 'compact'
  const [densityMode, setDensityMode] = useState(() => {
    if (typeof window === 'undefined') return DENSITY_MODES.default;
    return localStorage.getItem('densityMode') || DENSITY_MODES.default;
  });

  // Contrast mode: 'default' or 'high'
  const [contrastMode, setContrastMode] = useState(() => {
    if (typeof window === 'undefined') return CONTRAST_MODES.default;
    return localStorage.getItem('contrastMode') || CONTRAST_MODES.default;
  });

  // Enterprise branding (loaded from server/localStorage)
  const [enterpriseBranding, setEnterpriseBranding] = useState(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('enterpriseBranding');
    return stored ? JSON.parse(stored) : null;
  });

  // Get effective theme (resolves 'auto' to actual theme)
  const effectiveTheme = useMemo(() => {
    if (theme !== THEMES.auto) return theme;
    
    // Check system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? THEMES.dark 
        : THEMES.light;
    }
    return THEMES.light;
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Set data-theme attribute (replaces class-based dark mode)
    if (effectiveTheme === THEMES.dark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }

    // Set color scheme as data-scheme attribute
    root.setAttribute('data-scheme', colorScheme);
    
    // Also set the color scheme as data-theme when not dark
    if (effectiveTheme === THEMES.dark) {
      root.setAttribute('data-theme', `dark-${colorScheme}`);
    } else {
      root.setAttribute('data-theme', colorScheme);
    }
    
    // Set density mode
    root.setAttribute('data-density', densityMode);
    
    // Set contrast mode
    root.setAttribute('data-contrast', contrastMode);
    
    // Set CSS custom property for primary color (use enterprise brand if set)
    const primaryColor = enterpriseBranding?.primaryColor || COLOR_SCHEMES[colorScheme]?.primaryHex;
    if (primaryColor) {
      root.style.setProperty('--color-primary', primaryColor);
      root.style.setProperty('--brand', primaryColor);
    }
    
    // Persist to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorScheme', colorScheme);
    localStorage.setItem('densityMode', densityMode);
    localStorage.setItem('contrastMode', contrastMode);
    if (enterpriseBranding) {
      localStorage.setItem('enterpriseBranding', JSON.stringify(enterpriseBranding));
    }
  }, [effectiveTheme, theme, colorScheme, densityMode, contrastMode, enterpriseBranding]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== THEMES.auto) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const root = document.documentElement;
      const newTheme = e.matches ? THEMES.dark : THEMES.light;
      root.setAttribute('data-theme', newTheme === THEMES.dark ? `dark-${colorScheme}` : colorScheme);
    };
    
    // Apply initial value
    handleChange({ matches: mediaQuery.matches });
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, colorScheme]);

  // Toggle through theme modes
  const toggleTheme = useCallback(() => {
    const themeOrder = [THEMES.light, THEMES.dark, THEMES.auto];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [theme]);

  // Set specific theme mode
  const setThemeMode = useCallback((newTheme) => {
    if (Object.values(THEMES).includes(newTheme)) {
      setTheme(newTheme);
    }
  }, []);

  // Set color scheme
  const setColorSchemeMode = useCallback((newColorScheme) => {
    if (COLOR_SCHEMES[newColorScheme]) {
      setColorScheme(newColorScheme);
    }
  }, []);

  // Toggle density mode
  const toggleDensity = useCallback(() => {
    setDensityMode(prev => 
      prev === DENSITY_MODES.default 
        ? DENSITY_MODES.compact 
        : DENSITY_MODES.default
    );
  }, []);

  // Set density mode
  const setDensityModeValue = useCallback((newDensity) => {
    if (Object.values(DENSITY_MODES).includes(newDensity)) {
      setDensityMode(newDensity);
    }
  }, []);

  // Toggle contrast mode
  const toggleContrast = useCallback(() => {
    setContrastMode(prev => 
      prev === CONTRAST_MODES.default 
        ? CONTRAST_MODES.high 
        : CONTRAST_MODES.default
    );
  }, []);

  // Set contrast mode
  const setContrastModeValue = useCallback((newContrast) => {
    if (Object.values(CONTRAST_MODES).includes(newContrast)) {
      setContrastMode(newContrast);
    }
  }, []);

  // Update enterprise branding
  const updateEnterpriseBranding = useCallback((branding) => {
    setEnterpriseBranding(prev => ({
      ...prev,
      ...branding,
    }));
  }, []);

  // Clear enterprise branding
  const clearEnterpriseBranding = useCallback(() => {
    setEnterpriseBranding(null);
    localStorage.removeItem('enterpriseBranding');
  }, []);

  // Build color scheme object for backwards compatibility
  const currentColorScheme = useMemo(() => {
    const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.blue;
    const hex = enterpriseBranding?.primaryColor || scheme.primaryHex;
    
    return {
      primary: `bg-[${hex}]`,
      primaryHover: `hover:bg-[${hex}]`,
      primaryText: `text-[${hex}]`,
      primaryLight: `bg-[${hex}]`,
      primaryRing: `ring-[${hex}]`,
    };
  }, [colorScheme, enterpriseBranding]);

  // Build theme object for backwards compatibility
  const currentTheme = useMemo(() => {
    const isDark = effectiveTheme === THEMES.dark;
    
    return {
      surface: isDark ? 'bg-[#1c2027]' : 'bg-white',
      surfaceElevated: isDark ? 'bg-[#282f39]' : 'bg-white',
      text: isDark ? 'text-white' : 'text-gray-900',
      textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
      textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
      border: isDark ? 'border-[#3e454f]' : 'border-gray-200',
      hover: isDark ? 'hover:bg-[#323941]' : 'hover:bg-gray-50',
      focus: isDark ? 'focus:ring-blue-400' : 'focus:ring-blue-500',
    };
  }, [effectiveTheme]);

  // Context value
  const value = useMemo(() => ({
    // Theme
    theme,
    effectiveTheme,
    setTheme: setThemeMode,
    toggleTheme,
    
    // Color scheme
    colorScheme,
    setColorScheme: setColorSchemeMode,
    colorSchemes: COLOR_SCHEMES,
    
    // Backwards compatibility - color scheme
    currentColorScheme,
    
    // Backwards compatibility - theme
    currentTheme,
    
    // Density
    densityMode,
    setDensity: setDensityModeValue,
    toggleDensity,
    isCompact: densityMode === DENSITY_MODES.compact,
    
    // Contrast
    contrastMode,
    setContrast: setContrastModeValue,
    toggleContrast,
    isHighContrast: contrastMode === CONTRAST_MODES.high,
    
    // Enterprise branding
    enterpriseBranding,
    updateEnterpriseBranding,
    clearEnterpriseBranding,
    
    // Constants
    themes: THEMES,
    densityModes: DENSITY_MODES,
    contrastModes: CONTRAST_MODES,
  }), [
    theme, effectiveTheme, setThemeMode, toggleTheme,
    colorScheme, setColorSchemeMode,
    currentColorScheme,
    currentTheme,
    densityMode, setDensityModeValue, toggleDensity,
    contrastMode, setContrastModeValue, toggleContrast,
    enterpriseBranding, updateEnterpriseBranding, clearEnterpriseBranding,
  ]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
