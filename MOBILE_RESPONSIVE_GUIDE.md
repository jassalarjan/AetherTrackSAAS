# AetherTrack — Mobile-First Responsive Design Guide

## Overview

The AetherTrack frontend has been fully refactored for mobile-first responsive behaviour across all five target breakpoints:

| Breakpoint | Width | Behaviour |
|---|---|---|
| Mobile S | 320–480px | Single-column, bottom nav, drawer sidebar |
| Mobile L | 480–640px | Single-column, bottom nav, drawer sidebar |
| Tablet | 640–1024px | Two-column where possible, drawer sidebar (no bottom nav) |
| Laptop | 1024–1280px | Full layout, persistent sidebar |
| Desktop | 1280px+ | Full layout, expanded sidebar |

---

## Architecture

### Navigation

**Sidebar** (`GlobalSidebar.jsx`)
- < 1024px → slides in as a fixed overlay drawer (`sidebar--mobile-drawer` + `sidebar--mobile-open` classes)
- ≥ 1024px → persistent dual-pane sidebar (64px icon rail + 220px label panel)
- Collapsible to icon-rail-only via the chevron button at the bottom

**Hamburger** (`AppHeader.jsx`)
- Automatically rendered when `isMobile === true` (< 1024px)
- Toggles the drawer via `toggleMobileSidebar()` from `SidebarContext`
- `Workspace.jsx` has its own separate hamburger since it uses a custom layout

**Bottom Navigation** (`ResponsivePageLayout.jsx → MobileBottomNav`)
- Rendered only when `showBottomNav === true` (< 768px)
- Fixed to bottom with safe-area-inset support for notched devices
- 5 tabs: Home, Tasks, Projects, HR, More (Settings)
- Active state uses Lucide icons, brand colour highlight + dim background

**Sidebar Backdrop** (`aethertrack-reference.css`)
- Semi-transparent blur overlay rendered behind the drawer on mobile
- `z-index: 9998` (one below sidebar's 9999)
- Tap to close drawer

---

### State Management (`SidebarContext.jsx`)

Two separate mobile thresholds:

```js
const mobile     = window.innerWidth < 1024;  // triggers drawer mode
const smallMobile = window.innerWidth < 768;   // triggers bottom navigation
```

Context values available everywhere via `useSidebar()`:

| Value | Type | Description |
|---|---|---|
| `isMobile` | bool | True when window < 1024px |
| `isMobileOpen` | bool | True when drawer is slid open |
| `showBottomNav` | bool | True when window < 768px |
| `isCollapsed` | bool | True when desktop sidebar is icon-only |
| `toggleMobileSidebar` | fn | Toggle the mobile drawer |
| `closeMobileSidebar` | fn | Close the drawer (called on nav link click) |
| `toggleCollapse` | fn | Toggle desktop sidebar collapse |

---

### Layouts

**`ResponsivePageLayout`** — used by 28+ pages
- Structure: `[GlobalSidebar] + [AppHeader + scrollable content]`
- Applies `paddingBottom: calc(56px + env(safe-area-inset-bottom))` when `showBottomNav` to prevent content hiding behind bottom nav
- Passes `noPadding`, `maxWidth`, `title`, `subtitle`, `actions`, `icon`, `breadcrumbs` to `AppHeader`

**`Workspace.jsx`** — custom layout (Dashboard page)
- Uses its own `MobileNav` component (`.mob-nav` class) wired to `showBottomNav`
- Hamburger button in the `.header` wired to `toggleMobileSidebar`
- Same safe-area padding approach as `ResponsivePageLayout`

---

## CSS Architecture

### Files and Responsibilities

| File | Purpose |
|---|---|
| `tokens.css` | Design tokens (spacing, colour, radius, motion, shadows). Includes responsive token scaling for mobile < 768px. |
| `design-tokens.css` | Extended token set (dark mode tokens via `[data-theme="dark"]`) |
| `aethertrack-reference.css` | Reference CSS for Workspace page and GlobalSidebar. Contains sidebar, header, KPI grid, content grid, and all added mobile rules. |
| `mobile-responsive.css` | Thin global override layer — iOS input zoom prevention, table scroll, chart height constraints, hidden-mobile helper. |
| `index.css` | Tailwind base/components/utilities + global resets |
| `ui-system.css` | Component-level design tokens used by themed React components |

### Breaking Points

All custom CSS breakpoints align with Tailwind's defaults to avoid conflicts:

```css
/* aethertrack-reference.css — appended mobile rules */
@media (max-width: 1023px) { /* Tablet/mobile — .page padding, .rail-item touch targets */ }
@media (max-width: 767px)  { /* Phone — .kpi-row 2-col, .header reduced, .tab-row scroll */ }
@media (max-width: 479px)  { /* Small phone — .page tighter padding, KPI 1fr 1fr */ }
@media (pointer: coarse)   { /* Touch devices — 44px minimum touch targets */ }
```

### Sidebar Drawer CSS

```css
.sidebar-backdrop {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
}

.sidebar--mobile-drawer {
  position: fixed; left: 0; top: 0; bottom: 0;
  transform: translateX(-100%); visibility: hidden;
  transition: transform 280ms ease, visibility 0ms 280ms;
  z-index: 9999;
}

.sidebar--mobile-open {
  transform: translateX(0); visibility: visible;
  transition: transform 280ms ease, visibility 0ms;
}
```

---

## Performance

### Code Splitting (`App.jsx`)

All 30 page components are lazy-loaded using `React.lazy()` + `Suspense`. Only 4 auth pages (Login, VerifyEmail, ForgotPassword, ResetPassword) are eagerly imported.

```jsx
// Lazy page import pattern
const Workspace = lazy(() => import('./pages/Workspace'));

// Wrapped in Suspense with PageLoader fallback
<Suspense fallback={<PageLoader label="Loading page…" />}>
  <Routes>...</Routes>
</Suspense>
```

This reduces the initial JS bundle by splitting each page route into a separate chunk loaded on demand, typically saving 200–400KB on first load.

### Design Token Scaling

Spacing tokens automatically scale on mobile via a media query in `tokens.css`:

```css
@media (max-width: 767px) {
  :root {
    --s8: 28px;   /* was 32px */
    --s10: 36px;  /* was 40px */
    --header-h: 52px;
    --text-xl: 1.25rem;
  }
}
```

---

## Fixed Layout Issues

| Page | Problem | Fix |
|---|---|---|
| `SprintManagement.jsx` | Fixed 420px aside, no mobile stack | `w-full lg:w-[380px]`, `flex-col lg:flex-row`, table `overflow-x-auto` |
| `ProjectGantt.jsx` | Fixed 420px task list panel | `w-[240px] sm:w-[320px] lg:w-[420px]`, horizontal scroll wrapper |
| All pages | Pages wider than viewport on phones | `html, body { overflow-x: hidden }` in both CSS files |
| `GlobalSidebar` | Sidebar always visible on mobile, ignoring `isMobileOpen` | Rewired to use `isMobile/isMobileOpen` from context, added drawer CSS |
| `SidebarContext` | Bottom nav shown on tablets (1024px threshold was too wide) | Split to `isMobile < 1024` and `showBottomNav < 768` |
| `mobile-responsive.css` | Button/spacing `!important` overrides conflicting with design system | Stripped all button padding overrides; kept only iOS zoom fix, chart height, table overflow |

---

## Touch Targets

All interactive elements on touch devices (`@media (pointer: coarse)`) are enforced to at least 44×44px:

```css
@media (pointer: coarse) {
  .btn      { min-height: 44px; }
  .hdr-btn  { width: 44px; height: 44px; }
  .rail-item { min-height: 60px; }
  .nav-link  { min-height: 44px; }
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }
}
```

---

## Safe Area Insets

All bottom-fixed elements (bottom nav, mobile nav) account for notches and home indicators:

```css
/* MobileBottomNav height */
height: calc(56px + env(safe-area-inset-bottom, 0px));

/* Content scroll area padding */
paddingBottom: calc(56px + env(safe-area-inset-bottom, 0px));
```

---

## Adding a New Page

1. Create the page component in `frontend/src/pages/`
2. Add a `lazy()` import in `App.jsx` (follow existing pattern)
3. Add a `<Route>` inside `<Suspense>` in `App.jsx`
4. Wrap content in `<ResponsivePageLayout title="..." ...>`
5. Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) for layout variations
6. For tables: wrap in `<div className="overflow-x-auto">` with `min-w-[560px]` on the table
7. For side panels: use `w-full lg:w-[380px]` and `flex-col lg:flex-row` on the parent

---

## Browser / Device Support

| Feature | Support |
|---|---|
| CSS Grid responsive | All modern browsers |
| `env(safe-area-inset-bottom)` | iOS Safari 11+, Chrome Android |
| `backdrop-filter: blur()` | Chrome 76+, Safari 9+, Firefox 103+ |
| `React.lazy + Suspense` | React 16.6+ |
| CSS custom properties | All modern browsers |
