const fs=require('fs');
const layoutPath='frontend/src/shared/components/responsive/ResponsivePageLayout.jsx'; 
const ctxPath='frontend/src/features/workspace/context/SidebarContext.jsx'; 
let layout=fs.readFileSync(layoutPath,'utf8').split(/\r?\n/); 
const hookIndex=layout.findIndex(line=>line.includes('const { isMobile, showBottomNav, isCollapsed } = useSidebar();')); 
if(hookIndex===-1) throw new Error('hook line not found'); 
layout.splice(hookIndex,1,\"  const { isMobile, showBottomNav, isCollapsed, isSidebarVisible } = useSidebar();\",\"  const sidebarOffset = !isMobile && isSidebarVisible\",\"    ? (isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)')\",\"    : '0px';\");
