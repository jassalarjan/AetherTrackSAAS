# Repository Audit — AetherTrack SaaS Frontend
> Generated: 2026-03-06  
> Scope: `frontend/src/`

---

## 1. Current Structure Overview

```
frontend/src/
├── api/            (5 files) — Axios instance, token store, domain-specific API modules
├── components/     (40+ files) — Mixed UI primitives + feature-specific components
│   ├── landing/    (7 files)
│   ├── layouts/    (5 files)
│   └── modals/     (3 files)
├── context/        (3 files) — Auth, Theme, Sidebar contexts
├── data/           (1 file)  — pages.json route metadata
├── hooks/          (17 files + index.js)
├── pages/          (35 files) — Flat page components, all in one directory
├── routes/         (1 file)  — ProtectedRoute
├── utils/          (14 files) — Mix of helpers, services, and hooks
└── CSS files       (7 files)  — Globally scattered stylesheets
```

**Total files audited:** ~140

---

## 2. Duplicate Logic Report

| Category | Files Involved | Notes |
|---|---|---|
| Report generators | `utils/reportGenerator.js` (616 lines) + `utils/comprehensiveReportGenerator.js` (1036 lines) | Overlapping analytics/report generation logic. Both produce PDF/Excel outputs from similar task data. Should be consolidated into `features/analytics/services/` |
| Date handling | `utils/dateNormalization.js` (234 lines) | Some date-formatting logic is duplicated inline in `pages/AttendancePage.jsx`, `pages/HRCalendar.jsx`, and `pages/Calendar.jsx` |
| Token management | `api/tokenStore.js` + `utils/secureTokenStorage.js` | Both handle auth token persistence. `tokenStore` is in-memory; `secureTokenStorage` wraps Capacitor's secure storage for mobile. Should be co-located under `features/auth/services/` |
| Socket initialization | `utils/mobileSocketManager.js` + `context/AuthContext.jsx` (inline socket init) | Socket setup logic split between two locations |
| Auto-update logic | `utils/autoUpdate.js` + `hooks/useAppAutoUpdate.js` | The hook consumes the utility — fine structure, but both live in different directories making discovery hard |
| Notification service | `utils/notificationService.js` + `hooks/useNotifications.js` + `hooks/usePushNotifications.js` | Three files for the same notification domain; should be co-located in `features/notifications/` |

---

## 3. Redundant / Backup Components

| File | Issue |
|---|---|
| `components/Sidebar_BROKEN_BACKUP.jsx` | Explicit backup file committed to source — dead code |
| `components/Sidebar_FIXED.jsx` | Second copy of Sidebar; same export name as `Sidebar.jsx` — dead code |
| `components/AuthDebug.jsx` | Debug-only component with no production route or consumer |
| `pages/ScreenshotDemo.jsx` | Marketing screenshot helper; no application role |
| `pages/RegisterDisabled.jsx` | Disabled/placeholder page; never rendered in active routes |

---

## 4. Dead Code List

| File | Reason |
|---|---|
| `components/Sidebar_BROKEN_BACKUP.jsx` | Not imported anywhere; backup artifact |
| `components/Sidebar_FIXED.jsx` | Not imported anywhere; superseded |
| `components/AuthDebug.jsx` | Not referenced in any active route or component |
| `pages/RegisterDisabled.jsx` | Not in any route in `App.jsx` |
| `pages/CommunityRegister.jsx` | Not in any route in `App.jsx` |
| `pages/CommunityUserManagement.jsx` | Not in any route in `App.jsx` |

---

## 5. Misplaced Files Report

| File (Current Location) | Correct Location | Reason |
|---|---|---|
| `utils/notificationService.js` | `features/notifications/services/` | Domain service, not a generic utility |
| `utils/mobileSocketManager.js` | `shared/services/socketManager.js` | Infrastructure service, not a utility |
| `utils/autoUpdate.js` | `shared/services/autoUpdate.js` | App-level service |
| `utils/secureTokenStorage.js` | `features/auth/services/` | Auth-domain concern |
| `utils/mockDataGenerator.js` | `features/analytics/utils/` | Only used by analytics tests/demos |
| `utils/reportGenerator.js` | `features/analytics/services/` | Domain service |
| `utils/comprehensiveReportGenerator.js` | `features/analytics/services/` | Domain service |
| `utils/ganttNormalization.js` | `features/projects/utils/` | Projects-specific |
| `utils/ganttDebugger.jsx` | `features/projects/utils/` | Projects-specific debug util |
| `utils/calendarEngine.js` | `features/projects/utils/` | Used by ProjectGantt and Calendar |
| `utils/landingUtils.js` | `features/landing/utils/` | Landing-specific |
| `utils/useClickOutside.js` | `shared/hooks/` | It's a hook, not a utility |
| `utils/useDebounce.js` | `shared/hooks/` | It's a hook, not a utility |
| `api/tokenStore.js` | `features/auth/services/` | Auth-domain concern |
| `api/attendanceApi.js` | `features/hr/services/` | HR-domain concern |
| `api/geofenceApi.js` | `features/hr/services/` | HR-domain concern |
| `api/projectsApi.js` | `features/projects/services/` | Projects-domain concern |
| `components/ActivityFeed.jsx` | `features/dashboard/components/` | Only used by dashboard |
| `components/AIInsight.jsx` | `features/dashboard/components/` | Only used by dashboard |
| `components/AISuggestion.jsx` | `features/dashboard/components/` | Only used by dashboard |
| `components/KPICard.jsx` | `features/dashboard/components/` | Only used by dashboard |
| `components/AttendanceReviewModal.jsx` | `features/hr/components/` | HR-domain only |
| `components/LocationCapture.jsx` | `features/hr/components/` | HR-domain only |
| `components/PhotoCapture.jsx` | `features/hr/components/` | HR-domain only |
| `components/MapView.jsx` | `features/hr/components/` | HR-domain only |
| `components/TaskCard.jsx` | `features/tasks/components/` | Tasks-domain only |
| `components/ProjectLabel.jsx` | `features/projects/components/` | Projects-domain only |
| `components/SprintLabel.jsx` | `features/projects/components/` | Projects-domain only |
| `components/CommandPalette.jsx` | `features/tasks/components/` | Task-search focused |
| `components/ShortcutsOverlay.jsx` | `features/tasks/components/` | Used primarily in Tasks context |
| `components/NotificationPrompt.jsx` | `features/notifications/components/` | Notifications-domain |
| `components/NotificationSettings.jsx` | `features/notifications/components/` | Notifications-domain |
| `components/SessionSettings.jsx` | `features/settings/components/` | Settings-domain |
| `context/AuthContext.jsx` | `features/auth/context/` | Auth-domain concern |
| `context/SidebarContext.jsx` | `features/workspace/context/` | Workspace UI state |
| `context/ThemeContext.jsx` | `app/providers/ThemeProvider.jsx` | Global app concern |
| `hooks/useDragAndDrop.js` | `features/tasks/hooks/` | Tasks-domain hook |
| `hooks/useInlineEdit.js` | `features/tasks/hooks/` | Tasks-domain hook |
| `hooks/useShifts.js` | `features/hr/hooks/` | HR-domain hook |
| `hooks/useVerification.js` | `features/hr/hooks/` | HR-domain hook |
| `hooks/useNotifications.js` | `features/notifications/hooks/` | Notifications-domain |
| `hooks/usePushNotifications.js` | `features/notifications/hooks/` | Notifications-domain |
| `hooks/useMeetings.js` | `shared/hooks/` | Cross-feature (calendar + workspace) |
| `components/landing/*.jsx` | `features/landing/components/` | Landing page feature |
| `pages/*.jsx` (all) | `features/[domain]/pages/` | Should be in feature modules |

---

## 6. Architectural Inconsistencies

### 6.1 All pages are flat in a single directory
`pages/` contains 35 components spanning 10+ different domains with no sub-grouping. This makes navigation poor and causes accidental cross-domain coupling.

### 6.2 No path aliases
Every import uses deep relative paths (`../../../context/AuthContext`). A single file move invalidates multiple imports. No `@features/`, `@shared/`, or `@app/` aliases exist in `vite.config.js`.

### 6.3 Business logic embedded in page components
All pages contain API calls, state management, socket subscriptions, and filtering logic inline. Examples:
- `HRDashboard.jsx` — 2029 lines mixing API calls + chart rendering + modal state
- `Tasks.jsx` — 1487 lines with full CRUD logic embedded
- `Workspace.jsx` — 1618 lines with socket setup + data transformations
- `Analytics.jsx` — 1332 lines with data fetching + chart generation

### 6.4 Pages wildly exceed the 300-line guideline

| Page | Lines | Overage |
|---|---|---|
| HRDashboard.jsx | 2029 | 577% |
| Workspace.jsx | 1618 | 439% |
| Tasks.jsx | 1487 | 396% |
| Analytics.jsx | 1332 | 344% |
| ProjectDetail.jsx | 1230 | 310% |
| UserManagement.jsx | 1186 | 295% |
| ProjectGantt.jsx | 1180 | 293% |
| AttendancePage.jsx | 1097 | 266% |
| LeavesPage.jsx | 1033 | 244% |
| Sidebar.jsx | 1012 | 237% |
| ProjectDashboard.jsx | 984 | 228% |
| EmailCenter.jsx | 957 | 219% |
| Kanban.jsx | 979 | 226% |

### 6.5 No feature isolation
Features import directly from each other's internal files. For example, `Tasks.jsx` imports from `components/ProjectLabel.jsx` which is a projects-domain component — cross-feature coupling with no boundary enforcement.

### 6.6 Context providers instantiated inside App.jsx
`ThemeProvider`, `AuthProvider`, `SidebarProvider`, and `ToastProvider` are nested directly in the `App()` function making the provider tree hard to audit, test, or extend.

### 6.7 No barrel exports
No `index.js` files in any current directories. Every consumer imports directly from the file, making internal refactoring instantly breaking.

### 6.8 Hooks misnamed/misplaced in utils
`utils/useClickOutside.js` and `utils/useDebounce.js` follow hook naming conventions (`use*`) but live in `utils/` instead of `hooks/`.

### 6.9 Multiple CSS files without clear ownership
Seven global stylesheet files (`index.css`, `animations.css`, `mobile-responsive.css`, `design-tokens.css`, `tokens.css`, `ui-system.css`, `aethertrack-reference.css`) spread across `src/` root with no organisation into `styles/`.

---

## 7. Summary Statistics

| Category | Count | Notes |
|---|---|---|
| Total source files | ~140 | Across pages, components, hooks, utils, api, context |
| Dead code files | 6 | Safe to remove |
| Misplaced files | 38 | Wrong directory for their domain |
| Files >300 lines | 20+ | Exceed the component size rule |
| Cross-feature imports | 15+ | Direct coupling without public API boundary |
| Missing barrel exports | All dirs | No `index.js` in any existing folder |
| Path aliases present | 0 | All imports use raw relative paths |
| Duplicate logic pairs | 6 | Report generators, token stores, sockets, notifications |

---

## 8. Recommended Target Architecture

See `docs/architecture.md` for the full feature-based structure.

The refactoring maps to feature domains:

| Domain | Pages | Unique Services/Utils |
|---|---|---|
| `auth` | Login, VerifyEmail, ForgotPassword, ResetPassword | AuthContext, tokenStore, secureTokenStorage |
| `dashboard` | Workspace | ActivityFeed, KPICard, AIInsight, AISuggestion |
| `tasks` | Tasks, Kanban | TaskCard, useDragAndDrop, useInlineEdit |
| `projects` | ProjectDashboard, MyProjects, ProjectDetail, ProjectGantt, SprintManagement, ResourceWorkload, ReallocationDashboard | projectsApi, calendarEngine, ganttNormalization |
| `hr` | HRDashboard, AttendancePage, SelfAttendance, HRCalendar, LeavesPage, EmailCenter, VerificationSettings, GeofenceManagement | attendanceApi, geofenceApi, useShifts, useVerification |
| `notifications` | Notifications | notificationService, useNotifications, usePushNotifications |
| `workspace` | Teams, UserManagement | SidebarContext |
| `analytics` | Analytics | reportGenerator, comprehensiveReportGenerator, mockDataGenerator |
| `settings` | Settings | SessionSettings |
| `admin` | AuditLog, ChangeLog, FeatureMatrix | — |
| `calendar` | Calendar | — |
| `landing` | (public pages) | landingUtils |
