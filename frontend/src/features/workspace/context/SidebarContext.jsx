/**
 * AetherTrack 2030 Sidebar Context
 * Reference: System_UI_Shift.md Section 2.1 - ResponsivePageLayout → AdaptiveShell
 * 
 * Implements:
 * - Three shell modes: Focus, Operational, Command
 * - Collapsible sidebar: 64px collapsed → 240px expanded
 * - Mobile bottom nav (5 items max)
 * - Active state with 3px accent bar
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const SidebarContext = createContext(undefined);

/**
 * Shell modes per spec Section 2.1
 */
export const SHELL_MODES = {
  FOCUS: 'focus',     // No sidebar, minimal header (Kanban, Gantt, Calendar)
  OPERATIONAL: 'operational', // Collapsible sidebar 64px→240px (Dashboards, Lists)
  COMMAND: 'command',  // No chrome, pure CMD+K palette (power user)
};

/**
 * Hook to use sidebar context
 * @returns {Object} Sidebar context value
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

/**
 * Sidebar Provider Component
 * @param {React.ReactNode} children - Child components
 */
export const SidebarProvider = ({ children }) => {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Sidebar collapsed/expanded state
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Shell mode
  const [shellMode, setShellMode] = useState(SHELL_MODES.OPERATIONAL);
  
  // Bottom nav visibility (mobile only)
  const [showBottomNav, setShowBottomNav] = useState(false);
  
  // Favorites rail (user-pinned items)
  const [favorites, setFavorites] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('sidebarFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      const smallMobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowBottomNav(smallMobile);   // only show bottom nav on phones, not tablets
      
      // Close sidebar on desktop
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    // Load collapse state from localStorage
    const savedCollapseState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapseState !== null) {
      setIsCollapsed(JSON.parse(savedCollapseState));
    }

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine shell mode based on route — keep sidebar visible for all normal
  // product routes, and only hide chrome on explicit command routes.
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;

    if (/^\/command(?:\/|$)/.test(path)) {
      setShellMode(SHELL_MODES.COMMAND);
    } else {
      setShellMode(SHELL_MODES.OPERATIONAL);
    }
  }, [location.pathname]);

  // Toggle mobile sidebar
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  // Close mobile sidebar
  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Toggle collapsed state
  const toggleCollapse = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  }, [isCollapsed]);

  // Set shell mode
  const setShellModeValue = useCallback((mode) => {
    if (Object.values(SHELL_MODES).includes(mode)) {
      setShellMode(mode);
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((itemId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem('sidebarFavorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  // Reorder favorites
  const reorderFavorites = useCallback((newOrder) => {
    setFavorites(newOrder);
    localStorage.setItem('sidebarFavorites', JSON.stringify(newOrder));
  }, []);

  // Check if sidebar should be visible
  const isSidebarVisible = shellMode !== SHELL_MODES.FOCUS && shellMode !== SHELL_MODES.COMMAND;

  // Context value
  const value = {
    // State
    isMobile,
    isMobileOpen,
    isCollapsed,
    shellMode,
    showBottomNav,
    favorites,
    isSidebarVisible,
    
    // Actions
    toggleMobileSidebar,
    closeMobileSidebar,
    toggleCollapse,
    setShellMode: setShellModeValue,
    toggleFavorite,
    reorderFavorites,
    
    // Constants
    SHELL_MODES,
    
    // Sizes (per spec)
    sidebarWidthCollapsed: '64px',
    sidebarWidthExpanded: '284px',
    sidebarActiveBarWidth: '3px',
    bottomNavHeight: '64px',
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContext;
