/**
 * GlobalSidebar — dual-pane nav used across the whole app.
 * Icon rail (52 px) + Label panel (196 px).
 * CSS lives in aethertrack-reference.css (.sidebar, .nav-rail, .nav-panel …).
 * Sections auto-detect from current URL; role-based links for HR / System.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import '../aethertrack-reference.css';

/* ─── Section detection ───────────────────────────────────────────────────── */
function detectSection(pathname) {
  if (
    pathname.startsWith('/hr') ||
    pathname === '/teams' ||
    pathname === '/users' ||
    pathname === '/geofence-management' ||
    pathname === '/verification-settings'
  ) return 'hr';

  if (
    pathname.startsWith('/projects') ||
    pathname.startsWith('/my-projects') ||
    pathname.startsWith('/sprints') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/analytics')
  ) return 'projects';

  if (
    pathname.startsWith('/settings') ||
    pathname.startsWith('/audit-log') ||
    pathname.startsWith('/changelog') ||
    pathname.startsWith('/community-users') ||
    pathname.startsWith('/feature-matrix')
  ) return 'system';

  return 'overview';
}

/* ─── Component ───────────────────────────────────────────────────────────── */
const GlobalSidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse } = useSidebar();

  const [activeSection, setActiveSection] = useState(() => detectSection(location.pathname));
  // Hover state: when collapsed, hovering over the rail temporarily reveals the label panel
  const [isHovered, setIsHovered] = useState(false);

  /* Sync active section when navigating */
  useEffect(() => {
    setActiveSection(detectSection(location.pathname));
  }, [location.pathname]);

  /* Derived user info */
  const role         = user?.role || 'member';
  const displayName  = user?.full_name || user?.name || 'User';
  const userInitials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  /* Role flags */
  const isAdmin       = ['admin', 'super_admin'].includes(role);
  const isHROrAbove   = ['admin', 'super_admin', 'hr', 'team_lead'].includes(role);
  const showSystem    = ['admin', 'super_admin', 'community_admin'].includes(role);
  const isCommunity   = role === 'community_admin';

  /* Active-link helper */
  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/projects')  return location.pathname.startsWith('/projects') && !location.pathname.startsWith('/projects/gantt') && !location.pathname.startsWith('/my-projects');
    return location.pathname.startsWith(path);
  };

  const nav = (path) => () => navigate(path);

  // Compute sidebar class: hover-expanded overlays the panel without shifting layout
  const sidebarClass = [
    'sidebar',
    isCollapsed && !isHovered ? 'sidebar--collapsed' : '',
    isCollapsed && isHovered ? 'sidebar--collapsed sidebar--hover-expanded' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside
      className={sidebarClass}
      aria-label="Main navigation"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      {/* ── Icon Rail (52 px) ── */}
      <div className="nav-rail">
        <div className="rail-brand" onClick={nav('/dashboard')} title="AetherTrack — home">
          <div className="brand-mark" aria-hidden="true">Æ</div>
        </div>

        <nav className="rail-sections" aria-label="Section switcher">
          {/* Overview — everyone */}
          <button
            className={`rail-item${activeSection === 'overview' ? ' active' : ''}`}
            onClick={() => { setActiveSection('overview'); navigate('/dashboard'); }}
            title="Overview"
            aria-label="Overview"
          >
            <span className="rail-icon" aria-hidden="true">⬡</span>
            <span className="rail-item-label">Home</span>
          </button>

          {/* Projects — everyone */}
          <button
            className={`rail-item${activeSection === 'projects' ? ' active' : ''}`}
            onClick={() => { setActiveSection('projects'); navigate('/projects'); }}
            title="Projects"
            aria-label="Projects"
          >
            <span className="rail-icon" aria-hidden="true">◈</span>
            <span className="rail-item-label">Work</span>
          </button>

          {/* HR — admin / hr / team_lead */}
          {isHROrAbove && (
            <button
              className={`rail-item${activeSection === 'hr' ? ' active' : ''}`}
              onClick={() => { setActiveSection('hr'); navigate(isAdmin ? '/hr/dashboard' : '/hr/attendance'); }}
              title="People & HR"
              aria-label="People & HR"
            >
              <span className="rail-icon" aria-hidden="true">◉</span>
              <span className="rail-item-label">People</span>
            </button>
          )}

          {/* System — admin / community_admin */}
          {showSystem && (
            <button
              className={`rail-item${activeSection === 'system' ? ' active' : ''}`}
              onClick={() => { setActiveSection('system'); navigate('/settings'); }}
              title="System"
              aria-label="System"
            >
              <span className="rail-icon" aria-hidden="true">⚙</span>
              <span className="rail-item-label">System</span>
            </button>
          )}
        </nav>

        <div className="rail-foot">
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☽'}
          </button>
          <button
            className="rail-collapse-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>
      </div>

      {/* ── Label Panel (196 px) ── */}
      <div className="nav-panel">
        <div className="panel-brand">
          <div className="brand-name">AetherTrack</div>
          <div className="brand-tag">2030</div>
        </div>

        <nav className="panel-scroll" aria-label="Primary navigation">

          {/* ── OVERVIEW ── */}
          {activeSection === 'overview' && (
            <div className="nav-group">
              <div className="nav-group-label">Overview</div>

              <button className={`nav-link${isActive('/dashboard') ? ' active' : ''}`}
                aria-current={isActive('/dashboard') ? 'page' : undefined}
                onClick={nav('/dashboard')}>
                <span className="nav-icon" aria-hidden="true">⬡</span>
                <span className="nav-label">Dashboard</span>
              </button>

              <button className={`nav-link${isActive('/tasks') ? ' active' : ''}`}
                onClick={nav('/tasks')}>
                <span className="nav-icon" aria-hidden="true">✦</span>
                <span className="nav-label">Tasks</span>
              </button>

              <button className={`nav-link${isActive('/kanban') ? ' active' : ''}`}
                onClick={nav('/kanban')}>
                <span className="nav-icon" aria-hidden="true">▤</span>
                <span className="nav-label">Kanban</span>
              </button>

              <button className={`nav-link${isActive('/calendar') ? ' active' : ''}`}
                onClick={nav('/calendar')}>
                <span className="nav-icon" aria-hidden="true">▫</span>
                <span className="nav-label">Calendar</span>
              </button>

              <button className={`nav-link${isActive('/self-attendance') ? ' active' : ''}`}
                onClick={nav('/self-attendance?tab=checkin')}>
                <span className="nav-icon" aria-hidden="true">⊙</span>
                <span className="nav-label">Check In</span>
              </button>

              <button className={`nav-link${isActive('/notifications') ? ' active' : ''}`}
                onClick={nav('/notifications')}>
                <span className="nav-icon" aria-hidden="true">◌</span>
                <span className="nav-label">Notifications</span>
              </button>
            </div>
          )}

          {/* ── PROJECTS ── */}
          {activeSection === 'projects' && (
            <div className="nav-group">
              <div className="nav-group-label">Projects</div>

              <button className={`nav-link${isActive('/projects') ? ' active' : ''}`}
                onClick={nav('/projects')}>
                <span className="nav-icon" aria-hidden="true">◈</span>
                <span className="nav-label">All Projects</span>
              </button>

              <button className={`nav-link${isActive('/my-projects') ? ' active' : ''}`}
                onClick={nav('/my-projects')}>
                <span className="nav-icon" aria-hidden="true">◇</span>
                <span className="nav-label">My Projects</span>
              </button>

              <button className={`nav-link${isActive('/projects/gantt') ? ' active' : ''}`}
                onClick={nav('/projects/gantt')}>
                <span className="nav-icon" aria-hidden="true">≣</span>
                <span className="nav-label">Gantt</span>
              </button>

              <button className={`nav-link${isActive('/sprints') ? ' active' : ''}`}
                onClick={nav('/sprints')}>
                <span className="nav-icon" aria-hidden="true">↻</span>
                <span className="nav-label">Sprints</span>
              </button>

              {isHROrAbove && (
                <button className={`nav-link${isActive('/resources') ? ' active' : ''}`}
                  onClick={nav('/resources')}>
                  <span className="nav-icon" aria-hidden="true">△</span>
                  <span className="nav-label">Resources</span>
                </button>
              )}

              <button className={`nav-link${isActive('/analytics') ? ' active' : ''}`}
                onClick={nav('/analytics')}>
                <span className="nav-icon" aria-hidden="true">∾</span>
                <span className="nav-label">Analytics</span>
              </button>
            </div>
          )}

          {/* ── HR ── admin / hr / team_lead */}
          {activeSection === 'hr' && isHROrAbove && (
            <div className="nav-group">
              <div className="nav-group-label">People & HR</div>

              {isAdmin && (
                <button className={`nav-link${isActive('/hr/dashboard') ? ' active' : ''}`}
                  onClick={nav('/hr/dashboard')}>
                  <span className="nav-icon" aria-hidden="true">⊟</span>
                  <span className="nav-label">HR Dashboard</span>
                </button>
              )}

              <button className={`nav-link${isActive('/hr/attendance') ? ' active' : ''}`}
                onClick={nav('/hr/attendance')}>
                <span className="nav-icon" aria-hidden="true">◑</span>
                <span className="nav-label">Attendance</span>
              </button>

              <button className={`nav-link${isActive('/hr/leaves') ? ' active' : ''}`}
                onClick={nav('/hr/leaves')}>
                <span className="nav-icon" aria-hidden="true">◊</span>
                <span className="nav-label">Leaves</span>
              </button>

              <button className={`nav-link${isActive('/hr/calendar') ? ' active' : ''}`}
                onClick={nav('/hr/calendar')}>
                <span className="nav-icon" aria-hidden="true">▣</span>
                <span className="nav-label">HR Calendar</span>
              </button>

              <button className={`nav-link${isActive('/hr/reallocation') ? ' active' : ''}`}
                onClick={nav('/hr/reallocation')}>
                <span className="nav-icon" aria-hidden="true">⇄</span>
                <span className="nav-label">Reallocation</span>
              </button>

              {isAdmin && (
                <button className={`nav-link${isActive('/hr/email-center') ? ' active' : ''}`}
                  onClick={nav('/hr/email-center')}>
                  <span className="nav-icon" aria-hidden="true">✉</span>
                  <span className="nav-label">Email Center</span>
                </button>
              )}

              <button className={`nav-link${isActive('/teams') ? ' active' : ''}`}
                onClick={nav('/teams')}>
                <span className="nav-icon" aria-hidden="true">⊞</span>
                <span className="nav-label">Teams</span>
              </button>

              {isAdmin && (
                <button className={`nav-link${isActive('/users') ? ' active' : ''}`}
                  onClick={nav('/users')}>
                  <span className="nav-icon" aria-hidden="true">⊕</span>
                  <span className="nav-label">Users</span>
                </button>
              )}
            </div>
          )}

          {/* ── SYSTEM ── admin / community_admin */}
          {activeSection === 'system' && showSystem && (
            <div className="nav-group">
              <div className="nav-group-label">System</div>

              <button className={`nav-link${isActive('/settings') ? ' active' : ''}`}
                onClick={nav('/settings')}>
                <span className="nav-icon" aria-hidden="true">⚙</span>
                <span className="nav-label">Settings</span>
              </button>

              <button className={`nav-link${isActive('/audit-log') ? ' active' : ''}`}
                onClick={nav('/audit-log')}>
                <span className="nav-icon" aria-hidden="true">◧</span>
                <span className="nav-label">Audit Log</span>
              </button>

              <button className={`nav-link${isActive('/changelog') ? ' active' : ''}`}
                onClick={nav('/changelog')}>
                <span className="nav-icon" aria-hidden="true">◔</span>
                <span className="nav-label">Changelog</span>
              </button>

              {isAdmin && (
                <button className={`nav-link${isActive('/geofence-management') ? ' active' : ''}`}
                  onClick={nav('/geofence-management')}>
                  <span className="nav-icon" aria-hidden="true">⊛</span>
                  <span className="nav-label">Geofencing</span>
                </button>
              )}

              {isAdmin && (
                <button className={`nav-link${isActive('/verification-settings') ? ' active' : ''}`}
                  onClick={nav('/verification-settings')}>
                  <span className="nav-icon" aria-hidden="true">◎</span>
                  <span className="nav-label">Verification</span>
                </button>
              )}

              {(isAdmin || isCommunity) && (
                <button className={`nav-link${isActive('/community-users') ? ' active' : ''}`}
                  onClick={nav('/community-users')}>
                  <span className="nav-icon" aria-hidden="true">≹</span>
                  <span className="nav-label">Community</span>
                </button>
              )}

              {isAdmin && (
                <button className={`nav-link${isActive('/feature-matrix') ? ' active' : ''}`}
                  onClick={nav('/feature-matrix')}>
                  <span className="nav-icon" aria-hidden="true">▧</span>
                  <span className="nav-label">Feature Matrix</span>
                </button>
              )}
            </div>
          )}

        </nav>

        {/* User footer */}
        <div className="panel-user" onClick={nav('/settings')} style={{ cursor: 'pointer' }}
          title="Account settings" role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/settings')}>
          <div className="user-avatar" aria-hidden="true">{userInitials}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>
      </div>

    </aside>
  );
};

export default GlobalSidebar;
