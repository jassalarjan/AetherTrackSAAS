import { useSidebar } from '../../context/SidebarContext';
import GlobalSidebar from '../GlobalSidebar';
import AppHeader from '../AppHeader';

/**
 * ResponsivePageLayout — Phase 2 host frame.
 * Sidebar + AppHeader + scrollable content.
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
  const { isCollapsed } = useSidebar();

  return (
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto" id="main-content" tabIndex={-1}>
          <div className={`${maxWidth} mx-auto w-full h-full ${noPadding ? '' : 'p-4 sm:p-6 lg:p-8'}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResponsivePageLayout;

