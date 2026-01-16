import { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Check if mobile/tablet on mount and load collapsed state
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      // Close sidebar on desktop
      if (window.innerWidth >= 1024) {
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

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        isMobile,
        isCollapsed,
        toggleMobileSidebar,
        closeMobileSidebar,
        toggleCollapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
