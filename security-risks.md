# AetherTrack — Security Audit & Functionality Review

> **Audited:** 2026-02-28  
> **Scope:** Full-stack (Node/Express backend + React/Vite frontend)  
> **Auditor:** Kombai AI Security Review

---

## Table of Contents

1. [Functionality Audit](#functionality-audit)
2. [Security Risk Register](#security-risk-register)
   - [CRITICAL](#critical-severity)
   - [HIGH](#high-severity)
   - [MEDIUM](#medium-severity)
   - [LOW / INFORMATIONAL](#low--informational)
3. [Data Leakage Assessment](#data-leakage-assessment)
4. [Positive Security Controls](#positive-security-controls)
5. [Remediation Priority Table](#remediation-priority-table)

---

## Functionality Audit

### Core Features — Working Status

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| **Auth** | Login / Logout | ✅ Working | JWT access + refresh token |
| **Auth** | Forgot / Reset Password | ✅ Working | 6-digit OTP via email |
| **Auth** | Email Verification | ✅ Working | 6-digit OTP, 24h expiry |
| **Auth** | Resend Verification | ✅ Working | Regenerates code |
| **Auth** | Token Refresh | ✅ Working | Rate-limited at 20/hour |
| **Users** | Create / Read / Update / Delete | ✅ Working | Admin + HR only |
| **Users** | Change own password | ✅ Working | Validates old password |
| **Users** | Profile picture upload | ✅ Working | Base64 stored in MongoDB |
| **Users** | Bulk import (Excel / JSON) | ✅ Working | Validates roles + email |
| **Users** | Activate / Deactivate employee | ✅ Working | Via HrActionService |
| **Tasks** | CRUD | ✅ Working | Role-scoped |
| **Tasks** | Status / Priority change | ✅ Working | Triggers notifications |
| **Tasks** | Assign / reassign | ✅ Working | Role-gated |
| **Tasks** | Leave-overlap reallocation | ✅ Working | Fire-and-forget async |
| **Projects** | CRUD | ⚠️ Partial | Missing role guard on PUT/DELETE (see Risk #4) |
| **Projects** | Team member management | ✅ Working | Admin/HR/Team Lead only |
| **Projects** | Document upload (Cloudinary) | ✅ Working | |
| **Projects** | Gantt / Schedule engine | ✅ Working | CPM algorithm |
| **Sprints** | CRUD | ✅ Working | Route mounted + authenticated |
| **Teams** | CRUD | ✅ Working | Role-scoped |
| **Comments** | Add / list per task | ✅ Working | Triggers notifications |
| **Notifications** | Real-time Socket.IO | ✅ Working | Per-user rooms |
| **Changelog / Audit Log** | Automatic logging | ✅ Working | Covers logins, CRUD actions |
| **HR — Attendance** | Check-in / Check-out | ✅ Working | Shift-aware metrics |
| **HR — Attendance** | Admin override | ✅ Working | |
| **HR — Leaves** | Request / Cancel | ✅ Working | Balance check enforced |
| **HR — Leaves** | Approve / Reject (HR only) | ✅ Working | Via HrActionService |
| **HR — Leave Balance** | View own / any (role-gated) | ✅ Working | |
| **HR — Meetings** | Route mounted | ✅ Working | |
| **HR — Shifts** | Route mounted | ✅ Working | |
| **HR — Reallocation** | Automatic on leave approve | ✅ Working | Background trigger |
| **Analytics** | Dashboard stats | ⚠️ Partial | No per-user scope (see Risk #9) |
| **Email Center** | Admin/HR email templates | ✅ Working | |
| **Calendar** | react-big-calendar view | ✅ Working | |
| **Settings** | Theme / Color scheme | ✅ Working | Persisted in localStorage |
| **Settings** | Session timeout (30 min) | ✅ Working | Activity-based |
| **PWA** | Service worker | ✅ Working | vite-plugin-pwa |

---

## Security Risk Register

---

### CRITICAL Severity

---

#### RISK-01 · JWT Tokens Stored in `localStorage` (XSS-Stealable)

**Severity:** 🔴 CRITICAL  
**File:** `frontend/src/context/AuthContext.jsx` — lines 17, 144–146  
**CWE:** CWE-922 (Insecure Storage of Sensitive Information)

**Description:**  
Both `accessToken` and `refreshToken` are stored in `localStorage`. Any JavaScript executing on the page (from XSS, a compromised npm package, or browser extension) can read these tokens and impersonate the user for up to 7 days (refresh token lifetime).

```js
// Current — vulnerable
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

**Impact:** Full account takeover; session hijacking survives page navigation and browser restarts.

**Remediation:**
- Store tokens in **httpOnly, Secure, SameSite=Strict cookies** managed by the backend.
- Remove `refreshToken` from any client-accessible storage.
- The backend already imports `cookie-parser` — use it.

```js
// Backend: set cookie on login
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

---

#### RISK-02 · Refresh Tokens Not Invalidated on Logout (No Token Blacklist)

**Severity:** 🔴 CRITICAL  
**File:** `backend/routes/auth.js` — line 379–392; `frontend/src/context/AuthContext.jsx` — line 191  
**CWE:** CWE-613 (Insufficient Session Expiration)

**Description:**  
The logout endpoint (`POST /api/auth/logout`) only logs the event and returns success. It does **not** invalidate the refresh token in any persistent store. A stolen refresh token can still be used to obtain new access tokens for 7 days after the user has logged out.

```js
// Current logout — no token invalidation
router.post('/logout', authenticate, async (req, res) => {
  // Only logs — doesn't revoke token
  await logChange({ ... });
  res.json({ message: 'Logged out successfully' });
});
```

**Comment in code acknowledges this:** *"In a production app, you might want to blacklist the token"*

**Impact:** An attacker who obtains a refresh token can maintain access even after the user explicitly logs out.

**Remediation:**
- Store issued refresh tokens in MongoDB with a `revoked` flag.
- On logout, mark the token as revoked.
- On `POST /api/auth/refresh`, verify the token is not revoked.
- Alternatively, use a Redis-based token blacklist for performance.

---

#### RISK-03 · Password Reset Token Brute-Forceable (No Rate Limit on `/reset-password`)

**Severity:** 🔴 CRITICAL  
**File:** `backend/routes/auth.js` — lines 82–98 (limiter) and 456–523 (reset endpoint)  
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:**  
The reset token is a 6-digit number (`crypto.randomInt(100000, 999999)` = ~900,000 possibilities). The `POST /api/auth/forgot-password` endpoint IS rate-limited (3/15 min). However, `POST /api/auth/reset-password` — where the token is actually verified — has **no rate limiting at all**. An attacker can request a reset once, then brute-force all 900,000 combinations against `/reset-password` within the 1-hour expiry window.

```js
// No rate limiter on this route
router.post('/reset-password', [
  body('email').isEmail()...
  body('token').notEmpty()...
], async (req, res) => { ... });
```

**Impact:** Complete account takeover for any user whose email is known.

**Remediation:**
- Apply the `forgotPasswordLimiter` (or stricter) to the `/reset-password` endpoint.
- Increase token entropy to at least 128-bit (32 hex chars via `crypto.randomBytes(16).toString('hex')`).
- Implement a failed-attempt counter and lock the token after N failures.

---

#### RISK-04 · Project UPDATE and DELETE Routes Missing Authorization / Role Guards

**Severity:** 🔴 CRITICAL  
**File:** `backend/routes/projects.js` — lines 233 and 309  
**CWE:** CWE-285 (Improper Authorization)

**Description:**  
`PUT /api/projects/:id` and `DELETE /api/projects/:id` have no `checkRole()` middleware and no ownership check. Any authenticated user (even a basic `member`) can update or delete **any** project in the system.

```js
// Missing role guard — any authenticated user can update or delete
router.put('/:id', validateIdParam(), sanitizeBody([...]), async (req, res) => { ... });
router.delete('/:id', validateIdParam(), async (req, res) => { ... });
```

Compare this to project creation, which correctly restricts to `['admin', 'hr', 'team_lead']`.

**Impact:** Data destruction, unauthorized modification of project data.

**Remediation:**
```js
router.put('/:id', checkRole(['admin', 'hr', 'team_lead']), validateIdParam(), ...);
router.delete('/:id', checkRole(['admin', 'hr']), validateIdParam(), ...);
```

Also add an ownership/membership check to ensure team leads can only update their own projects.

---

### HIGH Severity

---

#### RISK-05 · `GET /api/projects/:id` — No Member Access Control

**Severity:** 🟠 HIGH  
**File:** `backend/routes/projects.js` — line 184  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Description:**  
`GET /api/projects/:id` fetches a full project (including documents, budget, risks, team members) for any authenticated user with a valid MongoDB ObjectId. There is no check that the requesting user is a member of that project.

**Impact:** Horizontal privilege escalation — members can read sensitive project data (budgets, risks, documents) for projects they have no access to.

**Remediation:**  
Add a membership check for `member` and `team_lead` roles before returning project data:
```js
if (userRole === 'member') {
  const isMember = project.team_members.some(m => m.user.toString() === userId.toString());
  if (!isMember) return res.status(403).json({ message: 'Access denied' });
}
```

---

#### RISK-06 · Socket.IO Project Rooms — Any User Can Join Any Project Room

**Severity:** 🟠 HIGH  
**File:** `backend/server.js` — lines 370–379  
**CWE:** CWE-284 (Improper Access Control)

**Description:**  
The Socket.IO `join` handler allows any authenticated user to subscribe to any room prefixed with `project-` without checking project membership.

```js
} else if (isProjectRoom) {
  // For project rooms, allow joining (project membership should be validated at API level)
  socket.join(room);
```

The comment acknowledges the gap but doesn't close it.

**Impact:** Real-time project events (task updates, comments, status changes) leak to unauthorized users.

**Remediation:**  
Validate project membership before allowing socket room join:
```js
} else if (isProjectRoom) {
  const projectId = room.replace('project-', '');
  const project = await Project.findOne({ _id: projectId, 'team_members.user': socket.userId });
  if (!project && !['admin', 'hr'].includes(socket.userRole)) {
    return callback({ success: false, error: 'Not authorized' });
  }
  socket.join(room);
}
```

---

#### RISK-07 · Email Enumeration via Auth Endpoints

**Severity:** 🟠 HIGH  
**File:** `backend/routes/auth.js` — lines 264–276 (`/verify-email`) and 335–341 (`/resend-verification`)  
**CWE:** CWE-204 (Observable Response Discrepancy)

**Description:**  
The `/verify-email` and `/resend-verification` endpoints return distinct HTTP 404 responses when the email doesn't exist vs. HTTP 400 when the email is already verified. This allows attackers to enumerate registered email addresses.

```js
if (!user) {
  return res.status(404).json({ message: 'User not found' }); // leaks email existence
}
if (user.isEmailVerified) {
  return res.status(400).json({ message: 'Email is already verified.' }); // different response
}
```

Note: `POST /forgot-password` correctly uses the same response regardless of whether email exists. The same approach must be applied to verification endpoints.

**Impact:** Account enumeration enabling targeted phishing, credential stuffing, and social engineering.

**Remediation:**  
Return a generic 200 response regardless of email existence:
```js
// Return same message whether user exists or not
res.json({ message: 'If your email is registered and unverified, a code has been sent.' });
```

---

#### RISK-08 · Internal Error Messages Leaked to Clients in Production

**Severity:** 🟠 HIGH  
**File:** All backend route files  
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description:**  
Nearly every route's error handler returns `error.message` directly to the client:
```js
res.status(500).json({ message: 'Server error', error: error.message });
```
This can expose database schema details, file paths, Mongoose internals, and other system information useful for attackers.

**Impact:** Information disclosure that aids reconnaissance and targeted attacks.

**Remediation:**  
In production, return only generic error messages:
```js
res.status(500).json({
  message: 'An internal server error occurred.',
  ...(process.env.NODE_ENV === 'development' && { debug: error.message })
});
```
The global error handler in `server.js` already does this correctly — apply the same pattern to individual route catch blocks.

---

#### RISK-09 · `GET /api/projects/dashboard-stats` — No Role Scoping

**Severity:** 🟠 HIGH  
**File:** `backend/routes/projects.js` — lines 117–181  
**CWE:** CWE-284 (Improper Access Control)

**Description:**  
The `/dashboard-stats` endpoint queries `Project.countDocuments({})` and `Task.countDocuments({})` with no filters. Any authenticated user (including basic members) gets global statistics — total projects, tasks, budgets allocated/spent across the entire organization.

**Impact:** Exposure of sensitive organizational financial and operational data to all users.

**Remediation:**  
Apply the same role-based query filter used in `GET /api/projects/`:
```js
const query = {};
if (userRole === 'member') query['team_members.user'] = userId;
// ...then use query in countDocuments
```

---

#### RISK-10 · Profile Pictures Stored as Base64 Blobs in MongoDB

**Severity:** 🟠 HIGH  
**File:** `backend/routes/users.js` — lines 88–133; `backend/models/User.js` — line 21  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Description:**  
Profile pictures are stored as base64-encoded data URLs directly in the `User` document (up to ~2MB per user). This inflates document sizes, degrades query performance, is included in every user lookup, and creates memory pressure.

The project already uses Cloudinary for project documents — profile pictures should follow the same pattern.

**Impact:** DoS via large user base, degraded API performance, excessive MongoDB storage costs.

**Remediation:**  
Upload profile pictures to Cloudinary (as already done for project documents) and store only the URL in the User model. Remove the base64 field after migration.

---

### MEDIUM Severity

---

#### RISK-11 · JWT Secret Fallback Reduces Security Isolation

**Severity:** 🟡 MEDIUM  
**File:** `backend/utils/jwt.js` — lines 6, 12, 21, 28  
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Description:**  
If `JWT_ACCESS_SECRET` is not set, both access and refresh tokens fall back to `JWT_SECRET`, meaning both tokens share the same signing secret. A compromised access token could be reused as a refresh token (or vice-versa).

```js
process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET
```

**Remediation:**  
Require distinct secrets (`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`) in the environment validation function and remove the fallback to `JWT_SECRET`.

---

#### RISK-12 · `GET /api/hr/attendance/summary/:userId` — Loose IDOR Check

**Severity:** 🟡 MEDIUM  
**File:** `backend/routes/attendance.js` — line 267  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Description:**  
The IDOR check uses strict string inequality:
```js
if (req.user.role === 'member' && targetUserId !== req.user._id.toString())
```
`targetUserId` is taken directly from `req.params.userId`, which could have formatting differences (ObjectId vs string). This string comparison is fragile and could be bypassed in edge cases. The correct pattern uses `.equals()` on ObjectId or normalized `.toString()` on both sides consistently.

**Remediation:**
```js
if (req.user.role === 'member' &&
    targetUserId.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: 'Unauthorized' });
}
```

---

#### RISK-13 · Schedule and Task-Date Endpoints Bypass Project Access Control

**Severity:** 🟡 MEDIUM  
**File:** `backend/routes/projects.js` — lines 507 and 619  
**CWE:** CWE-285 (Improper Authorization)

**Description:**  
`GET /api/projects/:id/schedule` and `PATCH /api/projects/:id/tasks/:taskId/dates` do not verify that the requesting user has access to the project. Any authenticated user who knows a project ID can view the full schedule or modify task dates.

**Remediation:**  
Add project membership verification before these route handlers execute.

---

#### RISK-14 · `community_admin` Role Inconsistently Handled

**Severity:** 🟡 MEDIUM  
**File:** Multiple route files  
**CWE:** CWE-284 (Improper Access Control)

**Description:**  
The `community_admin` role is defined in the User model and granted password reset abilities in `users.js`, but is excluded from most `checkRole()` calls that include `admin` and `hr`. It is unclear what `community_admin` should and should not be able to access; the inconsistency creates potential privilege escalation or denial of service gaps.

**Remediation:**  
Define an explicit permission matrix for `community_admin` and enforce it consistently across all route guards.

---

#### RISK-15 · No Pagination on List Endpoints — Potential DoS

**Severity:** 🟡 MEDIUM  
**File:** `backend/routes/users.js`, `tasks.js`, `projects.js`, `leaves.js`, `attendance.js`  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Description:**  
All list endpoints (`GET /api/users`, `GET /api/tasks`, `GET /api/hr/leaves`, `GET /api/hr/attendance`, etc.) return **all records** without pagination. With a large dataset, this can:
- Cause timeouts / OOM in Node.js.
- Generate extremely large API responses.
- Degrade database performance.

**Remediation:**  
Add `limit` and `skip` (or `page` + `pageSize`) query parameters with a maximum cap (e.g., 100 per page):
```js
const limit = Math.min(parseInt(req.query.limit) || 50, 100);
const skip = (parseInt(req.query.page) || 0) * limit;
const tasks = await Task.find(query).skip(skip).limit(limit).sort(...)
```

---

#### RISK-16 · Bulk Import Template Contains Weak Sample Passwords

**Severity:** 🟡 MEDIUM  
**File:** `backend/routes/users.js` — lines 886–911  
**CWE:** CWE-521 (Weak Password Requirements)

**Description:**  
The downloadable Excel/JSON user import template contains sample passwords (`password123`, `password456`, `password789`). While these are sample data, users often copy templates verbatim and create accounts with these passwords.

**Remediation:**  
Replace sample passwords in templates with a clear placeholder that fails validation:
```js
password: 'REPLACE_WITH_STRONG_PASSWORD'
```
This ensures anyone following the template must change the password or receive a validation error on import.

---

#### RISK-17 · `POST /api/projects/:id/members` — No User Validation Before Adding

**Severity:** 🟡 MEDIUM  
**File:** `backend/routes/projects.js` — line 332  
**CWE:** CWE-20 (Improper Input Validation)

**Description:**  
When adding a team member to a project, the `userId` in the request body is used directly without verifying that the user actually exists in the database. A non-existent or invalid ObjectId could be silently added to `team_members`.

**Remediation:**
```js
const userExists = await User.findById(userId);
if (!userExists) return res.status(404).json({ message: 'User not found' });
```

---

### LOW / Informational

---

#### RISK-18 · Debug / Backup Files in Production Build

**Severity:** 🔵 LOW  
**Files:** `frontend/src/components/AuthDebug.jsx`, `frontend/src/components/Sidebar_BROKEN_BACKUP.jsx`, `frontend/src/components/Sidebar_FIXED.jsx`

**Description:**  
Debug components and backup files are present in the source tree and may be included in the production bundle.

**Remediation:**  
Delete `AuthDebug.jsx`, `Sidebar_BROKEN_BACKUP.jsx`, and `Sidebar_FIXED.jsx`. Remove any test/debug routes.

---

#### RISK-19 · HTTPS Normalization in CORS Check May Allow HTTP Impersonation

**Severity:** 🔵 LOW  
**File:** `backend/server.js` — lines 242–243  

**Description:**  
The CORS origin check normalizes `https://` to `http://` before comparison. If `ALLOWED_ORIGINS` contains `https://app.example.com`, an HTTP request from `http://app.example.com` would be allowed.

```js
const normalizedOrigin = origin.replace(/\/$/, '').replace('https://', 'http://');
```

**Remediation:**  
Remove the HTTP/HTTPS normalization; compare origins literally. HSTS on the server side will enforce HTTPS.

---

#### RISK-20 · `ShiftManagement.jsx` Page Not Routed in `App.jsx`

**Severity:** 🔵 LOW / Functionality  
**File:** `frontend/src/pages/ShiftManagement.jsx` exists but is not imported or routed in `frontend/src/App.jsx`.

**Description:**  
The Shift Management page component exists but has no route, making it inaccessible in production. The backend route for shifts is mounted and functional.

**Remediation:**  
Add a route to `App.jsx`:
```jsx
<Route path="/hr/shifts" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><ShiftManagement /></ProtectedRoute>} />
```
Remove the current redirect from `/hr/shifts` → `/hr/attendance?tab=shifts`.

---

#### RISK-21 · Plaintext Password Sent in Credential Emails

**Severity:** 🔵 LOW  
**File:** `backend/routes/users.js` — lines 307, 580, 853  
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information in Email)

**Description:**  
Admin-generated passwords are emailed to users in plaintext. Email is not a secure channel.

**Remediation:**  
Instead of emailing the raw password, send a one-time magic link that prompts the user to set their own password on first login.

---

#### RISK-22 · `GET /api/health` Exposes Endpoint Structure

**Severity:** 🔵 LOW / Informational  
**File:** `backend/server.js` — line 435  

**Description:**  
The public health check returns `{ status: 'OK', message: 'CTMS Backend is running' }`. The internal system name "CTMS" is exposed, revealing internal product naming.

**Remediation:**  
Return a minimal response: `{ status: 'ok' }`.

---

#### RISK-23 · `PATCH /api/tasks` — Query Param `assigned_to` Not Scoped for Members

**Severity:** 🔵 LOW  
**File:** `backend/routes/tasks.js` — line 183  

**Description:**  
The `GET /api/tasks` endpoint accepts `assigned_to` as a query parameter. While members are already filtered to their own tasks via `$or`, an additional explicit `assigned_to` filter is applied on top, which can interact unexpectedly with the base query.

**Remediation:**  
For `member` and `team_lead` roles, ignore the `assigned_to` query parameter (or validate it against accessible users).

---

## Data Leakage Assessment

| Data Type | Storage | Exposure Risk |
|-----------|---------|--------------|
| Access tokens (JWT 15m) | `localStorage` | **HIGH** — XSS-readable |
| Refresh tokens (JWT 7d) | `localStorage` | **CRITICAL** — XSS-readable |
| User data (name, email, role) | `localStorage` (JSON) | Medium — cached client-side |
| Password hashes | MongoDB (bcrypt, cost 10) | Low — properly hashed |
| Profile pictures | MongoDB (base64 blob) | Medium — oversized documents |
| Reset tokens (6-digit OTP) | MongoDB (plaintext) | Medium — brute-forceable |
| Verification tokens | MongoDB (plaintext) | Low — 24h expiry |
| Plain passwords (temp) | Email (transient) | Medium — insecure channel |
| Error stack traces | API responses (dev) | Low — only in development |
| Internal system name "CTMS" | `/api/health` | Info — minor |

---

## Positive Security Controls

The following security controls are already correctly implemented:

- ✅ **Helmet.js** with CSP, X-Frame-Options, HSTS (production), X-Content-Type-Options
- ✅ **bcrypt** password hashing (cost factor 10) in User model pre-save hook
- ✅ **express-rate-limit** on login (5/15min), token refresh (20/hr), forgot-password (3/15min)
- ✅ **express-validator** on all auth input fields
- ✅ **XSS sanitization** via `xss` library on all text input fields (title, description, content, reason, etc.)
- ✅ **MongoDB ObjectId validation** middleware on all ID route params
- ✅ **Strict CORS whitelist** (fail-closed in production) on both Express and Socket.IO
- ✅ **Socket.IO JWT authentication** — all WebSocket connections require valid token
- ✅ **Role-based access control** via `checkRole` middleware on sensitive routes
- ✅ **Audit/changelog logging** for all significant user actions (login, CRUD)
- ✅ **Production env validation** — server refuses to start if `JWT_SECRET` or `MONGODB_URI` missing
- ✅ **Session timeout** — 30-minute inactivity auto-logout on frontend
- ✅ **Self-deletion prevention** — users cannot delete their own account
- ✅ **File upload validation** — mimetype + size checks on bulk import and document upload
- ✅ **Public registration disabled** — users created only by admin/HR
- ✅ **Password strength validation** — `validatePassword` utility enforced at all creation/reset points

---

## Remediation Priority Table

| Priority | Risk ID | Issue | Effort |
|----------|---------|-------|--------|
| P0 — Fix Immediately | RISK-01 | Tokens in localStorage → move to httpOnly cookies | Medium |
| P0 — Fix Immediately | RISK-04 | Project PUT/DELETE missing role guard | Low |
| P0 — Fix Immediately | RISK-03 | No rate limit on `/reset-password` | Low |
| P1 — Fix This Sprint | RISK-02 | Refresh token not invalidated on logout | Medium |
| P1 — Fix This Sprint | RISK-05 | Project GET /:id no member access check | Low |
| P1 — Fix This Sprint | RISK-06 | Socket.IO project rooms no membership check | Medium |
| P1 — Fix This Sprint | RISK-07 | Email enumeration via verify/resend endpoints | Low |
| P1 — Fix This Sprint | RISK-08 | Internal error messages exposed to client | Low |
| P1 — Fix This Sprint | RISK-09 | Dashboard stats not role-scoped | Low |
| P2 — Next Sprint | RISK-10 | Base64 profile pics in MongoDB → Cloudinary | High |
| P2 — Next Sprint | RISK-11 | JWT secret fallback | Low |
| P2 — Next Sprint | RISK-13 | Schedule endpoints bypass access control | Low |
| P2 — Next Sprint | RISK-15 | No pagination on list endpoints | Medium |
| P3 — Backlog | RISK-12 | Attendance summary loose IDOR check | Low |
| P3 — Backlog | RISK-14 | community_admin role inconsistency | Medium |
| P3 — Backlog | RISK-16 | Weak passwords in import template | Low |
| P3 — Backlog | RISK-17 | Add member to project without user validation | Low |
| P3 — Backlog | RISK-18 | Debug/backup files in source | Low |
| P3 — Backlog | RISK-19 | HTTPS normalization in CORS | Low |
| P3 — Backlog | RISK-20 | ShiftManagement page not routed | Low |
| P3 — Backlog | RISK-21 | Plaintext password in credential emails | Medium |
| P4 — Informational | RISK-22 | Health endpoint exposes system name | Trivial |
| P4 — Informational | RISK-23 | assigned_to query param scope for members | Low |

---

*Generated by Kombai AI Security Review — 2026-02-28*
