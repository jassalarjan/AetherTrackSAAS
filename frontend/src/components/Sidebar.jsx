import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { useConfirmModal } from '../hooks/useConfirmModal';
import ConfirmModal from './modals/ConfirmModal';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BarChart3,
  Calendar,
  Grid3x3,
  Settings,
  UserCog,
  FileText,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  User as UserIcon,
  Building2,
  X,
  Clock,
  CalendarDays,
  Briefcase,
  FolderKanban,
  GitBranch,
  UserCircle,
  Search,
  Star,
  History,
  Pin,
  TrendingUp
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, currentTheme, currentColorScheme } = useTheme();
  const { isMobileOpen, isMobile, closeMobileSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const confirmModal = useConfirmModal();

  // Dropdown state management with localStorage persistence
  const [openDropdowns, setOpenDropdowns] = useState(() => {
    const saved = localStorage.getItem('sidebarDropdowns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sidebar dropdown state:', e);
      }
    }
    return {
      main: true,
      projects: false,
      hr: false,
      management: false
    };
  });

  // Pinned items state
  const [pinnedItems, setPinnedItems] = useState(() => {
    const saved = localStorage.getItem('sidebarPinnedItems');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse pinned items:', e);
      }
    }
    return [];
  });

  // Recent pages state
  const [recentPages, setRecentPages] = useState(() => {
    const saved = localStorage.getItem('sidebarRecentPages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse recent pages:', e);
      }
    }
    return [];
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Update recent pages
  useEffect(() => {
    if (location.pathname && location.pathname !== '/login' && location.pathname !== '/register') {
      setRecentPages(prev => {
        const newRecent = [location.pathname, ...prev.filter(p => p !== location.pathname)].slice(0, 5);
        localStorage.setItem('sidebarRecentPages', JSON.stringify(newRecent));
        return newRecent;
      });
    }
  }, [location.pathname]);

  const toggleDropdown = (section) => {
    setOpenDropdowns(prev => {
      const newState = {
        ...prev,
        [section]: !prev[section]
      };
      localStorage.setItem('sidebarDropdowns', JSON.stringify(newState));
      return newState;
    });
  };

  const togglePin = (path, e) => {
    e.stopPropagation();
    setPinnedItems(prev => {
      const isPinned = prev.includes(path);
      const newPinned = isPinned 
        ? prev.filter(p => p !== path)
        : [...prev, path];
      localStorage.setItem('sidebarPinnedItems', JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const isPinned = (path) => pinnedItems.includes(path);

  // Close sidebar when clicking on navigation item on mobile
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getAllMenuItems = () => {
    return [
      ...mainMenuItems,
      ...projectMenuItems,
      ...hrMenuItems.filter(canAccess),
      ...adminMenuItems.filter(canAccess)
    ];
  };

  const getMenuItemByPath = (path) => {
    return getAllMenuItems().find(item => item.path === path);
  };

  const getFilteredItems = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return getAllMenuItems().filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.path.toLowerCase().includes(query)
    );
  };

  const mainMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tasks', icon: CheckSquare, label: 'My Tasks' },
    { path: '/kanban', icon: Grid3x3, label: 'Kanban Board' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const projectMenuItems = [
    { path: '/my-projects', icon: Briefcase, label: 'My Projects' },
    { path: '/projects', icon: FolderKanban, label: 'Dashboard' },
    { path: '/sprints', icon: Briefcase, label: 'Sprints' },
    { path: '/projects/gantt', icon: GitBranch, label: 'Gantt Chart' },
    { path: '/resources', icon: UserCircle, label: 'Resources' },
  ];

  const hrMenuItems = [
    { path: '/hr/dashboard', icon: LayoutDashboard, label: 'HR Dashboard', roles: ['admin', 'hr'] },
    { path: '/hr/attendance', icon: Clock, label: 'Attendance', roles: ['admin', 'hr'] },
    { path: '/hr/leaves', icon: CalendarDays, label: 'Leave Management', roles: ['admin', 'hr', 'member'] },
    { path: '/hr/calendar', icon: Calendar, label: 'HR Calendar', roles: ['admin', 'hr'] },
    { path: '/hr/email-center', icon: FileText, label: 'Email Center', roles: ['admin', 'hr'] },
    { path: '/teams', icon: Users, label: 'Teams', roles: ['admin', 'hr', 'team_lead', 'community_admin'] },
    { path: '/users', icon: UserCog, label: 'User Management', roles: ['admin', 'hr', 'community_admin'] },
  ];

  const adminMenuItems = [
    { path: '/community-users', icon: UserCog, label: 'Community Users', roles: ['community_admin'] },
    { path: '/changelog', icon: FileText, label: 'Audit Logs', roles: ['admin'] },
  ];

  const bottomMenuItems = [
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const canAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const isDark = theme === 'dark';

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isDark ? 'bg-[#111418] border-[#282f39] shadow-xl' : 'bg-white border-gray-200 shadow-lg'}
        border-r flex flex-col shrink-0 transition-all duration-300
        ${isMobile ? 'fixed' : 'relative'} inset-y-0 left-0 z-50
        ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
      `}>
        {/* Mobile/Tablet Close Button */}
        {isMobile && isMobileOpen && (
          <button
            onClick={closeMobileSidebar}
            className={`absolute top-4 right-4 z-10 p-2 rounded-md ${
              isDark ? 'text-[#9da8b9] hover:text-white hover:bg-[#1c2027]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            } lg:hidden transition-colors`}
          >
            <X size={24} />
          </button>
        )}
      {/* Logo Section */}
      <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-b ${
        isDark ? 'border-[#282f39]/70' : 'border-gray-200/70'
      } flex items-center justify-center bg-gradient-to-r ${
        isDark ? 'from-[#111418] to-[#1a1d23]' : 'from-white to-gray-50/50'
      }`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 w-full px-2">
            <img 
              src="/logo.png" 
              alt="AetherTrack Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              AetherTrack
            </span>
          </div>
        ) : (
          <img 
            src="/logo.png" 
            alt="AetherTrack Logo" 
            className="w-8 h-8 object-contain"
            title="AetherTrack"
          />
        )}
      </div>

      {/* Search Bar - Desktop only */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border transition-colors ${
                isDark 
                  ? 'bg-[#1c2027] border-[#282f39] text-white placeholder-gray-500 focus:border-[#136dec]'
                  : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-[#135bec] focus:bg-white'
              } focus:outline-none focus:ring-2 focus:ring-[#136dec]/20`}
            />
          </div>
          
          {/* Search Results Dropdown */}
          {showSearch && searchQuery && getFilteredItems().length > 0 && (
            <div className={`absolute left-3 right-3 mt-1 rounded-lg shadow-lg border z-50 max-h-64 overflow-y-auto ${
              isDark ? 'bg-[#1a1d23] border-[#282f39]' : 'bg-white border-gray-200'
            }`}>
              {getFilteredItems().map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      handleNavigation(item.path);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isDark
                        ? 'hover:bg-[#1c2027] text-gray-300'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pinned Items Section */}
      {!isCollapsed && pinnedItems.length > 0 && (
        <div className="px-3 pb-2">
          <div className={`flex items-center gap-2 px-1 py-2 ${
            isDark ? 'text-[#9da8b9]' : 'text-gray-500'
          }`}>
            <Star size={12} className="fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pinned</span>
          </div>
          <div className="space-y-0.5">
            {pinnedItems.map(path => {
              const item = getMenuItemByPath(path);
              if (!item) return null;
              const Icon = item.icon;
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => handleNavigation(path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors group relative ${
                    active
                      ? isDark
                        ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                        : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                      : isDark
                        ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} className={active ? 'fill-current' : ''} />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <Pin 
                    size={12} 
                    className={`opacity-100 fill-current ${active ? currentColorScheme.primaryText : 'text-gray-400'}`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div className="flex flex-col flex-1 overflow-y-auto max-h-full px-3">
        {/* Recent Pages - Now inside scrollable area */}
        {!isCollapsed && recentPages.length > 0 && (
          <div className="pb-2">
            <div className={`flex items-center gap-2 px-1 py-2 ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-500'
            }`}>
              <History size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Recent</span>
            </div>
            <div className="space-y-0.5">
              {recentPages.slice(0, 3).map(path => {
                const item = getMenuItemByPath(path);
                if (!item || isPinned(path)) return null;
                const Icon = item.icon;
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    onClick={() => handleNavigation(path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors group relative ${
                      active
                        ? isDark
                          ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                          : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                        : isDark
                          ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} className={active ? 'fill-current' : ''} />
                    <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Section Dropdown */}
        {!isCollapsed && (
          <div className={`border-b ${
            isDark ? 'border-[#282f39]/50' : 'border-gray-200/50'
          } mx-2 mb-2 mt-2`}>
            <button
              onClick={() => toggleDropdown('main')}
              className={`w-full flex items-center justify-between py-3 px-1 text-left transition-colors group hidden lg:flex ${
                isDark ? 'text-[#9da8b9] hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={12} />
                Main
              </p>
              {openDropdowns.main ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        )}

        {/* Main Menu Items */}
        <div className={`transition-all duration-200 space-y-0.5 ${
          isCollapsed || openDropdowns.main ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const pinned = isPinned(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors group relative ${
                  active
                    ? isDark
                      ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                      : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                    : isDark
                      ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={18} className={active ? 'fill-current' : ''} />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    <button
                      onClick={(e) => togglePin(item.path, e)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                        pinned ? 'opacity-100' : ''
                      }`}
                      title={pinned ? 'Unpin' : 'Pin'}
                    >
                      <Star size={14} className={pinned ? 'fill-current text-yellow-500' : ''} />
                    </button>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Projects Section Dropdown */}
        <>
          {!isCollapsed && (
            <div className={`border-b ${
              isDark ? 'border-[#282f39]/50' : 'border-gray-200/50'
            } mx-2 mb-2 mt-2`}>
              <button
                onClick={() => toggleDropdown('projects')}
                className={`w-full flex items-center justify-between py-3 px-1 text-left transition-colors group hidden lg:flex ${
                  isDark ? 'text-[#9da8b9] hover:text-white' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider">Projects</p>
                {openDropdowns.projects ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          )}

          {/* Projects Menu Items */}
          <div className={`transition-all duration-200 space-y-0.5 ${
            isCollapsed || openDropdowns.projects || isMobile ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}>
            {projectMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const pinned = isPinned(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors group ${
                    active
                      ? isDark
                        ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                        : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                      : isDark
                        ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={18} className={active ? 'fill-current' : ''} />
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      <button
                        onClick={(e) => togglePin(item.path, e)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                          pinned ? 'opacity-100' : ''
                        }`}
                        title={pinned ? 'Unpin' : 'Pin'}
                      >
                        <Star size={14} className={pinned ? 'fill-current text-yellow-500' : ''} />
                      </button>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>

        {/* HR Management Section Dropdown */}
        {hrMenuItems.some(canAccess) && (
          <>
            {!isCollapsed && (
              <div className={`border-b ${
                isDark ? 'border-[#282f39]/50' : 'border-gray-200/50'
              } mx-2 mb-2`}>
                <button
                  onClick={() => toggleDropdown('hr')}
                  className={`w-full flex items-center justify-between py-3 px-1 text-left transition-colors group hidden lg:flex ${
                    isDark ? 'text-[#9da8b9] hover:text-white' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider">HR Management</p>
                  {openDropdowns.hr ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            )}

            {/* HR Menu Items */}
            <div className={`transition-all duration-200 space-y-0.5 ${
              isCollapsed || openDropdowns.hr || isMobile ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}>
              {hrMenuItems.filter(canAccess).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const pinned = isPinned(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors group ${
                      active
                        ? isDark
                          ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                          : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                        : isDark
                          ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={18} className={active ? 'fill-current' : ''} />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        <button
                          onClick={(e) => togglePin(item.path, e)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                            pinned ? 'opacity-100' : ''
                          }`}
                          title={pinned ? 'Unpin' : 'Pin'}
                        >
                          <Star size={14} className={pinned ? 'fill-current text-yellow-500' : ''} />
                        </button>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Management Section Dropdown */}
        {adminMenuItems.some(canAccess) && (
          <>
            {!isCollapsed && (
              <div className={`border-b ${
                isDark ? 'border-[#282f39]/50' : 'border-gray-200/50'
              } mx-2 mb-2`}>
                <button
                  onClick={() => toggleDropdown('management')}
                  className={`w-full flex items-center justify-between py-3 px-1 text-left transition-colors group hidden lg:flex ${
                    isDark ? 'text-[#9da8b9] hover:text-white' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider">Management</p>
                  {openDropdowns.management ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            )}

            {/* Management Menu Items */}
            <div className={`transition-all duration-200 space-y-0.5 ${
              isCollapsed || openDropdowns.management || isMobile ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}>
              {adminMenuItems.filter(canAccess).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const pinned = isPinned(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors group ${
                      active
                        ? isDark
                          ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                          : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                        : isDark
                          ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={18} className={active ? 'fill-current' : ''} />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        <button
                          onClick={(e) => togglePin(item.path, e)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                            pinned ? 'opacity-100' : ''
                          }`}
                          title={pinned ? 'Unpin' : 'Pin'}
                        >
                          <Star size={14} className={pinned ? 'fill-current text-yellow-500' : ''} />
                        </button>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Team/Role Info */}
      {!isCollapsed && (
        <div className={`p-2 border-t hidden lg:block ${
          isDark ? 'border-[#282f39]' : 'border-gray-200'
        }`}>
          <div className="px-2 py-1.5">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-500'
            }`}>Team</p>
            {user?.team_id ? (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <div className="size-6 rounded bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {getUserInitials(user.team_id.name)}
                </div>
                <span className="truncate">{user.team_id.name}</span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 text-sm ${
                isDark ? 'text-[#9da8b9]' : 'text-gray-600'
              }`}>
                {user?.role === 'admin' ? (
                  <>
                    <div className="size-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-[10px] text-white font-bold">
                      A
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Admin - All Teams</p>
                      <button 
                        onClick={() => navigate('/teams')}
                        className="text-[10px] text-[#136dec] hover:underline mt-0.5"
                      >
                        Manage Teams →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="size-6 rounded bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-[10px] text-white font-bold">
                      ?
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">No Team Assigned</p>
                      <p className="text-[10px] mt-0.5">Contact your admin</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile & Actions */}
      <div className={`border-t ${
        isDark ? 'border-[#282f39]' : 'border-gray-200'
      }`}>
        {/* User Info */}
        {!isCollapsed && user && (
          <div className={`px-2 py-1.5 border-b ${
            isDark ? 'border-[#282f39]' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-1.5">
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.full_name}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="size-7 rounded-full bg-gradient-to-br from-[#136dec] to-blue-600 flex items-center justify-center text-white font-semibold text-[10px]">
                  {getUserInitials(user.full_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>{user.full_name}</p>
                <p className={`text-[10px] truncate ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                }`}>{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings & Logout */}
        <div className="px-2 py-1.5">
          {!isCollapsed && (
            <div className={`border-t pt-1.5 mb-1 hidden lg:block ${
              isDark ? 'border-[#282f39]/50' : 'border-gray-200/50'
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9da8b9]' : 'text-gray-600'
              }`}>Account</p>
            </div>
          )}

          {/* Account Buttons - Side by Side */}
          <div className="flex items-center gap-1.5">
            {/* Settings Button */}
            <button
              onClick={() => handleNavigation('/settings')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md transition-colors group ${
                isActive('/settings')
                  ? isDark
                    ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText}`
                    : `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText}`
                  : isDark
                    ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={isCollapsed ? 'Profile & Settings' : ''}
            >
              <Settings size={16} />
              {!isCollapsed && <span className="text-xs font-medium">Settings</span>}
            </button>

            {/* Logout Button */}
            <button
              onClick={async () => {
                const confirmed = await confirmModal.show({
                  title: 'Logout',
                  message: 'Are you sure you want to logout? You will need to sign in again to access your account.',
                  confirmText: 'Logout',
                  cancelText: 'Stay Logged In',
                  variant: 'logout',
                });

                if (confirmed) {
                  logout();
                  navigate('/login');
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md transition-colors group ${
                isDark
                  ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <LogOut size={16} />
              {!isCollapsed && <span className="text-xs font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button - Show on Tablet and Desktop */}
      <button
        onClick={toggleCollapse}
        className={`p-2 border-t flex items-center justify-center transition-colors hidden md:flex ${
          isDark
            ? 'text-[#9da8b9] hover:text-white border-[#282f39] hover:bg-[#1c2027]'
            : 'text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-100'
        }`}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onClose}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />
    </aside>
    </>
  );
};

export default Sidebar;
