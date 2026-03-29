# Express 5 Upgrade Plan (Compatibility-First)

Goal: remove remaining Express 4 vulnerability surface with controlled risk.

## Scope

- Upgrade backend runtime from Express 4.x to 5.x.
- Preserve API behavior for auth, users, tasks, attendance, notifications, and realtime hooks.

## 1) Pre-Upgrade Checks

- [ ] Freeze current backend lockfile and tag a rollback point.
- [ ] Record baseline API responses for critical routes:
  - `POST /api/auth/login`
  - `GET /api/users/me`
  - `GET /api/tasks`
  - `POST /api/attendance/check-in`
  - `GET /api/notifications`
- [ ] Capture middleware order in `backend/server.js` (helmet, cors, parsers, auth, routes, error handlers).

## 2) Code Compatibility Audit

- [ ] Check route patterns for path-to-regexp behavior differences.
- [ ] Verify async handlers rely on centralized error middleware (Express 5 forwards rejected promises).
- [ ] Validate body parsing limits and JSON/urlencoded behavior remain unchanged.
- [ ] Confirm custom error payload shape remains stable for frontend consumers.

## 3) Controlled Upgrade Steps

- [ ] Update dependency:
  - `express` to latest 5.x
- [ ] Reinstall dependencies and regenerate lockfile.
- [ ] Start backend in development mode and run smoke checks.

## 4) Validation Matrix

- [ ] Authentication:
  - login/logout, refresh, protected route access.
- [ ] User management:
  - create/update/delete/reset password, bulk import endpoints.
- [ ] Attendance:
  - check-in/check-out, verification settings, exception flows.
- [ ] Notifications:
  - fetch unread count, mark read, socket event emissions.
- [ ] File upload paths:
  - import templates and multipart routes.

## 5) Deployment Safety

- [ ] Deploy behind a canary release (10-20% traffic).
- [ ] Watch 4xx/5xx rates, auth failures, and route mismatch errors.
- [ ] Roll forward only after 24h stable metrics.

## Rollback Plan

- Revert to previous git tag and lockfile.
- Redeploy previous backend container image.
- Verify DB schema unchanged (no rollback migration needed for this upgrade path).
