# AetherTrack — Database

**Database:** MongoDB (Mongoose 8)  
**Connection:** `backend/config/db.js` — env var `MONGODB_URI`

All business data is tenanted by `workspaceId`, allowing AetherTrack to serve multiple organizations from a single deployment.

---

## Models Overview

### `User`
**File:** `backend/models/User.js`  
**Key fields:**
- `full_name`, `email` (unique), `password` (bcrypt hashed)
- `role`: `admin | hr | team_lead | member | community_admin`
- `employmentStatus`: `ACTIVE | INACTIVE | TERMINATED`
- `profilePicture` (Cloudinary URL), `designation`, `department`
- `isActive`, `isEmailVerified`, `emailVerificationToken`, `emailVerificationExpires`
- `passwordResetToken`, `passwordResetExpires`
- `workspaceId` — tenant identifier, `teamId`
- `lastLogin`, `loginAttempts`, `lockUntil`

---

### `Task`
**File:** `backend/models/Task.js`  
**Key fields:**
- `title`, `description`, `notes`
- `status`: `todo | in_progress | review | done`
- `priority`: `low | medium | high | critical`
- `assigned_to` (ref: User[]), `created_by` (ref: User)
- `team` (ref: Team), `project` (ref: Project), `sprint` (ref: Sprint)
- `due_date`, `start_date`, `progress` (0–100)
- `workspaceId`
- **Timestamps:** `createdAt`, `updatedAt`

---

### `Project`
**File:** `backend/models/Project.js`  
**Key fields:**
- `name`, `description`, `client_name`
- `status`: `planning | active | on_hold | completed | cancelled`
- `priority`: `low | medium | high | critical`
- `members`: `[{ user (ref: User), role }]`
- `start_date`, `end_date`
- `documents`: `[{ name, url, public_id, uploadedBy, uploadedAt }]`
- `workspaceId`

---

### `Sprint`
**File:** `backend/models/Sprint.js`  
**Key fields:**
- `name`, `goal`
- `status`: `upcoming | active | completed`
- `project` (ref: Project)
- `start_date`, `end_date`
- `progress` (0–100)

---

### `Team`
**File:** `backend/models/Team.js`  
**Key fields:**
- `name`, `description`
- `members`: `[{ user (ref: User), role }]`
- `lead` (ref: User)
- `isPinned`, `priority`, `order`
- `workspaceId`

---

### `Comment`
**File:** `backend/models/Comment.js`  
**Key fields:**
- `content` (XSS sanitized)
- `task` (ref: Task), `author` (ref: User)
- `workspaceId`

---

### `Notification`
**File:** `backend/models/Notification.js`  
**Key fields:**
- `recipient` (ref: User), `type`, `message`, `isRead`
- `relatedTask` (ref: Task), `relatedProject` (ref: Project)
- `workspaceId`

---

### `Meeting`
**File:** `backend/models/Meeting.js`  
**Key fields:**
- `title`, `description`, `agenda`, `location`, `notes`
- `date`, `startTime`, `endTime`
- `attendees`: `[ref: User]`
- `organizer` (ref: User), `team` (ref: Team), `project` (ref: Project)
- `status`: `scheduled | completed | cancelled`

---

### `Attendance`
**File:** `backend/models/Attendance.js`  
**Key fields:**
- `userId` (ref: User), `workspaceId`
- `date`, `checkIn`, `checkOut` (Date)
- `status`: `present | absent | half_day | holiday | leave`
- `verificationStatus`: `pending | approved | rejected | auto_approved`
- `photoUrl` (Cloudinary), `gpsLocation`: `{ lat, lng }`
- `working_hours`, `late_minutes`, `early_exit_minutes`, `overtime_hours`
- `shift_status`: `on_time | late | early_exit | late_and_early_exit`
- `adminReview`: `{ reviewedBy, reviewedAt, reviewNotes, reviewAction }`
- `shift` (ref: Shift)

---

### `AttendanceAudit`
**File:** `backend/models/AttendanceAudit.js`  
**Key fields:**
- `attendanceId` (ref: Attendance), `userId`, `workspaceId`
- `action`: `CHECKIN | CHECKOUT | OVERRIDE | APPROVED | REJECTED | LOCATION_VALIDATED | VERIFICATION_FAILED`
- `details`: `{ verificationStatus, flags, previousStatus, newStatus, reason, metadata }`
- `performedBy` (ref: User), `ipAddress`

---

### `LeaveRequest`
**File:** `backend/models/LeaveRequest.js`  
**Key fields:**
- `userId` (ref: User), `workspaceId`
- `leaveType` (ref: LeaveType)
- `startDate`, `endDate`, `days`
- `reason` (XSS sanitized)
- `status`: `pending | approved | rejected | cancelled`
- `approvedBy` (ref: User), `hrNotes`

---

### `LeaveBalance`
**File:** `backend/models/LeaveBalance.js`  
**Key fields:**
- `userId` (ref: User), `leaveType` (ref: LeaveType), `workspaceId`
- `allocated`, `used`, `remaining`
- `year`

---

### `LeaveType`
**File:** `backend/models/LeaveType.js`  
**Key fields:**
- `name`, `code`, `description`
- `defaultDays`, `isPaid`, `requiresApproval`
- `workspaceId`

---

### `Shift`
**File:** `backend/models/Shift.js`  
**Key fields:**
- `name`, `start_time`, `end_time` (HH:mm strings)
- `total_hours`, `is_night_shift`
- `grace_period_minutes`, `early_exit_threshold_minutes`
- `min_hours_for_present`, `min_hours_for_half_day`
- `break_policy`: `{ break_duration_minutes, paid_break }`
- `workspaceId`

---

### `ShiftPolicy`
**File:** `backend/models/ShiftPolicy.js`  
**Key fields:**
- `name`, `is_active`
- `shift_slots`: `[{ shift_id (ref: Shift), slot_order }]`
- `effective_from`, `workspaceId`

---

### `ShiftRotationRule`
**File:** `backend/models/ShiftRotationRule.js`  
**Key fields:**
- `user_ids`: `[ref: User]`
- `cadence`: `daily | weekly | monthly`
- `shift_sequence`: `[{ shift_id (ref: Shift), slot_order }]`
- `rotation_start`, `rotation_end`, `is_active`, `workspaceId`

---

### `EmployeeShiftAssignment`
**File:** `backend/models/EmployeeShiftAssignment.js`  
**Key fields:**
- `user_id` (ref: User), `shift_id` (ref: Shift), `workspaceId`
- `effective_from`, `effective_to`

---

### `GeofenceLocation`
**File:** `backend/models/GeofenceLocation.js`  
**Key fields:**
- `name`, `description`
- `location`: `{ type: 'Point', coordinates: [lon, lat] }` — **2dsphere index**
- `radiusMeters`, `isActive`
- `createdBy` (ref: User), `workspaceId`

---

### `VerificationSettings`
**File:** `backend/models/VerificationSettings.js`  
**Key fields:**
- `workspaceId` (unique per workspace)
- `requirePhoto`, `requireGPS`, `geofenceRequired`
- `allowedRadiusMeters`, `autoApproveIfWithinGeofence`

---

### `EmailTemplate`
**File:** `backend/models/EmailTemplate.js`  
**Key fields:**
- `code` (e.g. `LEAVE_APPROVED`), `name`, `subject`
- `htmlContent` (full HTML with `{{variable}}` placeholders)
- `isActive`, `workspaceId`

---

### `ChangeLog`
**File:** `backend/models/ChangeLog.js`  
**Key fields:**
- `event_type` (e.g. `task_updated`, `hr_email_sent`, `user_action`)
- `user_id` (ref: User), `user_email`, `user_name`, `user_role`, `user_ip`
- `target_type`, `target_id`, `target_name`
- `action`, `description`, `metadata`, `changes`
- `workspaceId`, `created_at`

---

### `TaskReallocationLog`
**File:** `backend/models/TaskReallocationLog.js`  
**Key fields:**
- `taskId` (ref: Task), `fromUser` (ref: User), `toUser` (ref: User)
- `requestedBy` (ref: User), `reason`
- `status`: `pending | accepted | rejected`
- `workspaceId`

---

### `UserSettings`
**File:** `backend/models/UserSettings.js`  
**Key fields:**
- `userId` (ref: User, unique)
- `theme`, `language`, `notifications` (object), `privacy` (object)
- `apiKey`, `apiKeyCreatedAt`
- `activeSessions`: `[{ deviceInfo, ip, createdAt }]`

---

### `WorkspaceSettings`
**File:** `backend/models/WorkspaceSettings.js`  
**Key fields:**
- `workspaceId` (unique)
- `general`: `{ name, timezone, dateFormat, logoUrl }`
- `security`: `{ sessionTimeout, mfaEnabled, ipWhitelist }`
- `integrations`: `{ slack, github, webhooks }`
- `automation`: rules array
- `billing`: `{ plan, status }`

---

### `DeviceToken`
**File:** `backend/models/DeviceToken.js`  
**Key fields:**
- `userId` (ref: User), `token` (FCM token), `platform`
- `deviceId`, `workspaceId`

---

### `Holiday`
**File:** `backend/models/Holiday.js`  
**Key fields:**
- `name`, `date`, `type` (national / regional / custom)
- `workspaceId`

---

## Key Relationships

```
User ──< Task (assigned_to)
User ──< Task (created_by)
Task >── Project
Task >── Sprint
Task >── Team
Project ──< Sprint
Team ──< User (members)
Attendance >── User
Attendance >── Shift
LeaveRequest >── User
LeaveRequest >── LeaveType
LeaveBalance >── User, LeaveType
ShiftRotationRule ──< User
EmployeeShiftAssignment >── User, Shift
GeofenceLocation >── Workspace
AttendanceAudit >── Attendance
ChangeLog >── User
TaskReallocationLog >── Task, User (x3)
```
