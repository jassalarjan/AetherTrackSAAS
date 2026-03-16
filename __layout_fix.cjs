const fs=require('fs'); 
const p='frontend/src/shared/components/responsive/ResponsivePageLayout.jsx'; 
let s=fs.readFileSync(p,'utf8'); 
s=s.replace(`  const { isMobile, showBottomNav, isCollapsed } = useSidebar();`,`  const { isMobile, showBottomNav, isCollapsed, isSidebarVisible } = useSidebar();n  const sidebarOffset = !isMobile && isSidebarVisiblen    ? (isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)')n    : '0px';`); 
