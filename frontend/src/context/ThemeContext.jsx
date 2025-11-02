import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get saved theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  const [colorScheme, setColorScheme] = useState(() => {
    // Get saved color scheme from localStorage or default to 'blue'
    const savedScheme = localStorage.getItem('colorScheme');
    return savedScheme || 'blue';
  });

  // Available color schemes
  const colorSchemes = {
    blue: {
      name: 'Blue',
      primary: 'bg-blue-600',
      primaryHover: 'hover:bg-blue-700',
      primaryLight: 'bg-blue-50',
      primaryText: 'text-blue-600',
      accent: 'bg-blue-500',
      accentHover: 'hover:bg-blue-600',
      secondary: 'bg-green-600',
      secondaryHover: 'hover:bg-green-700',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      success: 'bg-green-500',
    },
    purple: {
      name: 'Purple',
      primary: 'bg-purple-600',
      primaryHover: 'hover:bg-purple-700',
      primaryLight: 'bg-purple-50',
      primaryText: 'text-purple-600',
      accent: 'bg-purple-500',
      accentHover: 'hover:bg-purple-600',
      secondary: 'bg-indigo-600',
      secondaryHover: 'hover:bg-indigo-700',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      success: 'bg-green-500',
    },
    green: {
      name: 'Green',
      primary: 'bg-green-600',
      primaryHover: 'hover:bg-green-700',
      primaryLight: 'bg-green-50',
      primaryText: 'text-green-600',
      accent: 'bg-green-500',
      accentHover: 'hover:bg-green-600',
      secondary: 'bg-blue-600',
      secondaryHover: 'hover:bg-blue-700',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      success: 'bg-emerald-500',
    },
    orange: {
      name: 'Orange',
      primary: 'bg-orange-600',
      primaryHover: 'hover:bg-orange-700',
      primaryLight: 'bg-orange-50',
      primaryText: 'text-orange-600',
      accent: 'bg-orange-500',
      accentHover: 'hover:bg-orange-600',
      secondary: 'bg-blue-600',
      secondaryHover: 'hover:bg-blue-700',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
      success: 'bg-green-500',
    },
    pink: {
      name: 'Pink',
      primary: 'bg-pink-600',
      primaryHover: 'hover:bg-pink-700',
      primaryLight: 'bg-pink-50',
      primaryText: 'text-pink-600',
      accent: 'bg-pink-500',
      accentHover: 'hover:bg-pink-600',
      secondary: 'bg-purple-600',
      secondaryHover: 'hover:bg-purple-700',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      success: 'bg-green-500',
    }
  };

  // Available themes (computed based on colorScheme)
  const getThemes = () => {
    const colorName = colorSchemes[colorScheme].primary.split('-')[1]; // e.g., 'blue' from 'bg-blue-600'
    return {
      light: {
        name: 'Light',
        background: 'bg-gray-50',
        surface: 'bg-white',
        surfaceSecondary: 'bg-gray-100',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        textMuted: 'text-gray-500',
        border: 'border-gray-300',
        borderSecondary: 'border-gray-400',
        shadow: 'shadow-md',
        hover: 'hover:bg-gray-50',
        focus: `focus:ring-${colorName}-500`,
      },
      dark: {
        name: 'Dark',
        background: 'bg-gray-900',
        surface: 'bg-gray-800',
        surfaceSecondary: 'bg-gray-700',
        text: 'text-white',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-400',
        border: 'border-gray-600',
        borderSecondary: 'border-gray-500',
        shadow: 'shadow-lg shadow-gray-900/50',
        hover: 'hover:bg-gray-700',
        focus: `focus:ring-${colorName}-400`,
      },
      auto: {
        name: 'Auto',
        // Will be determined by system preference
      }
    };
  };

  const themes = getThemes();

  // Get current theme (handle auto mode)
  const getCurrentTheme = () => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? themes.dark : themes.light;
    }
    return themes[theme];
  };

  // Apply theme to document
  useEffect(() => {
    const currentTheme = getCurrentTheme();
    const root = document.documentElement;

    // Remove existing theme classes
    Object.values(themes).forEach(t => {
      if (t.name) {
        root.classList.remove(t.name.toLowerCase());
      }
    });

    // Add current theme class
    root.classList.add(currentTheme.name.toLowerCase());

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme, colorScheme]);

  // Apply color scheme
  useEffect(() => {
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setTheme('auto'); // Trigger re-render
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const toggleTheme = () => {
    const themeOrder = ['light', 'dark', 'auto'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const setThemeMode = (newTheme) => {
    setTheme(newTheme);
  };

  const setColorSchemeMode = (newScheme) => {
    setColorScheme(newScheme);
  };

  const value = {
    theme,
    colorScheme,
    currentTheme: getCurrentTheme(),
    currentColorScheme: colorSchemes[colorScheme],
    themes,
    colorSchemes,
    toggleTheme,
    setThemeMode,
    setColorSchemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};