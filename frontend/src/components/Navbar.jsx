import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User, LayoutDashboard, CheckSquare, Users, UserCog, Kanban, Menu, X, ChevronLeft, ChevronRight, BarChart3, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { currentTheme, currentColorScheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show error for unauthorized - user might not be logged in yet
      if (error.response?.status !== 401) {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  const markAsRead = async () => {
    try {
      await api.patch('/notifications/mark-read');
      setUnreadCount(0);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800',
      hr: 'bg-green-100 text-green-800',
      team_lead: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    };
    return badges[role] || badges.member;
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'hr', 'team_lead', 'member'],
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['admin', 'hr', 'team_lead', 'member'],
    },
    {
      name: 'Kanban',
      href: '/kanban',
      icon: Kanban,
      roles: ['admin', 'hr', 'team_lead', 'member'],
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      roles: ['admin', 'hr', 'team_lead', 'member'],
    },
    {
      name: 'Teams',
      href: '/teams',
      icon: Users,
      roles: ['admin', 'hr', 'team_lead'],
    },
    {
      name: 'User Management',
      href: '/users',
      icon: UserCog,
      roles: ['admin', 'hr'],
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['admin', 'hr', 'team_lead', 'member'],
    },
  ];

  const isActive = (href) => {
    return location.pathname === href || (href === '/dashboard' && location.pathname === '/');
  };

  // Derive a border color class from the primary bg class (e.g., bg-blue-600 -> border-blue-600)
  const primaryBorderClass = currentColorScheme.primary?.startsWith('bg-')
    ? currentColorScheme.primary.replace('bg-', 'border-')
    : 'border-blue-600';

  return (
    <div className={`flex h-screen ${currentTheme.background}`}>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white p-2 rounded-lg shadow-lg border"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isCollapsed ? 'md:w-16' : 'md:w-64'
      } md:translate-x-0 fixed md:fixed inset-y-0 left-0 z-50 ${currentTheme.surface} shadow-lg border-r ${currentTheme.border} transition-all duration-300 ease-in-out md:h-screen md:flex-shrink-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-center h-16 px-4 border-b ${currentTheme.border} relative`}>
            <Link
              to="/dashboard"
              className="flex items-center space-x-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <img 
                src="/logo.png" 
                alt="TaskFlow Logo" 
                className="w-8 h-8 object-contain"
              />
              {!isCollapsed && <span className={`text-xl font-bold ${currentTheme.text}`}>TaskFlow</span>}
            </Link>

            {/* Collapse Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden md:block absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-lg ${currentTheme.hover} transition-colors`}
            >
              {isCollapsed ? (
                <ChevronRight className={`w-5 h-5 ${currentTheme.textSecondary}`} />
              ) : (
                <ChevronLeft className={`w-5 h-5 ${currentTheme.textSecondary}`} />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems
              .filter(item => item.roles.includes(user?.role))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? `${currentColorScheme.primaryLight} ${currentColorScheme.primaryText} border-r-4 ${primaryBorderClass}`
                        : `${currentTheme.textSecondary} ${currentTheme.hover} hover:${currentTheme.text}`
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={isCollapsed ? item.name : ''}
                  >
                    <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} transition-colors ${
                      isActive(item.href) ? currentColorScheme.primaryText : currentTheme.textMuted
                    }`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
          </nav>

          {/* User Info & Actions */}
          <div className={`border-t ${currentTheme.border} p-4`}>
            {!isCollapsed && (
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${currentTheme.text}`} data-testid="user-name">{user?.full_name}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(user?.role)}`}
                    data-testid="user-role"
                  >
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* Notifications */}
            {!isCollapsed && (
              <div className="relative mb-4">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) markAsRead();
                  }}
                  className={`w-full flex items-center px-4 py-2 text-sm ${currentTheme.textSecondary} ${currentTheme.hover} rounded-lg transition-colors`}
                  data-testid="notification-button"
                >
                  <Bell className="w-5 h-5 mr-3" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" data-testid="notification-count">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className={`absolute bottom-full left-0 mb-2 w-full ${currentTheme.surface} rounded-lg shadow-xl ${currentTheme.border} z-50`} data-testid="notification-dropdown">
                    <div className={`p-4 border-b ${currentTheme.border}`}>
                      <h3 className={`font-semibold ${currentTheme.text}`}>Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            className={`p-4 border-b ${currentTheme.hover} ${
                              !notif.read_at ? currentColorScheme.primaryLight : ''
                            }`}
                            data-testid="notification-item"
                          >
                            <p className={`text-sm font-medium ${currentTheme.text}`}>{notif.type.replace('_', ' ')}</p>
                            <p className={`text-xs ${currentTheme.textSecondary} mt-1`}>
                              {notif.payload.task_title || notif.payload.message}
                            </p>
                            <p className={`text-xs ${currentTheme.textMuted} mt-1`}>
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className={`p-4 text-center ${currentTheme.textMuted}`}>No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logout */}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                data-testid="logout-button"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Logout</span>
              </button>
            )}

            {/* Collapsed Logout Icon */}
            {isCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                data-testid="logout-button-collapsed"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <main className="flex-1 overflow-y-auto">
          {/* Content will be rendered here by the router */}
        </main>
      </div>

    </div>
  );
};

export default Navbar;