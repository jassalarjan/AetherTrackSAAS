# AetherTrack Distribution Methods Documentation

Document Version: 1.0  
Last Updated: 2026-04-13

---

## Overview

AetherTrack is a comprehensive SaaS Enterprise Team Management System distributed through three platforms:

1. **Website** - Full-featured web application accessible via modern browsers
2. **PWA (Progressive Web App)** - Installable web app with offline capabilities and native-like experience
3. **Mobile App** - Native Android/iOS applications wrapped with Capacitor

Each distribution method provides access to the same core features and modules, with platform-specific optimizations and capabilities.

---

# DISTRIBUTION METHOD 1: WEBSITE

## Description
The website distribution is a full-featured web application built with React 18 and Vite. It is accessible through any modern web browser at the deployed URL.

## Access
- URL: `https://aethertrack.example.com` (production)
- Local: `http://localhost:5173` (development)

## Technical Stack
| Component | Technology |
|-----------|-----------|
| UI Framework | React 18 |
| Build Tool | Vite 5 |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS 3 |
| HTTP Client | Axios |
| Real-time | Socket.IO Client |
| Charts | Recharts |
| Calendar | React Big Calendar |
| Maps | Leaflet + React Leaflet |
| Animations | Framer Motion |
| Icons | Lucide React |

## Features Available on Website

### 1. Authentication & Identity
- User registration with email verification
- Login with JWT access/refresh tokens
- Password recovery flow
- Session management (active sessions view)
- Inactivity timeout auto-logout (30 minutes)

### 2. Dashboard
- Real-time workspace overview
- KPI widgets (task completion, attendance, team activity)
- Quick actions panel
- Recent activities feed

### 3. Task Management
- Task list with advanced filters (status, priority, team, project, sprint, assignee)
- Create/edit task modals
- Kanban board with drag-and-drop
- Task comments and collaboration
- Keyboard shortcuts (n: new, f: filter, /: search)

### 4. Project Management
- Project CRUD operations
- Project dashboard with member roster
- Gantt chart timeline view
- Sprint management
- Resource workload view
- Document uploads to Cloudinary

### 5. Attendance Management
- Self check-in/checkout with GPS capture
- Photo verification capture
- Attendance history calendar
- HR review queue
- Attendance override by admins

### 6. Leave Management
- Leave request submission
- Leave type configuration
- Approval/rejection workflow
- Leave balance tracking
- Leave calendar view

### 7. Shift Management
- Shift definitions (start/end times, grace period)
- Shift policies configuration
- Fixed shift assignments
- Rotation rules (daily/weekly/monthly)
- Night shift support

### 8. HR Email Center
- Email template CRUD
- Template variable system
- Manual send to employees
- Bulk send functionality
- Event-triggered automation

### 9. Notifications
- Real-time in-app notifications
- Notification center with filtering
- Mark as read/unread
- Push notification settings

### 10. User & Team Management
- Employee directory
- Team CRUD and management
- Role assignment (6 roles: System Admin, Workspace Admin, Community Admin, HR, Team Lead, Member)
- Bulk import from Excel
- User activation/deactivation

### 11. Analytics & Reporting
- Real-time KPI dashboards
- Task completion metrics
- Sprint velocity tracking
- Overdue task analysis
- Excel report export
- PDF report generation
- Scheduled weekly reports (cron)

### 12. Geofence Management
- Interactive map interface (Leaflet)
- Circular boundary drawing
- Location validation
- Geofence toggle (active/inactive)

### 13. Meetings
- Meeting CRUD
- Conflict detection
- Attendee management
- Agenda and notes

### 14. Task Reallocation
- Reallocation requests
- Accept/reject workflow
- Bulk redistribution with audit trail

### 15. Audit Log
- Complete activity trail
- Event type filtering
- User and date range filters
- JSON export

### 16. Settings
- Profile settings
- Security settings (password, sessions)
- Appearance (theme toggle)
- Notification preferences
- Workspace branding
- Billing management
- Integrations configuration
- Data export
- Developer API keys

### 17. Landing Page
- Marketing landing page
- Feature showcase
- Contact information

---

# DISTRIBUTION METHOD 2: PWA (Progressive Web App)

## Description
The PWA distribution provides an installable web application that works offline, supports push notifications, and offers a native-like experience on desktop and mobile devices.

## Access
- Installable from browser (Add to Home Screen / Install)
- Offline functionality via Service Worker
- Cache-first strategy for static assets

## Technical Stack
| Component | Technology |
|-----------|-----------|
| PWA Framework | vite-plugin-pwa |
| Service Worker | Workbox |
| Caching | Cache API + IndexedDB |
| Push Notifications | Web Push API |
| Background Sync | Background Sync API |

## PWA-Specific Features

### Installation
- Install prompt on supported browsers
- Desktop and mobile installation
- Standalone window mode

### Offline Capabilities
- Cached application shell
- Offline task viewing (read-only)
- Offline queue for pending actions
- Background sync on reconnection

### Push Notifications
- Browser push notifications
- Notification click handling
- Deep linking to app sections

### Native Integration
- App icon on desktop/mobile
- Splash screen on mobile
- Theme color customization
- Standalone display mode

## Features Available on PWA

All features from the Website distribution are available on PWA, with the following enhancements:

| Feature | Website | PWA |
|--------|---------|-----|
| Installation | Browser only | Installable app |
| Offline mode | Not available | Available (read-only + queue) |
| Push notifications | In-app only | Browser + in-app |
| Native feel | Standard browser | Standalone window |
| Home screen shortcut | Manual | Prompt to add |

### Core Features Available Offline
- Task list viewing
- Task detail viewing
- Attendance history
- Leave balances
- Team directory
- Project list

### Features Requiring Network
- Task creation/editing
- Check-in/check-out
- Leave requests
- Real-time updates
- Report generation
- File uploads

---

# DISTRIBUTION METHOD 3: MOBILE APP

## Description
The mobile app distribution uses Capacitor to wrap the web application into native Android and iOS applications. It provides full native device integration.

## Access
- Android: Google Play Store / APK installation
- iOS: Apple App Store / TestFlight

## Technical Stack
| Component | Technology |
|-----------|-----------|
| Wrapper | Capacitor 8 |
| Native Runtime | Android WebView / iOS WKWebView |
| Push Notifications | Capacitor Push Notifications (FCM/APNs) |
| Local Storage | Capacitor Storage |
| Geolocation | Capacitor Geolocation |
| Camera | Capacitor Camera |
| Device | Capacitor Device |
| Status | Capacitor Status Bar |
| Network | Capacitor Network |

## Mobile-Specific Features

### Native Device Integration
- GPS location capture for attendance
- Camera photo capture for verification
- Device information (model, OS version)
- Network status detection
- Local storage for tokens

### Push Notifications
- FCM integration (Android)
- APNs integration (iOS)
- Deep linking to app sections
- Notification tap handling
- Background notification processing

### App Store Features
- Auto-update support
- Version checking
- OTA bundle updates
- In-app review prompt

### Mobile UI Optimization
- Touch-optimized interfaces
- Bottom navigation
- Pull-to-refresh
- Swipe gestures
- Mobile keyboard handling

## Features Available on Mobile App

### 1. Authentication
- Biometric login (where supported)
- Quick login with stored credentials
- Push notification-based MFA

### 2. Dashboard
- Mobile-optimized dashboard
- Quick action buttons
- Status overview widgets

### 3. Task Management
- Task list with mobile filters
- Task creation/editing forms
- Task comments
- Quick status update

### 4. Project Management
- Project list view
- Project details
- Sprint progress
- Member workload

### 5. Attendance Management
- **GPS check-in/out** (primary mobile feature)
- **Photo verification capture** (primary mobile feature)
- Location validation display
- Attendance history
- Attendance statistics

### 6. Leave Management
- Leave request submission
- Leave balance display
- Approval notifications

### 7. Shift Management
- Current shift display
- Shift schedule calendar
- Shift notifications

### 8. Notifications
- Push notifications
- In-app notification center
- Notification preferences

### 9. User & Team Management
- Employee directory search
- Team member viewing
- Quick contact actions

### 10. Analytics
- KPI dashboard
- Performance metrics
- Export functionality

### 11. Settings
- Profile management
- Notification settings
- Security settings
- Appearance (theme)

### 12. Meetings
- Meeting list
- Meeting details
- Quick join actions

---

# MODULES REFERENCE

## Module Descriptions

### Module 1: Authentication Module
**Purpose:** Secure employee login with token-based authentication

**Key Files:**
- `backend/routes/auth.js`
- `backend/utils/jwt.js`
- `frontend/src/features/auth/`

**Distribution:** All three methods

**Workflow:**
1. User submits credentials
2. Backend validates and returns JWT
3. Access token (15 min) + refresh cookie (7 days)
4. Axios interceptor handles silent refresh
5. Email verification required on registration

---

### Module 2: Task Management Module
**Purpose:** Track and manage all work items across the organization

**Key Files:**
- `backend/routes/tasks.js`
- `backend/models/Task.js`
- `frontend/src/features/tasks/`

**Distribution:** All three methods

**Workflow:**
1. Create task via form → API POST /tasks
2. Task saved to MongoDB
3. Socket.IO event emitted to connected clients
4. Real-time update on all clients
5. Kanban drag-and-drop updates status

---

### Module 3: Project Management Module
**Purpose:** Deliver business projects with planning and tracking

**Key Files:**
- `backend/routes/projects.js`
- `backend/routes/sprints.js`
- `frontend/src/features/projects/`

**Distribution:** All three methods

**Workflow:**
1. Create project with members
2. Define sprints with deadlines
3. Assign tasks to sprints
4. Track progress via Gantt/sprints
5. Resource workload visualization

---

### Module 4: HR Module - Attendance
**Purpose:** Employee check-in/out with location verification

**Key Files:**
- `backend/routes/attendance.js`
- `backend/services/geofenceService.js`
- `frontend/src/features/hr/pages/AttendancePage.jsx`

**Distribution:** All three methods (enhanced on mobile)

**Workflow:**
1. Employee initiates check-in
2. GPS coordinates captured (mobile) / browser location
3. Optional photo capture
4. Geofence validation
5. Shift resolution
6. Late/early/overtime calculation
7. HR review queue
8. Audit trail created

---

### Module 5: HR Module - Leave Management
**Purpose:** Structured leave request and approval workflow

**Key Files:**
- `backend/routes/leaves.js`
- `backend/models/LeaveRequest.js`
- `frontend/src/features/hr/pages/LeavesPage.jsx`

**Distribution:** All three methods

**Workflow:**
1. Employee submits leave request
2. HR/Manager receives notification
3. Approve/Reject action
4. Email notification sent
5. Leave balance updated

---

### Module 6: HR Module - Shift Management
**Purpose:** Define and manage working schedules

**Key Files:**
- `backend/routes/shifts.js`
- `backend/utils/shiftService.js`
- `frontend/src/features/hr/`

**Distribution:** All three methods

**Workflow:**
1. HR creates shift definitions
2. Assign shifts to employees (fixed or rotation)
3. Attendance system resolves active shift
4. Metrics calculated against correct schedule

---

### Module 7: HR Module - Email Center
**Purpose:** Automated transactional email communication

**Key Files:**
- `backend/routes/emailTemplates.js`
- `backend/services/hrEventService.js`
- `frontend/src/features/hr/pages/EmailCenter.jsx`

**Distribution:** Website and PWA (not primary mobile feature)

**Workflow:**
1. HR creates email templates
2. Events trigger template selection
3. Variables resolved
4. Brevo sends email

---

### Module 8: Notification Module
**Purpose:** Real-time communication to users

**Key Files:**
- `backend/routes/notifications.js`
- `frontend/src/features/notifications/`

**Distribution:** All three methods

**Workflow:**
1. Event triggers notification
2. Socket.IO pushes to connected clients
3. FCM/APNs for mobile push
4. In-app notification stored
5. Mark as read/unread

---

### Module 9: User & Team Management Module
**Purpose:** Employee directory and team organization

**Key Files:**
- `backend/routes/users.js`
- `backend/routes/teams.js`
- `frontend/src/features/workspace/`

**Distribution:** All three methods

**Workflow:**
1. Admin creates user accounts
2. Bulk import from Excel
3. Assign to teams with roles
4. Activate/deactivate accounts

---

### Module 10: Analytics Module
**Purpose:** Business intelligence and reporting

**Key Files:**
- `backend/utils/reportGenerator.js`
- `frontend/src/features/analytics/`

**Distribution:** Website and PWA primarily

**Workflow:**
1. Data aggregated from all modules
2. KPIs calculated in real-time
3. Charts rendered with Recharts
4. Excel/PDF export
5. Weekly cron reports

---

### Module 11: Geofence Module
**Purpose:** Location-based attendance verification

**Key Files:**
- `backend/routes/verification.js`
- `backend/services/geofenceService.js`
- `frontend/src/features/hr/pages/GeofenceManagement.jsx`

**Distribution:** Website and PWA (uses geofence validation on mobile)

**Workflow:**
1. Admin draws geofence boundaries on map
2. Stored as GeoJSON Point + radius
3. Check-in validates against boundaries
4. Reject if outside boundary (when required)

---

### Module 12: Audit Log Module
**Purpose:** Compliance and accountability tracking

**Key Files:**
- `backend/routes/changelog.js`
- `backend/utils/changeLogService.js`
- `frontend/src/features/admin/pages/AuditLog.jsx`

**Distribution:** Website and PWA primarily

**Workflow:**
1. Every significant action logged
2. Async logging (non-blocking)
3. Admin filters and searches
4. Export for compliance

---

### Module 13: Task Reallocation Module
**Purpose:** Work redistribution when unavailable

**Key Files:**
- `backend/routes/reallocation.js`
- `frontend/src/features/projects/pages/ReallocationDashboard.jsx`

**Distribution:** Website and PWA

**Workflow:**
1. Team lead raises reallocation
2. Receiving lead accepts/rejects
3. Tasks bulk reassigned
4. Full audit trail created

---

### Module 14: Meetings Module
**Purpose:** Schedule and manage meetings

**Key Files:**
- `backend/routes/meetings.js`
- `frontend/src/shared/components/MeetingFormModal.jsx`

**Distribution:** All three methods

**Workflow:**
1. Create meeting with attendees
2. Conflict detection before save
3. Notifications sent
4. Notes recorded post-meeting

---

### Module 15: Settings Module
**Purpose:** Workspace and user configuration

**Key Files:**
- `backend/routes/settings.js`
- `frontend/src/features/settings/`

**Distribution:** All three methods

**Configuration Areas:**
- Profile settings
- Security (password, sessions)
- Appearance (theme)
- Notification preferences
- Workspace branding
- Billing
- Integrations
- Data export
- API keys

---

# ROLE-BASED ACCESS MATRIX

| Feature | System Admin | Workspace Admin | Community Admin | HR | Team Lead | Member |
|---------|--------------|-----------------|------------------|-----|-----------|--------|
| Authentication | Full | Full | Full | Full | Full | Full |
| Dashboard | Full | Full | Full | Full | Full | Limited |
| Tasks | Full | Full | Full | Full | Full | Limited |
| Projects | Full | Full | Full | Full | Full | Limited |
| Attendance | Full | Full | Full | Full | Limited | Limited |
| Leaves | Full | Full | Full | Full | Approve | Request |
| Shifts | Full | Full | Full | Full | Limited | View |
| Email Center | Full | Full | Full | Full | No | No |
| Notifications | Full | Full | Full | Full | Full | Full |
| Users | Full | Full | Full | Full | Limited | No |
| Analytics | Full | Full | Full | Full | Limited | No |
| Geofence | Full | Full | Full | Full | No | No |
| Audit Log | Full | Full | View | View | No | No |
| Meetings | Full | Full | Full | Full | Full | Full |
| Settings | Full | Full | Limited | Limited | Limited | Limited |

*Full = Full Access | Limited = Restricted Access | View = View Only | No = No Access*

---

# TECHNOLOGY REFERENCE

## Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express.js | 5.x | Web framework |
| MongoDB | Atlas | Database |
| Mongoose | 8.x | ODM |
| Socket.IO | 4.x | Real-time |
| JWT | - | Authentication |
| Helmet | - | Security headers |
| express-rate-limit | - | Rate limiting |
| ExcelJS | - | Excel generation |
| jsPDF | - | PDF generation |
| Nodemailer | - | Email sending |
| Brevo | - | Email service |

## Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI library |
| Vite | 5.x | Build tool |
| React Router | 6.x | Routing |
| Tailwind CSS | 3.x | Styling |
| Axios | - | HTTP client |
| Socket.IO Client | - | Real-time |
| Recharts | - | Charts |
| React Big Calendar | - | Calendar |
| Leaflet | - | Maps |
| Framer Motion | - | Animations |
| Capacitor | 8.x | Mobile wrapper |
| Workbox | - | PWA service worker |

---

# API ENDPOINTS REFERENCE

## Authentication Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Token refresh |
| POST | /api/auth/logout | User logout |
| POST | /api/auth/verify-email | Email verification |
| POST | /api/auth/forgot-password | Password reset request |
| POST | /api/auth/reset-password | Password reset |
| GET | /api/auth/verify | Token verification |

## Core Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/users | User CRUD |
| GET/POST | /api/teams | Team CRUD |
| GET/POST | /api/tasks | Task CRUD |
| GET/POST | /api/projects | Project CRUD |
| GET/POST | /api/sprints | Sprint CRUD |

## HR Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/attendance/checkin | Check-in |
| POST | /api/attendance/checkout | Check-out |
| GET/POST | /api/leaves | Leave CRUD |
| GET/POST | /api/shifts | Shift CRUD |
| GET/POST | /api/verification/geofences | Geofence CRUD |
| GET/POST | /api/email-templates | Email templates |

## System Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Notification list |
| GET | /api/changelog | Audit logs |
| GET/POST | /api/settings | Settings CRUD |
| GET/POST | /api/meetings | Meeting CRUD |
| GET/POST | /api/reallocation | Reallocation CRUD |

---

# DATABASE MODELS REFERENCE

## Core Models
- User - Employee accounts
- Team - Team organization
- Task - Work items
- Project - Business projects
- Sprint - Project iterations
- Comment - Task discussions
- Notification - User notifications
- Meeting - Scheduled meetings

## HR Models
- Attendance - Check-in/out records
- AttendanceAudit - Audit trail
- LeaveRequest - Leave submissions
- LeaveBalance - Employee balances
- LeaveType - Leave categories
- Shift - Shift definitions
- ShiftPolicy - Shift policies
- ShiftRotationRule - Rotation schedules
- EmployeeShiftAssignment - Fixed assignments
- GeofenceLocation - Workplace boundaries
- Holiday - Calendar holidays

## System Models
- WorkspaceSettings - Workspace configuration
- UserSettings - User preferences
- EmailTemplate - Email templates
- ChangeLog - Audit events
- DeviceToken - Push tokens

---

*End of Distribution Documentation*