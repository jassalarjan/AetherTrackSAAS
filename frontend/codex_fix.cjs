const fs=require('fs'); 
let s=fs.readFileSync('src/shared/components/responsive/ResponsivePageLayout.jsx','utf8'); 
s=s.replace(\"style={{ background: 'var(--bg-canvas)', --sidebar-width: '284px', --sidebar-collapsed: '64px', --header-height: '64px' }}\",\"style={{ background: 'var(--bg-canvas)', '--sidebar-width': '284px', '--sidebar-collapsed': '64px', '--header-height': '64px' }}\"); 
s=s.replace(\"style={showBottomNav ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' } : undefined}\",\"style={showBottomNav ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', scrollPaddingTop: 'var(--header-height)' } : { scrollPaddingTop: 'var(--header-height)' }}\"); 
fs.writeFileSync('src/shared/components/responsive/ResponsivePageLayout.jsx',s,'utf8'); 
s=fs.readFileSync('src/shared/components/layout/AppHeader.jsx','utf8'); 
s=s.replace('className=\"flex-none flex items-center border-b\"','className=\"sticky top-0 z-40 flex-none flex items-center border-b\"'); 
s=s.replace('className=\"flex items-center gap-1 sm:gap-1.5 flex-none\"','className=\"flex items-center justify-end gap-1 sm:gap-1.5 flex-none flex-wrap\"'); 
