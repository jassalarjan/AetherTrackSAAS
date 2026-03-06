import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FolderKanban, Users, Settings } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import GlobalSidebar from '../GlobalSidebar';
import AppHeader from '../AppHeader';

// ── Minimal mobile bottom navigation shown on screens < 768px ───────────────
const BOTTOM_NAV_ITEMS = [
  { id: 'home',     Icon: LayoutDashboard, label: 'Home',     path: '/dashboard' },
  { id: 'tasks',    Icon: CheckSquare,     label: 'Tasks',    path: '/tasks' },
  { id: 'projects', Icon: FolderKanban,    label: 'Projects', path: '/projects' },
  { id: 'hr',       Icon: Users,           label: 'HR',       path: '/hr/dashboard' },
  { id: 'settings', Icon: Settings,        label: 'More',     path: '/settings' },
];

const MobileBottomNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile quick navigation"
      style={{
        display:        'flex',
        position:       'fixed',
        bottom:         0,
        left:           0,
        right:          0,
        height:         'calc(56px + env(safe-area-inset-bottom, 0px))',
        background:     'var(--bg-raised)',
        borderTop:      '1px solid var(--border-soft)',
        zIndex:         200,
        alignItems:     'flex-start',
        justifyContent: 'space-around',
        paddingTop:     '4px',
        paddingLeft:    '4px',
        paddingRight:   '4px',
        boxShadow:      '0 -1px 12px rgba(0,0,0,0.08)',
      }}
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const active = isActive(item.path);
        const { Icon } = item;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '2px',
              padding:       '6px 8px',
              border:        'none',
              background:    active ? 'var(--brand-dim)' : 'none',
              color:         active ? 'var(--brand)' : 'var(--text-muted)',
              cursor:        'pointer',
              minWidth:      '52px',
              minHeight:     '44px',
              justifyContent:'center',
              fontFamily:    'var(--font-body, sans-serif)',
              transition:    'color 120ms ease, background 120ms ease',
              borderRadius:  '10px',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, letterSpacing: '0.01em', lineHeight: 1 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
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
  const { isMobile, showBottomNav } = useSidebar();

  return (
    <>
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
      <GlobalSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

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

        {/* Scrollable Content — extra bottom padding on mobile for bottom nav */}
        <div
          className="flex-1 overflow-auto"
          id="main-content"
          tabIndex={-1}
          style={showBottomNav ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' } : undefined}
        >
          <div className={`${maxWidth} mx-auto w-full h-full ${noPadding ? '' : 'p-4 sm:p-6 lg:p-8'}`}>
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
