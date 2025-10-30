import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User, LayoutDashboard, CheckSquare, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

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
      name: 'Teams',
      href: '/teams',
      icon: Users,
      roles: ['admin', 'hr', 'team_lead'],
    },
  ];

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">TaskFlow</span>
            </Link>
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
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    <Icon className={`w-5 h-5 mr-3 transition-colors ${
                      isActive(item.href) ? 'text-blue-700' : 'text-gray-400'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
          </nav>

          {/* User Info & Actions */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900" data-testid="user-name">{user?.full_name}</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(user?.role)}`}
                  data-testid="user-role"
                >
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Notifications */}
            <div className="relative mb-4">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markAsRead();
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
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
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-xl border z-50" data-testid="notification-dropdown">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`p-4 border-b hover:bg-gray-50 ${
                            !notif.read_at ? 'bg-blue-50' : ''
                          }`}
                          data-testid="notification-item"
                        >
                          <p className="text-sm font-medium">{notif.type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notif.payload.task_title || notif.payload.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Content will be rendered here by the router */}
        </main>
      </div>
    </div>
  );
};

export default Navbar;