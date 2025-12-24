import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const { theme, currentTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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

  const mainMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tasks', icon: CheckSquare, label: 'My Tasks' },
    { path: '/kanban', icon: Grid3x3, label: 'Kanban Board' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const adminMenuItems = [
    { path: '/teams', icon: Users, label: 'Teams', roles: ['admin', 'hr', 'team_lead'] },
    { path: '/users', icon: UserCog, label: 'User Management', roles: ['admin', 'hr'] },
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
    <aside className={`${collapsed ? 'w-16' : 'w-64'} ${
      isDark ? 'bg-[#111418] border-[#282f39]' : 'bg-white border-gray-200'
    } border-r flex flex-col shrink-0 transition-all duration-300 relative`}>
      {/* Logo Section */}
      <div className={`${collapsed ? 'p-3' : 'p-4'} border-b ${
        isDark ? 'border-[#282f39]' : 'border-gray-200'
      } flex items-center justify-center`}>
        {!collapsed ? (
          <div className="flex items-center gap-3 w-full px-2">
            <img 
              src="/logo.png" 
              alt="TaskFlow Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              TaskFlow
            </span>
          </div>
        ) : (
          <img 
            src="/logo.png" 
            alt="TaskFlow Logo" 
            className="w-8 h-8 object-contain"
            title="TaskFlow"
          />
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-500'
            }`}>Main</p>
          </div>
        )}
        
        {mainMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded transition-colors group ${
                active
                  ? isDark
                    ? 'bg-[#136dec]/10 text-[#136dec]'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                    ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon size={20} className={active ? 'fill-current' : ''} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}

        {/* Admin Section */}
        {adminMenuItems.some(canAccess) && (
          <>
            {!collapsed && (
              <div className="px-3 py-2 mt-4">
                <p className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                }`}>Management</p>
              </div>
            )}
            {adminMenuItems.filter(canAccess).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded transition-colors group ${
                    active
                      ? isDark
                        ? 'bg-[#136dec]/10 text-[#136dec]'
                        : 'bg-blue-50 text-blue-600'
                      : isDark
                        ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon size={20} className={active ? 'fill-current' : ''} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Workspace Info */}
      {!collapsed && user?.team_id && (
        <div className={`p-4 border-t ${
          isDark ? 'border-[#282f39]' : 'border-gray-200'
        }`}>
          <div className="px-3 py-2">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-500'
            }`}>Workspace</p>
            <div className={`flex items-center gap-2 text-sm font-medium ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              <div className="size-6 rounded bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] text-white">
                {getUserInitials(user?.team_id?.name || 'Team')}
              </div>
              <span className="truncate">{user?.team_id?.name || 'My Team'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className={`p-4 border-t ${
        isDark ? 'border-[#282f39]' : 'border-gray-200'
      }`}>
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-500'
            }`}>System</p>
          </div>
        )}
        {bottomMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded transition-colors group w-full ${
                active
                  ? isDark
                    ? 'bg-[#136dec]/10 text-[#136dec]'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                    ? 'text-[#9da8b9] hover:bg-[#1c2027] hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon size={20} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`p-3 border-t flex items-center justify-center transition-colors ${
          isDark
            ? 'text-[#9da8b9] hover:text-white border-[#282f39] hover:bg-[#1c2027]'
            : 'text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-100'
        }`}
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </aside>
  );
};

export default Sidebar;
