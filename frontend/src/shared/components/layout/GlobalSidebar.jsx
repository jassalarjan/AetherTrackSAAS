/**
 * GlobalSidebar - intelligent dual-pane navigation.
 * Hovering any left-rail icon immediately updates the right panel with that
 * section's links and contextual content. Clicking commits navigation.
 * z-index: 9999 - always renders above page content.
 * Mobile: renders as a slide-in drawer overlay activated by the hamburger menu.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import '@/styles/aethertrack-reference.css';

/* --- Section definitions -------------------------------------------------- */
const SECTION_META = {
  overview: {
    icon: String.fromCodePoint(0x2B21),  // hexagonal
    label: 'Overview',
    tagline: 'Your workspace at a glance',
    accent: 'var(--sidebar-accent)',
    groups: [
      {
        label: 'Workspace',
        items: [
          { icon: String.fromCodePoint(0x2B21),  label: 'Dashboard',    path: '/dashboard',           desc: 'Activity summary'     },
          { icon: String.fromCodePoint(0x2726),  label: 'Tasks',        path: '/tasks',               desc: 'All work items'       },
          { icon: String.fromCodePoint(0x2594),  label: 'Kanban',       path: '/kanban',              desc: 'Visual board'         },
          { icon: String.fromCodePoint(0x25AB),  label: 'Calendar',     path: '/calendar',            desc: 'Scheduled events'     },
        ],
      },
      {
        label: 'Personal',
        items: [
          { icon: String.fromCodePoint(0x2299),  label: 'Check In',     path: '/self-attendance',     desc: 'Log attendance'       },
          { icon: String.fromCodePoint(0x25CC),  label: 'Notifications',path: '/notifications',       desc: 'Alerts & updates'     },
        ],
      },
    ],
  },

  projects: {
    icon: String.fromCodePoint(0x25C8),  // dotted diamond
    label: 'Projects',
    tagline: 'Plans & deliverables',
    accent: '#5A8ACC',
    groups: [
      {
        label: 'Views',
        items: [
          { icon: String.fromCodePoint(0x25C8),  label: 'All Projects', path: '/projects',            desc: 'Browse all projects'  },
          { icon: String.fromCodePoint(0x25C7),  label: 'My Projects',  path: '/my-projects',         desc: 'Assigned to you'      },
          { icon: String.fromCodePoint(0x2261),  label: 'Gantt',        path: '/projects/gantt',      desc: 'Timeline view'        },
          { icon: String.fromCodePoint(0x21BB),  label: 'Sprints',      path: '/sprints',             desc: 'Iteration planning'   },
        ],
      },
      {
        label: 'Insights',
        items: [
          { icon: String.fromCodePoint(0x25B3),  label: 'Resources',    path: '/resources',           desc: 'Workload & capacity', hrOnly: true },
          { icon: String.fromCodePoint(0x223E),  label: 'Analytics',    path: '/analytics',           desc: 'Charts & reports'     },
        ],
      },
    ],
  },

  hr: {
    icon: String.fromCodePoint(0x25C9),  // fisheye
    label: 'People',
    tagline: 'HR & workforce ops',
    accent: '#5A8A5A',
    groups: [
      {
        label: 'HR Operations',
        items: [
          { icon: String.fromCodePoint(0x229F),  label: 'HR Dashboard', path: '/hr/dashboard',        desc: 'People overview',     adminOnly: true },
          { icon: String.fromCodePoint(0x25D1),  label: 'Attendance',   path: '/hr/attendance',       desc: 'Track & verify'       },
          { icon: String.fromCodePoint(0x25CA),  label: 'Leaves',       path: '/hr/leaves',           desc: 'Requests & approvals' },
          { icon: String.fromCodePoint(0x25A3),  label: 'HR Calendar',  path: '/hr/calendar',         desc: 'Events & meetings'    },
          { icon: String.fromCodePoint(0x21C4),  label: 'Reallocation', path: '/hr/reallocation',     desc: 'Task handoffs'        },
          { icon: String.fromCodePoint(0x2709),  label: 'Email Center', path: '/hr/email-center',     desc: 'HR communications',   adminOnly: true },
        ],
      },
      {
        label: 'Organisation',
        items: [
          { icon: String.fromCodePoint(0x229E),  label: 'Teams',        path: '/teams',               desc: 'Manage groups'        },
          { icon: String.fromCodePoint(0x2295),  label: 'Users',        path: '/users',               desc: 'Accounts & roles',    adminOnly: true },
        ],
      },
    ],
  },

  system: {
    icon: String.fromCodePoint(0x2699),  // gear
    label: 'System',
    tagline: 'Admin & configuration',
    accent: '#8A6ACC',
    groups: [
      {
        label: 'Configuration',
        items: [
          { icon: String.fromCodePoint(0x2699),  label: 'Settings',     path: '/settings',            desc: 'App preferences'      },
          { icon: String.fromCodePoint(0x25E7),  label: 'Audit Log',    path: '/audit-log',           desc: 'Action history'       },
          { icon: String.fromCodePoint(0x25D4),  label: 'Changelog',    path: '/changelog',           desc: 'Release notes'        },
        ],
      },
      {
        label: 'Security',
        items: [
          { icon: String.fromCodePoint(0x229B),  label: 'Geofencing',   path: '/geofence-management', desc: 'Location rules',      adminOnly: true },
          { icon: String.fromCodePoint(0x25CE),  label: 'Verification', path: '/verification-settings',desc: 'Auth & 2FA',         adminOnly: true },
          { icon: String.fromCodePoint(0x25A7),  label: 'Features',     path: '/feature-matrix',      desc: 'Module access',       adminOnly: true },
        ],
      },
      {
        label: 'Distribution',
        items: [
          { icon: String.fromCodePoint(0x2B07),  label: 'Mobile App',   path: '/mobile-app-download', desc: 'Download Android app' },
        ],
      },
    ],
  },

  features: {
    icon: String.fromCodePoint(0x25A7),
    label: 'Features',
    tagline: 'Direct module controls',
    accent: '#C5811D',
    groups: [
      {
        label: 'Matrix',
        items: [
          { icon: String.fromCodePoint(0x25A7), label: 'Feature Matrix', path: '/feature-matrix', desc: 'Enable/disable modules', adminOnly: true },
        ],
      },
    ],
  },
};

/* --- Section detection ---------------------------------------------------- */
function detectSection(pathname) {
  if (pathname.startsWith('/feature-matrix') || pathname.startsWith('/mobile-app-download')) return 'system';
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
    pathname.startsWith('/feature-matrix')
  ) return 'system';
  return 'overview';
}

/* --- Component ------------------------------------------------------------ */
const GlobalSidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse, isMobile, isMobileOpen, closeMobileSidebar, isFeatureEnabledForPath } = useSidebar();

  const [activeSection, setActiveSection]   = useState(() => detectSection(location.pathname));
  const [hoveredSection, setHoveredSection] = useState(null);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [panelKey, setPanelKey]             = useState(0);
  const [prevPanel, setPrevPanel]           = useState(null);

  const panelSection = hoveredSection || activeSection;

  useEffect(() => {
    if (panelSection !== prevPanel) {
      setPanelKey(k => k + 1);
      setPrevPanel(panelSection);
    }
  }, [panelSection, prevPanel]);

  useEffect(() => {
    setActiveSection(detectSection(location.pathname));
  }, [location.pathname]);

  const role         = user?.role || 'member';
  const displayName  = user?.full_name || user?.name || 'User';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const isAdmin     = ['admin', 'super_admin'].includes(role);
  const isHROrAbove = ['admin', 'super_admin', 'hr', 'team_lead'].includes(role);
  const showSystem  = ['admin', 'super_admin'].includes(role);

  const sectionHasVisibleItems = useCallback((sectionKey) => {
    const section = SECTION_META[sectionKey];
    if (!section) return false;

    return section.groups.some((group) =>
      group.items.some((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.hrOnly && !isHROrAbove) return false;
        if (item.path !== '/feature-matrix' && !isFeatureEnabledForPath(item.path)) return false;
        return true;
      })
    );
  }, [isAdmin, isHROrAbove, isFeatureEnabledForPath]);

  const visibleRail = ['overview', 'projects'];
  if (isHROrAbove) visibleRail.push('hr');
  if (showSystem)  visibleRail.push('system');
  if (showSystem)  visibleRail.push('features');

  const filteredVisibleRail = visibleRail.filter((sectionKey) => sectionHasVisibleItems(sectionKey));

  useEffect(() => {
    if (!filteredVisibleRail.length) return;
    if (!filteredVisibleRail.includes(activeSection)) {
      const nextSection = filteredVisibleRail[0];
      setActiveSection(nextSection);
      setHoveredSection(null);
    }
  }, [filteredVisibleRail, activeSection]);

  const isActive = useCallback((path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/projects')  return location.pathname.startsWith('/projects') &&
      !location.pathname.startsWith('/projects/gantt') && !location.pathname.startsWith('/my-projects');
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handleRailClick = (key) => {
    const meta = SECTION_META[key];
    setActiveSection(key);
    setHoveredSection(null);
    const first = meta.groups.flatMap(g => g.items).find(item => {
      if (item.adminOnly && !isAdmin)    return false;
      if (item.hrOnly   && !isHROrAbove) return false;
      if (item.path !== '/feature-matrix' && !isFeatureEnabledForPath(item.path)) return false;
      return true;
    });
    if (first) {
      navigate(first.path.split('?')[0]);
      if (isMobile) closeMobileSidebar();
    }
  };

  const sidebarClass = [
    'sidebar',
    isMobile ? 'sidebar--mobile-drawer' : '',
    isMobile && isMobileOpen ? 'sidebar--mobile-open' : '',
    !isMobile && isCollapsed && !sidebarHovered ? 'sidebar--collapsed' : '',
    !isMobile && isCollapsed && sidebarHovered  ? 'sidebar--collapsed sidebar--hover-expanded' : '',
  ].filter(Boolean).join(' ');

  const sectionMeta = SECTION_META[panelSection];
  const accentColor = sectionMeta?.accent || 'var(--sidebar-accent)';

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={closeMobileSidebar}
        />
      )}

    <aside
      className={sidebarClass}
      aria-label="Main navigation"
      onMouseEnter={() => !isMobile && setSidebarHovered(true)}
      onMouseLeave={() => { if (!isMobile) { setSidebarHovered(false); setHoveredSection(null); } }}
    >

      {/* == LEFT RAIL (64px) == */}
      <div className="nav-rail">
        <div className="rail-brand" onClick={() => navigate('/dashboard')} title="AetherTrack">
          <div className="brand-mark" aria-hidden="true">A</div>
        </div>

        <nav className="rail-sections" aria-label="Section switcher">
          {filteredVisibleRail.map((key) => {
            const meta        = SECTION_META[key];
            const isActiveSec  = activeSection === key;
            const isPreviewing = hoveredSection === key && !isActiveSec;
            return (
              <button
                key={key}
                className={`rail-item${isActiveSec ? ' active' : ''}${isPreviewing ? ' previewing' : ''}`}
                onMouseEnter={() => setHoveredSection(key)}
                onClick={() => handleRailClick(key)}
                title={`${meta.label} - ${meta.tagline}`}
                aria-label={meta.label}
                aria-current={isActiveSec ? 'true' : undefined}
                style={isPreviewing ? { color: meta.accent } : undefined}
              >
                <span className="rail-icon" aria-hidden="true">{meta.icon}</span>
                <span className="rail-item-label">{meta.label}</span>
                {isPreviewing && (
                  <span className="rail-preview-bar" style={{ background: meta.accent }} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="rail-foot">
          <button className="theme-btn" onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            aria-label="Toggle theme">
            {theme === 'dark' ? '\u2600' : '\u263D'}
          </button>
          <button className="rail-collapse-btn" onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? '\u203A' : '\u2039'}
          </button>
        </div>
      </div>

      {/* == RIGHT PANEL (220px) == */}
      <div className="nav-panel" aria-label={`${sectionMeta?.label} navigation`}>

        <div className="panel-section-header" style={{ '--section-accent': accentColor }}>
          <div className="panel-section-header-inner">
            <span className="panel-section-icon" aria-hidden="true">{sectionMeta?.icon}</span>
            <div>
              <div className="panel-section-title">{sectionMeta?.label}</div>
              <div className="panel-section-tagline">{sectionMeta?.tagline}</div>
            </div>
          </div>
          <span className="panel-section-accent-bar" style={{ background: accentColor }} aria-hidden="true" />
        </div>

        <nav key={panelKey} className="panel-scroll panel-content-enter"
          aria-label={`${sectionMeta?.label} links`}>
          {sectionMeta?.groups.map((group) => {
            const visibleItems = group.items.filter(item => {
              if (item.adminOnly && !isAdmin)    return false;
              if (item.hrOnly   && !isHROrAbove) return false;
              if (item.path !== '/feature-matrix' && !isFeatureEnabledForPath(item.path)) return false;
              return true;
            });
            if (!visibleItems.length) return null;
            return (
              <div key={group.label} className="nav-group">
                <div className="nav-group-label">{group.label}</div>
                {visibleItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      className={`nav-link nav-link--rich${active ? ' active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      style={active ? { '--link-accent': accentColor } : undefined}
                      onClick={() => {
                        navigate(item.path.split('?')[0]);
                        setHoveredSection(null);
                        if (isMobile) closeMobileSidebar();
                      }}
                    >
                      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                      <span className="nav-link-text">
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-desc">{item.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="panel-user"
          onClick={() => { navigate('/settings'); if (isMobile) closeMobileSidebar(); }}
          style={{ cursor: 'pointer' }}
          title="Account settings"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') { navigate('/settings'); if (isMobile) closeMobileSidebar(); } }}
        >
          <div className="user-avatar" aria-hidden="true">{userInitials}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>
      </div>

    </aside>
    </>
  );
};

export default GlobalSidebar;