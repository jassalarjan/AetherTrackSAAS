import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, FolderKanban, Users, Settings,
} from 'lucide-react';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import GlobalSidebar from '@/shared/components/layout/GlobalSidebar';
import AppHeader from '@/shared/components/layout/AppHeader';

// ── Mobile bottom navigation items ──────────────────────────────────────────
const BOTTOM_NAV_ITEMS = [
  { id: 'home',     Icon: LayoutDashboard, label: 'Home',     path: '/dashboard' },
  { id: 'tasks',    Icon: CheckSquare,     label: 'Tasks',    path: '/tasks' },
  { id: 'projects', Icon: FolderKanban,    label: 'Projects', path: '/projects' },
  { id: 'hr',       Icon: Users,           label: 'HR',       path: '/hr/dashboard' },
  { id: 'settings', Icon: Settings,        label: 'More',     path: '/settings' },
];

/**
 * MobileBottomNav — redesigned with floating pill container, pill active state,
 * larger touch targets, smooth transitions, and safe-area support.
 */
const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* ── keyframes injected once ─────────────────────────────────────── */}
      <style>{`
        .bnav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          padding: 6px clamp(2px, 1vw, 8px) 2px;
          min-height: 52px;
          border: none;
          background: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          position: relative;
          transition: transform 90ms ease;
          font-family: var(--font-body, sans-serif);
        }
        .bnav-btn:active {
          transform: scale(0.88);
        }
        .bnav-pill {
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: clamp(30px, 8vw, 42px);
          height: 28px;
          border-radius: 14px;
          background: var(--brand-dim, rgba(var(--brand-rgb, 99,102,241),0.12));
          transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1);
          pointer-events: none;
          z-index: 0;
        }
        .bnav-btn[aria-current="page"] .bnav-pill {
          transform: translateX(-50%) scaleX(1);
        }
        .bnav-icon {
          position: relative;
          z-index: 1;
          transition: color 150ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bnav-label {
          font-size: clamp(8.5px, 2.5vw, 10px);
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1;
          position: relative;
          z-index: 1;
          transition: color 150ms ease, font-weight 150ms ease;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .bnav-btn[aria-current="page"] .bnav-label {
          font-weight: 700;
        }
        /* Active-indicator bar at top of nav */
        .bnav-bar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: clamp(16px, 5vw, 24px);
          height: 2.5px;
          border-radius: 0 0 3px 3px;
          background: var(--brand);
          transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .bnav-btn[aria-current="page"] .bnav-bar {
          transform: translateX(-50%) scaleX(1);
        }
      `}</style>

      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile quick navigation"
        style={{
          display:         'flex',
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          200,
          /* frosted glass look */
          background:      'var(--bg-raised)',
          backdropFilter:  'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop:       '1px solid var(--border-soft)',
          boxShadow:       '0 -4px 24px rgba(0,0,0,0.10)',
          paddingBottom:   'env(safe-area-inset-bottom, 0px)',
          paddingLeft:     '4px',
          paddingRight:    '4px',
          alignItems:      'stretch',
          minHeight:       'calc(56px + env(safe-area-inset-bottom, 0px))',
          overflow:        'hidden',
        }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const { Icon } = item;
          return (
            <button
              key={item.id}
              className="bnav-btn"
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* top active bar */}
              <span className="bnav-bar" aria-hidden="true" />
              {/* pill background */}
              <span className="bnav-pill" aria-hidden="true" />
              {/* icon */}
              <span
                className="bnav-icon"
                style={{ color: active ? 'var(--brand)' : 'var(--text-muted)' }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.8}
                  aria-hidden="true"
                />
              </span>
              {/* label */}
              <span
                className="bnav-label"
                style={{ color: active ? 'var(--brand)' : 'var(--text-faint)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

/**
 * ResponsivePageLayout — Phase 2 host frame.
 * Sidebar + AppHeader + scrollable content.
 * Mobile: sidebar becomes a drawer, bottom nav provides quick access.
 */
const ResponsivePageLayout = ({
  children,
  title,
  subtitle,
  actions,
  headerContent,      // extra JSX rendered after breadcrumb in the header
  icon,               // optional Lucide icon shown beside the title
  breadcrumbs,        // optional string[] breadcrumb override
  noPadding = false,
  maxWidth = 'max-w-[1920px]',
}) => {
  const { isMobile, showBottomNav, isCollapsed, isSidebarVisible } = useSidebar();
  const sidebarOffset = !isMobile && isSidebarVisible
    ? (isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)')
    : '0px';

  return (
    <>
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        '--sidebar-width-expanded': '284px',
        '--sidebar-width-collapsed': '64px',
        '--sidebar-width': sidebarOffset,
        '--header-height': '64px',
      }}
    >
      {isSidebarVisible && <GlobalSidebar />}

      {/* Main Content Area */}
      <main
        className="flex min-w-0 h-screen flex-col"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
        }}
      >

        {/* Global top bar — always rendered */}
        <AppHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          breadcrumbs={breadcrumbs}
          actions={
            (actions || headerContent)
              ? <>{actions}{headerContent}</>
              : undefined
          }
          noPadding={noPadding}
        />

        {/* Mobile actions bar — only shown on small screens when actions exist */}
        {(actions || headerContent) && (
          <div
            className="sm:hidden flex items-center gap-2 px-3 py-2 border-b overflow-x-auto"
            style={{
              background:  'var(--bg-canvas)',
              borderColor: 'var(--border-soft)',
              scrollbarWidth: 'none',
              flexShrink: 0,
            }}
          >
            {actions}
            {headerContent}
          </div>
        )}

        {/* Scrollable Content — extra bottom padding on mobile for bottom nav */}
        <div
          className="flex-1 overflow-auto"
          id="main-content"
          tabIndex={-1}
          style={showBottomNav ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' } : undefined}
        >
          <div className={`${maxWidth} mx-auto w-full h-full ${noPadding ? '' : 'p-3 xs:p-4 sm:p-6 lg:p-8'}`}>
            {children}
          </div>
        </div>
      </main>
    </div>

    {/* Mobile bottom navigation — only shown on phones (< 768px) */}
    {showBottomNav && <MobileBottomNav />}
    </>
  );
};

export default ResponsivePageLayout;
