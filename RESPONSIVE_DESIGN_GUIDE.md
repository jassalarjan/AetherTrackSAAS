# Taskflow Responsive Design System

## 📱 Overview

This is a mobile-first responsive design system for Taskflow that ensures optimal user experience across all devices - from mobile phones (360px) to large desktop screens (1920px+).

## 🎯 Design Philosophy

### Mobile-First Approach
- Start with mobile styles (smallest screens)
- Progressive enhancement for larger screens
- Touch-friendly interactions (minimum 44px tap targets)
- No horizontal scrolling on any device

### Breakpoints
```
Mobile:   < 640px   (sm)  - Single column, full-width elements
Tablet:   640-768px (md)  - 2 columns, some sidebars
Desktop:  768-1024px (lg) - Full layout with sidebar
Large:    1024-1280px (xl) - Wider content areas
XL:       > 1280px   (2xl)- Maximum content width
```

## 📦 Core Components

### 1. ResponsivePageLayout
Main page wrapper that handles:
- Automatic sidebar integration
- Mobile hamburger menu
- Responsive header with title/actions
- Scrollable content area
- Max-width constraints

**Usage:**
```jsx
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';

<ResponsivePageLayout
  title="Page Title"
  subtitle="Optional subtitle"
  actions={<button>Action</button>}
  maxWidth="max-w-[1920px]"
>
  {/* Your content */}
</ResponsivePageLayout>
```

### 2. ResponsiveModal
Mobile-optimized modal component:
- Full-screen on mobile
- Centered card on tablet/desktop
- Smooth animations (slideUp mobile, scaleIn desktop)
- Sticky header/footer
- ESC to close

**Usage:**
```jsx
import ResponsiveModal from '../components/layouts/ResponsiveModal';

<ResponsiveModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  size="default" // 'small', 'default', 'large', 'full'
  footer={<div>Footer content</div>}
>
  {/* Modal content */}
</ResponsiveModal>
```

### 3. ResponsiveCard
Flexible card component with:
- Responsive padding (4 on mobile, 6 on desktop)
- Consistent theming
- Optional hover effects
- Optional click handlers

**Usage:**
```jsx
import ResponsiveCard from '../components/layouts/ResponsiveCard';

<ResponsiveCard hover onClick={() => {}}>
  {/* Card content */}
</ResponsiveCard>
```

### 4. ResponsiveGrid
Mobile-first grid layout:
- Single column on mobile by default
- Configurable columns per breakpoint
- Responsive gaps

**Usage:**
```jsx
import ResponsiveGrid from '../components/layouts/ResponsiveGrid';

<ResponsiveGrid
  cols={{
    base: 1,  // Mobile
    sm: 1,    // Small
    md: 2,    // Medium
    lg: 3,    // Large
    xl: 4     // Extra large
  }}
  gap="gap-4 sm:gap-6"
>
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</ResponsiveGrid>
```

### 5. TaskCard
Mobile-optimized task display:
- Replaces table rows on mobile
- Touch-friendly actions (≥44px)
- Shows all key information
- Swipeable layout
- Priority/status badges

**Usage:**
```jsx
import TaskCard from '../components/TaskCard';

<TaskCard
  task={task}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
  canEdit={true}
  canDelete={true}
  getUserInitials={getUserInitials}
/>
```

## 🎨 Design Patterns

### Typography
Use responsive text sizing:
```jsx
// Headings
className="text-lg sm:text-xl lg:text-2xl"

// Body text
className="text-sm sm:text-base"

// Small text
className="text-xs sm:text-sm"

// Use clamp() for fluid typography
style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
```

### Spacing
Consistent spacing scale:
```jsx
// Padding
className="p-4 sm:p-6 lg:p-8"

// Margin
className="mb-4 sm:mb-6"

// Gap
className="gap-3 sm:gap-4 lg:gap-6"
```

### Touch Targets
Minimum 44x44px on mobile:
```jsx
// Buttons
className="h-10 sm:h-11 px-4"

// Icon buttons
className="size-10 sm:size-11"

// Inputs
className="h-11 px-4"
```

### Layout Patterns

#### Stack on Mobile, Grid on Desktop
```jsx
<div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

#### Hide on Small Screens
```jsx
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>
```

#### Responsive Flex Direction
```jsx
<div className="flex flex-col md:flex-row gap-4">
  <div>Left</div>
  <div>Right</div>
</div>
```

## 📐 Common Responsive Patterns

### 1. Mobile Navigation
```jsx
// Mobile: Hamburger menu + drawer
// Desktop: Fixed sidebar

{isMobile && (
  <button onClick={toggleSidebar}>
    <Menu size={20} />
  </button>
)}
```

### 2. Forms
```jsx
// Single column on mobile, 2 columns on tablet+
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <input />
  <input />
</div>
```

### 3. Cards vs Tables
```jsx
// Mobile: Card list
<div className="lg:hidden space-y-3">
  {items.map(item => <TaskCard key={item.id} task={item} />)}
</div>

// Desktop: Table
<div className="hidden lg:block">
  <table>{/* table content */}</table>
</div>
```

### 4. Filter Drawer
```jsx
// Mobile: Slide-in drawer from right
// Desktop: Inline filters or dropdown

<button onClick={() => setShowFilters(true)}>
  <Filter size={16} />
  Filters
</button>

{showFilters && (
  <div className="fixed inset-0 z-50 lg:hidden">
    {/* Drawer content */}
  </div>
)}
```

## 🚀 Migration Guide

### Converting Existing Pages

1. **Wrap page in ResponsivePageLayout:**
```jsx
// Before
<div className="flex h-screen">
  <Sidebar />
  <main className="flex-1">
    <header>...</header>
    <div>{content}</div>
  </main>
</div>

// After
<ResponsivePageLayout title="Page Title">
  {content}
</ResponsivePageLayout>
```

2. **Convert modals to ResponsiveModal:**
```jsx
// Before
<div className="fixed inset-0 flex items-center justify-center">
  <div className="bg-white p-8 rounded">
    {content}
  </div>
</div>

// After
<ResponsiveModal isOpen={true} onClose={handleClose} title="Title">
  {content}
</ResponsiveModal>
```

3. **Convert tables to cards on mobile:**
```jsx
// Add card view for mobile
<div className="lg:hidden">
  {items.map(item => <TaskCard key={item.id} task={item} />)}
</div>

// Keep table for desktop
<div className="hidden lg:block">
  <table>{/* existing table */}</table>
</div>
```

## ✅ Testing Checklist

### Mobile (360px - 640px)
- [ ] No horizontal scrolling
- [ ] Text is readable (minimum 14px)
- [ ] Buttons are tappable (≥44px)
- [ ] Inputs are full-width
- [ ] Modals are full-screen
- [ ] Navigation via hamburger menu
- [ ] Tables converted to cards

### Tablet (640px - 1024px)
- [ ] 2-column layouts work
- [ ] Sidebar appears (if applicable)
- [ ] Modals are centered cards
- [ ] Touch targets still ≥44px
- [ ] Typography scales appropriately

### Desktop (1024px+)
- [ ] Full layout with sidebar
- [ ] Multi-column grids
- [ ] Tables visible
- [ ] Hover states work
- [ ] Content doesn't exceed max-width
- [ ] No wasted whitespace

## 🎬 Animations

All animations are defined in `tailwind.config.js`:

- `slideUp` - Modal entrance on mobile
- `scaleIn` - Modal entrance on desktop
- `slideInRight` - Drawer entrance
- `fadeIn` - General fade entrance
- `fadeInUp` - Fade + slide up

## 🔧 Utilities

### Responsive Conditionals in Code
```jsx
const { isMobile } = useSidebar();

{isMobile ? (
  <MobileView />
) : (
  <DesktopView />
)}
```

### Responsive Props
```jsx
// Use different values per breakpoint
<Component
  size={isMobile ? 'small' : 'large'}
  columns={isMobile ? 1 : 3}
/>
```

## 📝 Best Practices

1. **Always start with mobile styles**
2. **Use semantic HTML**
3. **Ensure keyboard accessibility**
4. **Test on real devices**
5. **Use responsive images** (`srcset`, `sizes`)
6. **Optimize for touch** (no hover-only interactions)
7. **Prevent layout shift** (reserve space for dynamic content)
8. **Use CSS Grid** for complex layouts
9. **Use Flexbox** for simple alignments
10. **Keep specificity low** for easier overrides

## 🐛 Common Issues

### Issue: Horizontal scroll on mobile
**Solution:** Check for fixed widths, use `max-w-full` and `overflow-hidden`

### Issue: Text too small on mobile
**Solution:** Use minimum 14px font size, prefer 16px for body text

### Issue: Buttons too small to tap
**Solution:** Ensure minimum 44x44px, add padding

### Issue: Modal doesn't fit on small screens
**Solution:** Use ResponsiveModal component (full-screen on mobile)

### Issue: Table breaks layout
**Solution:** Use card view on mobile, table on desktop

## 📚 Resources

- [Tailwind Breakpoints](https://tailwindcss.com/docs/responsive-design)
- [Touch Target Size](https://web.dev/accessible-tap-targets/)
- [Mobile First Design](https://medium.com/@Vincentxia77/what-is-mobile-first-design-why-its-important-how-to-make-it-7d3cf2e29d00)
- [Responsive Typography](https://css-tricks.com/linearly-scale-font-size-with-css-clamp-based-on-the-viewport/)

## 🎯 Next Steps

1. Apply ResponsivePageLayout to all pages
2. Convert all modals to ResponsiveModal
3. Add card views for all tables
4. Test on physical devices
5. Optimize images for responsive delivery
6. Add loading states for dynamic content
7. Implement skeleton screens
8. Add responsive navigation menu
9. Optimize bundle size
10. Performance audit with Lighthouse
