# Dead Code Report — AetherTrack SaaS Frontend
> Generated: 2026-03-06  
> Scope: `frontend/src/`

---

## Files Removed

All of the following files were confirmed to have no active consumers (not imported in any route, page, or component) and were permanently deleted.

| File (original location) | Reason for Removal |
|---|---|
| `components/Sidebar_BROKEN_BACKUP.jsx` | Explicit backup artifact committed to source; not imported anywhere. Superseded by `shared/components/layout/Sidebar.jsx` |
| `components/Sidebar_FIXED.jsx` | Second backup copy of the Sidebar; not imported anywhere. Superseded by active Sidebar |
| `components/AuthDebug.jsx` | Debug-only component for development inspection; never referenced in any route or production component |
| `pages/RegisterDisabled.jsx` | Placeholder page that explicitly disables registration; not present in any route in `App.jsx` |
| `pages/CommunityRegister.jsx` | Unused community registration page; no route registered in `App.jsx` |
| `pages/CommunityUserManagement.jsx` | Unused community user management page; no route registered in `App.jsx` |

---

## Total

- **6 files removed**
- **~400 lines of dead code eliminated**

---

## Notes

- `pages/ScreenshotDemo.jsx` was retained and moved to `features/admin/pages/ScreenshotDemo.jsx`. Although it is a marketing utility, it has an active route (`/screenshot-demo`) in `App.jsx`.
- The old `hooks/index.js` (a partial barrel from the original structure) was superseded by `shared/hooks/index.js`.
- The old `components/layouts/index.js` was superseded by `shared/components/responsive/index.js`.

---

## Candidates for Future Review

These files were **retained** but should be reviewed in the next sprint:

| File | Concern |
|---|---|
| `features/analytics/utils/mockDataGenerator.js` | Only used to generate demo/test data; confirm whether this is needed in production builds |
| `features/projects/utils/ganttDebugger.jsx` | Debug utility for Gantt chart rendering; should be gated by `NODE_ENV !== 'production'` |
| `features/auth/components/` | Folder created but currently empty; populate or remove |
