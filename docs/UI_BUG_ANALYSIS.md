# UI Bug Analysis & Fix Report

**Date:** 2025  
**Scope:** Tasks, Projects, and HR module pages  
**Status:** All issues resolved ✅

---

## Overview

This document records all UI/layout bugs identified and fixed in AetherTrack's Tasks, Projects, and HR module pages.

---

## Issues Fixed

### 1. Sidebar Overlap (`aethertrack-reference.css`)

| Field | Detail |
|---|---|
| **File** | `frontend/src/styles/aethertrack-reference.css` |
| **Severity** | Critical |
| **Root Cause** | A "CRITICAL SHELL LAYOUT OVERRIDES" block at the bottom of the stylesheet forced `position: fixed` on ALL `.sidebar` elements, taking them out of the flex flow and causing them to overlap page content. |
| **Fix** | Changed `.sidebar { position: fixed }` → `position: relative`. Added explicit `position: fixed !important; top: 0; left: 0` only to `.sidebar--mobile-drawer`. Removed a redundant duplicate `@media (max-width: 1023px)` rule. |
| **Result** | Sidebar sits correctly inside the flex layout on desktop. Mobile drawer still slides in as `position: fixed`. |

---

### 2. App Version Badge Position (`AppVersionIndicator.jsx`)

| Field | Detail |
|---|---|
| **File** | `frontend/src/shared/components/ui/AppVersionIndicator.jsx` |
| **Severity** | Medium |
| **Root Cause** | Both the expanded card and trigger pill used `left: '12px'`, placing the badge behind/over the sidebar rail. |
| **Fix** | Changed `left: '12px'` → `right: '12px'` on both the expanded card (`bottom: 56px`) and trigger pill (`bottom: 14px`). |
| **Result** | Badge is now anchored bottom-right, clear of the sidebar. |

---

### 3. Double Padding — Projects Pages

| Field | Detail |
|---|---|
| **Files** | `frontend/src/features/projects/pages/ProjectDashboard.jsx`, `MyProjects.jsx` |
| **Severity** | High |
| **Root Cause** | Both pages wrapped their content in `<div className="p-8 space-y-8">` inside `<ResponsivePageLayout>`, which already provides `p-3 xs:p-4 sm:p-6 lg:p-8` padding. This caused double padding (64px total at lg) and visual crowding. Additionally, both pages rendered their own `<h2>` title elements duplicating the title already shown by `ResponsivePageLayout`'s `AppHeader`. |
| **Fix** | Removed the `p-8` outer container, replaced with `space-y-6`. Removed the inner `<h2>` heading blocks and redundant icon-box headers. Kept action buttons (`flex gap-3`) in a top-aligned `justify-end` bar. |
| **Result** | Pages use consistent layout padding from `ResponsivePageLayout`. No redundant page titles. |

---

### 4. HRDashboard Tab Bar / Grid Alignment (`HRDashboard.jsx`)

| Field | Detail |
|---|---|
| **File** | `frontend/src/features/hr/pages/HRDashboard.jsx` |
| **Severity** | Medium |
| **Root Cause** | Two layout issues:<br>1. **Tab bar** used bare `flex gap-4` with no visual container, making tabs visually indistinguishable from page content.<br>2. **Summary Cards** grid used `lg:grid-cols-5` but only 4 cards were rendered, leaving an empty slot and an uneven layout.<br>3. **Quick Actions** grid used `lg:grid-cols-4` but only 3 buttons were rendered. |
| **Fix** | Tab bar: changed to pill-group container with `flex gap-1 p-1 rounded-xl border` using theme tokens, and added `shadow-sm` to the active tab. | Summary Cards: changed `lg:grid-cols-5` → `lg:grid-cols-4`. Quick Actions: changed `lg:grid-cols-4` → `md:grid-cols-3`. |
| **Result** | Tab bar is visually distinct with a pill/card container. Stats grid and Quick Actions are balanced across the correct number of columns. |

---

### 5. Missing `rounded-lg` on Action Buttons (`AttendancePage.jsx`)

| Field | Detail |
|---|---|
| **File** | `frontend/src/features/hr/pages/AttendancePage.jsx` |
| **Severity** | Low–Medium |
| **Root Cause** | The Check In and Check Out header action buttons used `${currentTheme.primary}` for background and `${currentTheme.primaryHover}` for hover, but `rounded-lg` was not included in the base className. Dynamic theme classes only supply background/text, not border-radius. |
| **Fix** | Added `rounded-lg` to both button `className` strings: `px-4 py-2 rounded-lg ${currentTheme.primary} ...` |
| **Result** | Check In/Check Out buttons now have consistent rounded corners matching the rest of the app. |

---

### 6. Wrong Hover Color & Inconsistent Rounding — Leave Table Buttons (`LeavesPage.jsx`)

| Field | Detail |
|---|---|
| **File** | `frontend/src/features/hr/pages/LeavesPage.jsx` |
| **Severity** | Medium |
| **Root Cause** | Two issues:<br>1. The "View Details" button (blue `bg-blue-600`) had `hover:bg-[#A35C28]` — the brand orange dark variant — as its hover color. This was a copy-paste error from an orange brand button.<br>2. All four table action buttons (View Details, Approve, Reject, Add Notes) used `rounded` (2px) instead of `rounded-lg` (8px), inconsistent with the rest of the app. Padding `py-1` was also too tight for comfortable tap targets. |
| **Fix** | Changed `hover:bg-[#A35C28] dark:hover:bg-[#A35C28]` → `hover:bg-blue-700 dark:hover:bg-blue-600` on "View Details". Changed all four action buttons from `text-xs rounded` → `text-xs rounded-lg` and from `py-1` → `py-1.5`. |
| **Result** | Blue button now hovers correctly to a darker blue. All action buttons have consistent rounded corners and comfortable vertical padding. |

---

### 7. Filter Bar Height Inconsistency (`Tasks.jsx`)

| Field | Detail |
|---|---|
| **File** | `frontend/src/features/tasks/pages/Tasks.jsx` |
| **Severity** | Low |
| **Root Cause** | The filter bar row mixed three heights: search input `h-11` (44px), filter selects `h-10` (40px), and the "Clear filters" button `h-9` (36px). This created a visually misaligned control row. |
| **Fix** | Changed "Clear filters" button from `h-9` → `h-10` to match the filter select controls. |
| **Result** | All filter bar controls in the desktop inline row are now a consistent 40px height. |

---

## Summary Table

| # | File | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | `aethertrack-reference.css` | Sidebar `position: fixed` causing overlap | Critical | ✅ Fixed |
| 2 | `AppVersionIndicator.jsx` | Version badge anchored left, over sidebar | Medium | ✅ Fixed |
| 3 | `ProjectDashboard.jsx` | Double `p-8` padding + duplicate `<h2>` title | High | ✅ Fixed |
| 4 | `MyProjects.jsx` | Double `p-8` padding + redundant icon header | High | ✅ Fixed |
| 5 | `HRDashboard.jsx` | Tab bar no visual container; grid col mismatches | Medium | ✅ Fixed |
| 6 | `AttendancePage.jsx` | Check In/Out buttons missing `rounded-lg` | Low–Med | ✅ Fixed |
| 7 | `LeavesPage.jsx` | Wrong hover color on blue btn; `rounded` not `rounded-lg` | Medium | ✅ Fixed |
| 8 | `Tasks.jsx` | Filter bar height mixing `h-11`/`h-10`/`h-9` | Low | ✅ Fixed |
