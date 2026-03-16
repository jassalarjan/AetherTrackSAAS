# AetherTrack — Features

AetherTrack is a SaaS Team Management System for real-world businesses. The features below map directly to what is implemented in the codebase.

---

## 1. Authentication & Identity
**Purpose:** Secure employee login with token rotation, email verification, and password recovery.  
**Key files:**
- `backend/routes/auth.js` — register, login, refresh, logout, verify-email, forgot/reset-password
- `backend/utils/jwt.js` — token generation and verification
- `backend/utils/tokenBlacklist.js` — in-memory logout invalidation
- `frontend/src/features/auth/context/AuthContext.jsx` — React auth state, socket init, inactivity logout
- `frontend/src/features/auth/services/tokenStore.js` — in-memory access token store

**How it works:** Login returns a short-lived access token (15 min) and sets a httpOnly refresh cookie (7 days). The Axios interceptor silently refreshes on 401 and replays the failed request. Email verification is mandatory on registration. Password reset uses a time-limited token sent via Brevo. A 30-minute inactivity timer auto-logs out idle sessions.

---

## 2. Task Management
**Purpose:** Track all work across the business — assign tasks, monitor progress, and collaborate in real time.  
**Key files:**
- `backend/routes/tasks.js` — full CRUD + comment subresource
- `backend/models/Task.js` — task schema
- `frontend/src/features/tasks/pages/Tasks.jsx` — list view with filters, create/edit modals
- `frontend/src/features/tasks/pages/Kanban.jsx` — drag-and-drop Kanban board
- `frontend/src/features/tasks/components/TaskCard.jsx` — card with priority pip + SVG progress ring

**How it works:** Tasks are created via `POST /tasks` and filtered server-side by status, priority, team, project, sprint, or assignee. The Kanban board uses native HTML5 drag-and-drop; dropping a card into a new column triggers `PATCH /tasks/:id` and emits a `task:updated` Socket.IO event to all connected clients instantly. Keyboard shortcuts (`n` new, `f` filter, `/` search) improve power-user speed.

---

## 3. Project Management
**Purpose:** Deliver business projects on time with structured planning, Gantt timelines, and sprints.  
**Key files:**
- `backend/routes/projects.js` — CRUD, member management, schedule, document upload
- `backend/routes/sprints.js` — sprint CRUD + progress tracking
- `backend/models/Project.js`, `backend/models/Sprint.js`
- `backend/utils/calendarEngine.js` — working-day math for schedule computation
- `frontend/src/features/projects/pages/ProjectDashboard.jsx`, `ProjectGantt.jsx`

**How it works:** Projects hold a member roster with roles. Sprints are time-boxed iterations linked to a project. `GET /projects/:id/schedule` computes a Gantt schedule around working days (respecting holidays and weekends). Project documents (contracts, briefs, specs) are uploaded directly to Cloudinary. A resource workload view (`ResourceWorkload.jsx`) shows per-member capacity across active projects.

---

## 4. Attendance Management
**Purpose:** Enforce accountability with verified employee check-in/out including GPS location and optional photo proof.  
**Key files:**
- `backend/routes/attendance.js` — check-in, check-out, review queue, override, policies, exceptions
- `backend/services/geofenceService.js` — Haversine-based proximity validation
- `backend/utils/shiftService.js` — shift resolution + working-hours/late/overtime calculation
- `frontend/src/features/hr/pages/AttendancePage.jsx`, `SelfAttendance.jsx`
- `frontend/src/features/hr/components/LocationCapture.jsx`, `PhotoCapture.jsx`

**How it works:** `POST /attendance/checkin` accepts GPS coordinates and an optional photo (base64). The system resolves the employee's active shift via a 3-tier priority chain (rotation rule → fixed assignment → policy default), validates geofence proximity, then computes late minutes, early-exit minutes, net working hours, and overtime. The result is stored awaiting HR review. Admins can approve, reject, or override any record with a full audit trail.

---

## 5. Leave Management
**Purpose:** Give employees a structured way to request leave and give HR/managers a clean approval workflow.  
**Key files:**
- `backend/routes/leaves.js` — request submission, approve/reject, balance queries, HR notes
- `backend/routes/leaveTypes.js` — configure leave categories (Annual, Sick, Unpaid, etc.)
- `backend/models/LeaveRequest.js`, `LeaveBalance.js`, `LeaveType.js`
- `frontend/src/features/hr/pages/LeavesPage.jsx`

**How it works:** Employees submit `POST /leaves` with leave type, date range, and reason. HR or Admin update status via `PATCH /leaves/:id/status`. On approval or rejection, `HrEventService` automatically dispatches the corresponding Brevo email template (`LEAVE_APPROVED` / `LEAVE_REJECTED`) to the employee. Leave balances are tracked per employee per type and decremented on approval.

---

## 6. Shift Management
**Purpose:** Define working hours for the organization and assign them to employees — supporting fixed schedules, rotating shifts, and night shifts.  
**Key files:**
- `backend/routes/shifts.js` — shift definitions, policies, fixed assignments, rotation rules
- `backend/models/Shift.js`, `ShiftPolicy.js`, `ShiftRotationRule.js`, `EmployeeShiftAssignment.js`
- `backend/utils/shiftService.js` — `getActiveShiftForEmployee()`, `computeAttendanceMetrics()`

**How it works:** HR defines `Shift` records (start/end times, grace period, break policy, night-shift flag, min hours for present/half-day). Employees receive shifts as fixed assignments or via rotation rules that cycle through a sequence on daily/weekly/monthly cadences. At check-in, `getActiveShiftForEmployee()` resolves the correct shift so attendance metrics are calculated against the right schedule.

---

## 7. HR Email Center
**Purpose:** Automate the full employee lifecycle via professionally structured transactional emails — from onboarding to offboarding.  
**Key files:**
- `backend/routes/emailTemplates.js` — template CRUD, send, test, bulk-send
- `backend/models/EmailTemplate.js`
- `backend/services/hrEventService.js` — maps HR events to templates and dispatches via Brevo
- `backend/utils/templateVariableRegistry.js` — defines required variables per template
- `frontend/src/features/hr/pages/EmailCenter.jsx`

**How it works:** HR maintains HTML email templates in the database, each keyed by a code (e.g. `LEAVE_APPROVED`, `HIRED`, `TERMINATION_NOTICE`). When an HR event fires, `HrEventService.handleEvent()` looks up the active template, resolves variables, validates nothing is missing, and sends via Brevo. The email center UI lets HR manually compose and send any template to any employee, including bulk sends. 20+ event types cover the full workforce lifecycle.

---

## 8. Notifications
**Purpose:** Keep every team member informed in real time — in the browser and on their phone.  
**Key files:**
- `backend/routes/notifications.js` — list, mark-read
- `backend/models/Notification.js`, `DeviceToken.js`
- `backend/routes/mobile.js` — FCM device registration, push send, OTA bundle
- `frontend/src/features/notifications/hooks/useNotifications.js`
- `frontend/src/features/notifications/hooks/usePushNotifications.js`

**How it works:** In-app notifications are persisted to MongoDB and instantly pushed to the recipient via Socket.IO. On mobile, the Capacitor `PushNotifications` plugin registers the device's FCM token via `POST /notifications/register-device`. The backend can push targeted notifications to any registered device. Tapping a push notification deep-links directly to the relevant task or record within the app.

---

## 9. Employee & Team Management
**Purpose:** Manage the full employee directory — roles, departments, teams — and import entire workforces from spreadsheets.  
**Key files:**
- `backend/routes/teams.js` — team CRUD, member add/remove, reorder, pin
- `backend/routes/users.js` — employee CRUD, role management, bulk import (Excel/JSON), activate/deactivate
- `backend/models/Team.js`, `User.js`
- `frontend/src/features/workspace/pages/Teams.jsx`, `UserManagement.jsx`

**How it works:** Admins and HR can create teams, assign members with roles (team lead vs member), and control team ordering for dashboard display. `POST /users/bulk-import/excel` accepts an `.xlsx` file, validates each row, creates user accounts, and automatically emails credentials to every new employee. `PATCH /users/:id/activate` and `/deactivate` control account access without deleting data.

---

## 10. Analytics & Reporting
**Purpose:** Give managers and business owners quantified insight into team performance and project health.  
**Key files:**
- `backend/utils/reportGenerator.js` — generates 3-sheet Excel workbook + jsPDF report
- `backend/utils/scheduler.js` — weekly cron (Monday 08:00 Asia/Karachi) emails reports to all admins
- `frontend/src/features/analytics/pages/Analytics.jsx`
- `frontend/src/features/analytics/services/comprehensiveReportGenerator.js`

**How it works:** The dashboard displays real-time KPIs — task completion rate, overdue count, sprint velocity, status distribution — calculated from live task data. The weekly cron job generates both an Excel workbook (Summary, All Tasks, Overdue Tasks sheets) and a PDF, then emails them to every admin user automatically. Managers can also trigger report downloads on demand from the Analytics page.

---

## 11. Workspace Settings
**Purpose:** Let businesses configure the platform to match their organization — branding, security policy, integrations, billing.  
**Key files:**
- `backend/routes/settings.js` — user + workspace settings, API keys, webhooks, data export
- `backend/models/UserSettings.js`, `WorkspaceSettings.js`
- `frontend/src/features/settings/pages/Settings.jsx`
- `frontend/src/features/settings/components/` — 13 dedicated panel components

**Panels:** Profile, Security (password / active sessions), Appearance (theme), Notification preferences, Workspace general, Members, Roles, Organization branding, Billing, Integrations, Automation rules, Data & Privacy (export), Developer (API keys + webhooks).

---

## 12. Geofence Management
**Purpose:** Define physical workplace boundaries so attendance check-ins can be location-verified automatically.  
**Key files:**
- `backend/routes/verification.js` — geofence CRUD, location validation, toggle active
- `backend/services/geofenceService.js` — Haversine distance, MongoDB `$near` query
- `backend/models/GeofenceLocation.js` — GeoJSON Point + radius in metres
- `frontend/src/features/hr/pages/GeofenceManagement.jsx`
- `frontend/src/features/hr/components/MapView.jsx` — Leaflet interactive map

**How it works:** Admins draw circular boundaries on an interactive map (Leaflet). Each geofence is stored as a GeoJSON Point with a radius in metres. At check-in time, `GeofenceService.validateLocation()` uses the Haversine formula to determine whether the employee is inside any active boundary. If `geofenceRequired` is enabled in verification settings, check-ins from outside all boundaries are rejected.

---

## 13. Audit Log
**Purpose:** Maintain a full, tamper-evident record of every significant action in the system for compliance and accountability.  
**Key files:**
- `backend/routes/changelog.js` — paginated list, stats, export, event-type filter, clear
- `backend/utils/changeLogService.js` — `logChange()`, `getChangeLogs()`, `getChangeLogStats()`
- `backend/models/ChangeLog.js`
- `frontend/src/features/admin/pages/AuditLog.jsx`, `ChangeLog.jsx`

**How it works:** Every important action — task update, HR approval, email dispatch, attendance override, login event — calls `logChange()` asynchronously so it never blocks the main flow. Admins can filter logs by event type, user, date range, and free-text search. The export endpoint returns the full filtered dataset as JSON for offline review or compliance handoff.

---

## 14. Task Reallocation
**Purpose:** Redistribute work when team members become unavailable — without losing task history or accountability.  
**Key files:**
- `backend/routes/reallocation.js` — pending queue, stats, accept, reject, redistribute
- `backend/models/TaskReallocationLog.js`
- `frontend/src/features/projects/pages/ReallocationDashboard.jsx`

**How it works:** When a team member is unavailable (leave, deactivation), team leads or admins raise a reallocation request. The receiving team lead can accept (taking ownership of the tasks) or reject. The `redistribute` action bulk-reassigns all selected tasks to a new assignee and logs every ownership change with full traceability.

---

## 15. Meetings
**Purpose:** Schedule and manage business meetings with conflict detection, attendee management, and structured notes.  
**Key files:**
- `backend/routes/meetings.js` — CRUD + conflict check
- `backend/models/Meeting.js`
- `frontend/src/shared/ui/MeetingFormModal.jsx`, `MeetingDetailPanel.jsx`
- `frontend/src/shared/hooks/useMeetings.js`

**How it works:** Meetings capture title, date/time, attendees, agenda, location, and outcome notes. `POST /meetings/check-conflicts` compares the proposed time slot against existing meetings for the same attendees and raises a warning before saving. The `useMeetings` hook manages the local cache with create/update/delete actions, keeping the UI optimistically updated.
