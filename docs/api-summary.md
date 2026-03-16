# AetherTrack — API Summary

All endpoints are prefixed with `/api`. Authentication uses `Authorization: Bearer <access_token>` unless noted as "cookie-only" (for the token refresh flow).

**Roles:** `admin` | `hr` | `team_lead` | `member` | `community_admin`  
- `admin` — Full system access  
- `hr` — Workforce and HR module access  
- `team_lead` — Project, task, and team management  
- `member` — Own tasks, self check-in/out, leave requests  
- `community_admin` — Workspace-scoped administrator (sub-tenant admin)

---

## Auth — `/api/auth`

| Method | Endpoint | Purpose | Auth Required |
|---|---|---|---|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login → access token + refresh cookie | No (rate-limited) |
| POST | `/auth/refresh` | Silent token refresh via httpOnly cookie | No (cookie) |
| POST | `/auth/logout` | Invalidate token + clear cookie | Yes |
| POST | `/auth/verify-email` | Verify email via OTP code | No |
| POST | `/auth/resend-verification` | Resend email OTP | No |
| POST | `/auth/forgot-password` | Send password reset link | No (rate-limited) |
| POST | `/auth/reset-password` | Reset password with token | No (rate-limited) |
| GET | `/auth/verify` | Get current user profile | Yes |

---

## Users — `/api/users`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| GET | `/users/me` | Own profile | Any |
| PATCH | `/users/me` | Update own profile | Any |
| POST | `/users/me/profile-picture` | Upload avatar (Cloudinary) | Any |
| DELETE | `/users/me/profile-picture` | Remove avatar | Any |
| POST | `/users/me/change-password` | Change own password | Any |
| GET | `/users/` | List all users | admin, hr |
| GET | `/users/team-members` | List team members (lead's team only) | team_lead |
| GET | `/users/:id` | Get user by ID | admin, hr |
| POST | `/users/` | Create user + send credentials email | admin, hr |
| PUT | `/users/:id` | Update user | admin, hr |
| DELETE | `/users/:id` | Delete user | admin, hr |
| POST | `/users/bulk-delete` | Delete multiple users | admin, hr |
| PATCH | `/users/:id/password` | Reset employee password | admin, hr, community_admin |
| PATCH | `/users/:id/role` | Change user role | admin, hr |
| PATCH | `/users/:id/activate` | Activate user account | admin, hr |
| PATCH | `/users/:id/deactivate` | Deactivate user account | admin, hr |
| POST | `/users/bulk-import/excel` | Bulk import from `.xlsx` | admin, hr |
| POST | `/users/bulk-import/json` | Bulk import from JSON | admin, hr |
| GET | `/users/bulk-import/template` | Download Excel template | admin, hr |

---

## Teams — `/api/teams`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| GET | `/teams/` | List teams | admin, hr, team_lead |
| POST | `/teams/` | Create team | admin, hr |
| GET | `/teams/:id` | Get team | Any |
| PATCH | `/teams/:id` | Update team | admin, hr |
| DELETE | `/teams/:id` | Delete team | admin, hr |
| POST | `/teams/:id/members` | Add member | admin, hr |
| POST | `/teams/:id/members/bulk` | Add multiple members | admin, hr |
| DELETE | `/teams/:id/members/:userId` | Remove member | admin, hr |
| PATCH | `/teams/:id/pin` | Pin/unpin team | admin, hr |
| PATCH | `/teams/:id/priority` | Set display priority | admin, hr |
| POST | `/teams/reorder` | Reorder all teams | admin, hr |
| DELETE | `/teams/bulk/all` | Delete all teams | admin, hr |

---

## Tasks — `/api/tasks`

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/tasks/` | List tasks (filterable by status, priority, team, project, sprint, assignee) | Yes |
| POST | `/tasks/` | Create task | Yes |
| GET | `/tasks/:id` | Get task detail | Yes |
| PATCH | `/tasks/:id` | Update task (partial) | Yes |
| DELETE | `/tasks/:id` | Delete task | Yes |
| GET | `/tasks/:taskId/comments` | List comments | Yes |
| POST | `/tasks/:taskId/comments` | Add comment | Yes |

---

## Projects — `/api/projects`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| GET | `/projects/` | List projects | Any |
| GET | `/projects/my-projects` | Projects current user is member of | Any |
| GET | `/projects/dashboard-stats` | Aggregate stats | Any |
| GET | `/projects/:id` | Get project | Any |
| POST | `/projects/` | Create project | admin, hr, team_lead |
| PUT | `/projects/:id` | Update project | admin, hr, team_lead |
| DELETE | `/projects/:id` | Delete project | admin, hr, team_lead |
| POST | `/projects/:id/members` | Add member to project | admin, hr, team_lead |
| DELETE | `/projects/:id/members/:userId` | Remove member | admin, hr, team_lead |
| POST | `/projects/:id/upload-document` | Upload document to Cloudinary | Any |
| DELETE | `/projects/:id/documents/:docIndex` | Remove document | Any |
| GET | `/projects/:id/schedule` | Get Gantt schedule | Any |
| POST | `/projects/:id/schedule/refresh` | Recompute schedule | Any |
| PATCH | `/projects/:id/tasks/:taskId/dates` | Update task dates in Gantt | Any |

---

## Sprints — `/api/sprints`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/sprints/` | List sprints |
| GET | `/sprints/active` | Active sprint only |
| GET | `/sprints/:id` | Get sprint |
| POST | `/sprints/` | Create sprint |
| PUT | `/sprints/:id` | Update sprint |
| DELETE | `/sprints/:id` | Delete sprint |
| PATCH | `/sprints/:id/progress` | Update progress % |

---

## Attendance — `/api/attendance`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| POST | `/attendance/checkin` | Check in with GPS + optional photo | Any |
| POST | `/attendance/checkout` | Check out | Any |
| GET | `/attendance/` | List attendance records | Any |
| GET | `/attendance/summary/:userId?` | Attendance summary/stats | Any |
| POST | `/attendance/mark` | Admin manual attendance mark | admin, hr |
| PUT | `/attendance/:id` | Update attendance record | admin, hr |
| GET | `/attendance/dashboard` | HR dashboard stats | admin, hr |
| POST | `/attendance/recalculate` | Recalculate metrics | admin, hr |
| GET | `/attendance/pending-reviews` | Records awaiting review | admin, hr |
| GET | `/attendance/:id/review` | Review detail | admin, hr |
| POST | `/attendance/:id/approve` | Approve attendance | admin |
| POST | `/attendance/:id/reject` | Reject attendance | admin |
| POST | `/attendance/:id/override` | Override status | admin |
| POST | `/attendance/bulk-review` | Bulk approve/reject | admin |
| GET | `/attendance/:id/audit` | Audit trail for record | admin, hr |
| GET | `/attendance/audit-log` | Full audit log | admin, hr |
| GET/PUT | `/attendance/verification-settings` | Get/update verification config | admin, hr |
| GET/POST/DELETE | `/attendance/policies` | Attendance policy CRUD | admin, hr |
| GET/POST | `/attendance/exceptions` | Exception requests | Any |
| POST | `/attendance/exceptions/:id/approve` | Approve exception | admin, hr |
| POST | `/attendance/exceptions/:id/reject` | Reject exception | admin, hr |

---

## Leaves — `/api/leaves`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| GET | `/leaves/` | List leave requests | Any |
| POST | `/leaves/` | Submit leave request | Any |
| PATCH | `/leaves/:id/status` | Approve/reject leave | admin, hr |
| GET | `/leaves/balance/:userId?` | Own/user leave balance | Any |
| GET | `/leaves/balances` | All balances | admin, hr |
| PATCH | `/leaves/:id/notes` | Add HR notes | admin, hr |
| DELETE | `/leaves/:id` | Delete request | Any |

---

## Shifts — `/api/shifts`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/shifts/` | List shifts |
| POST | `/shifts/` | Create shift (HR/Admin) |
| PUT | `/shifts/:id` | Update shift |
| DELETE | `/shifts/:id` | Delete shift |
| GET | `/shifts/my-shift` | Own active shift |
| GET/POST/PUT | `/shifts/policy/*` | Shift policy management |
| GET/POST/PUT/DELETE | `/shifts/assignments/*` | Fixed assignments |
| GET/POST/PUT/DELETE | `/shifts/rotations/*` | Rotation rules |

---

## Verification / Geofence — `/api/verification`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| GET | `/verification/` | List geofences | admin, hr |
| POST | `/verification/` | Create geofence | admin |
| GET | `/verification/:id` | Get geofence | admin, hr |
| PUT | `/verification/:id` | Update geofence | admin |
| DELETE | `/verification/:id` | Delete geofence | admin |
| GET/POST | `/verification/validate` | Validate location | Any |
| GET/POST | `/verification/status` | Verification settings | Any |
| GET | `/verification/nearby` | Nearby geofences | admin, hr |
| POST | `/verification/:id/toggle` | Toggle active | admin |
| POST | `/verification/bulk` | Bulk create | admin |

---

## Email Templates — `/api/email-templates`

| Method | Endpoint | Purpose | Roles |
|---|---|---|---|
| GET | `/email-templates/` | List templates | admin, hr |
| POST | `/email-templates/` | Create template | admin, hr |
| PUT | `/email-templates/:id` | Update template | admin, hr |
| DELETE | `/email-templates/:id` | Delete template | admin, hr |
| POST | `/email-templates/test` | Send test email | admin, hr |
| POST | `/email-templates/send` | Send to specific user | admin, hr |
| POST | `/email-templates/bulk-send` | Send to multiple | admin, hr |
| GET | `/email-templates/users` | List users for recipient picker | admin, hr |
| GET | `/email-templates/config` | Email config status | admin, hr |

---

## Other Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/notifications/` | List / mark-read notifications |
| GET | `/changelog/` | Paginated audit log (admin only) |
| GET | `/changelog/stats` | Event type stats (admin only) |
| GET | `/changelog/export` | Export all logs (admin only) |
| DELETE | `/changelog/clear` | Clear logs (admin only) |
| GET/PATCH | `/settings/user` | User settings |
| GET/PATCH | `/settings/workspace` | Workspace settings (admin, hr) |
| GET/POST/PATCH/DELETE | `/settings/workspace/webhooks` | Webhook management |
| POST | `/settings/user/data-export` | Request data export |
| GET | `/meetings/` | List meetings |
| POST | `/meetings/` | Create meeting |
| PUT/PATCH/DELETE | `/meetings/:id` | Manage meeting |
| POST | `/meetings/check-conflicts` | Check scheduling conflicts |
| POST | `/notifications/register-device` | Register FCM token |
| GET | `/mobile/latest-bundle` | OTA bundle info |
| GET | `/holidays/` | List holidays |
| GET | `/hr-calendar/` | HR calendar events |
| GET | `/leave-types/` | List leave types (admin/hr CRUD) |
