# AetherTrackSAAS Technical Architecture Documentation

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Audience:** Client IT teams, system integrators, and developers

---

## 1. Purpose of This Document

This document provides precise, production-grade technical documentation of the AetherTrackSAAS platform architecture. It serves as the authoritative reference for client IT teams, system integrators, and developers who need to understand the system's technical foundations without business or user-facing context.

The documentation covers system architecture, technology choices, data models, API design, real-time behavior, and integration boundaries. All explanations assume technical literacy and avoid simplification that would obscure system constraints or limitations.

---

## 2. High-Level System Architecture

The AetherTrackSAAS platform implements a multi-tenant SaaS architecture with the following layers:

### 2.1 Client Layer

- **React 18 Single Page Application** served as a Progressive Web App
- **Vite** as the build tool and development server
- **Socket.IO Client** for real-time bidirectional communication
- **Axios** for HTTP request handling with interceptors
- **Recharts** for data visualization
- **React Big Calendar** for calendar components

### 2.2 API Gateway Layer

The Express.js application server handles all backend logic:

- **Authentication Middleware**: JWT token verification with access and refresh token support
- **Workspace Context Middleware**: Multi-tenant data isolation through workspace scoping
- **Role-Based Access Control (RBAC)**: Six-tier permission system
- **Security Headers**: Helmet.js for comprehensive security header configuration

### 2.3 Service Layer

Business logic is encapsulated in dedicated services:

- **Email Service**: Nodemailer integration with Brevo transactional email API
- **Brevo Email Service**: Template-based email rendering with variable substitution
- **HR Action Service**: Centralized state management for HR operations
- **HR Event Service**: Event-to-template mapping for automated communications
- **Schedule Engine**: Project task scheduling with dependency resolution
- **Task Reallocation Service**: Automatic task reassignment based on user availability
- **Change Log Service**: Audit trail generation
- **Report Generator**: Excel and PDF report generation

### 2.4 Data Layer

- **MongoDB Atlas**: NoSQL database with Mongoose ODM
- **16 Collections**: Users, Teams, Tasks, Projects, Sprints, Comments, Notifications, ChangeLogs, LeaveRequests, LeaveBalances, LeaveTypes, Holidays, Attendance, Shifts, EmailTemplates, TaskReallocationLogs

### 2.5 External Services

- **Render**: Backend hosting platform
- **Vercel**: Frontend hosting platform
- **Brevo (Sendinblue)**: Transactional email delivery
- **Cloudinary**: Media storage (optional)
- **MongoDB Atlas**: Cloud-hosted database

---

## 3. Technology Stack and Rationale

### 3.1 Backend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | v18+ | JavaScript runtime environment |
| **Express.js** | v4.18 | Web application framework |
| **MongoDB** | v6.0+ | NoSQL database |
| **Mongoose** | v8.0 | MongoDB ODM |
| **Socket.IO** | v4.6 | Real-time bidirectional communication |
| **JWT** | v9.0 | JSON Web Token authentication |
| **bcryptjs** | v2.4 | Password hashing |
| **Nodemailer** | v7.0 | Email sending service |
| **@getbrevo/brevo** | v3.0 | Brevo API integration |
| **node-cron** | v4.2 | Scheduled task automation |
| **ExcelJS** | v4.4 | Excel file generation |
| **jsPDF** | v3.0 | PDF document generation |
| **Helmet** | v7.0 | Security headers middleware |

**Rationale**: Node.js provides non-blocking I/O suitable for real-time applications. Express.js offers minimal middleware chains for authentication and authorization. MongoDB's document model maps naturally to the flexible schema requirements of HR and task management data.

### 3.2 Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | v18.2 | UI library |
| **Vite** | v5.0 | Build tool |
| **React Router** | v6.20 | Client-side routing |
| **Axios** | v1.6 | HTTP client |
| **TailwindCSS** | v3.3 | Utility-first CSS |
| **Recharts** | v3.3 | Charting library |
| **Lucide React** | v0.294 | Icon library |
| **Socket.IO Client** | v4.6 | Real-time updates |
| **XLSX** | v0.18 | Excel file handling |
| **jsPDF AutoTable** | v5.0 | PDF tables |

### 3.3 Infrastructure

| Service | Purpose |
|---------|---------|
| **Render** | Backend API hosting |
| **Vercel** | Frontend PWA hosting |
| **MongoDB Atlas** | Database cluster |
| **Brevo** | Transactional email |

---

## 4. Core Services and Responsibilities

### 4.1 Authentication Service

**File**: `backend/utils/jwt.js`, `backend/middleware/auth.js`

**Responsibilities**:

- JWT access token generation with 15-minute expiration
- JWT refresh token generation with 7-day expiration
- Token verification for each API request
- User context attachment to request objects

**Implementation**: Uses HS256 algorithm with userId, email, role, and workspace in token payload.

### 4.2 Email Service

**File**: `backend/utils/emailService.js`, `backend/services/brevoEmailService.js`

**Responsibilities**:

- Template-based email composition
- Variable substitution from event data
- Brevo API integration for delivery
- Delivery status tracking and logging

**Supported Events**: Leave approval, leave rejection, task assignment, task overdue, user registration, weekly reports.

### 4.3 Schedule Engine

**File**: `backend/services/scheduleEngine.js`

**Responsibilities**:

- Task dependency validation (circular dependency detection)
- Forward pass scheduling for earliest start/end dates
- Backward pass scheduling for latest start/end dates
- Critical path calculation with float determination
- Parent task date aggregation from children

**Pipeline Stages**: Validate → Normalize → Topological Sort → Forward Pass → Backward Pass → Critical Path → Aggregate → Render Model

### 4.4 Task Reallocation Service

**File**: `backend/services/taskReallocationService.js`

**Responsibilities**:

- Detection of user unavailability triggers (leave approval, absence marking)
- Hierarchical escalation through role levels (team member → team lead → admin → super admin)
- Load balancing across admin pool
- System ownership assignment as last resort
- Audit logging for all reallocation events

**Escalation SLAs**: Team Lead: 4 hours, Admin: 8 hours, Super Admin: 24 hours.

### 4.5 HR Action Service

**File**: `backend/services/hrActionService.js`

**Responsibilities**:

- Centralized leave approval state management
- Leave balance deduction on approval
- Leave balance restoration on rejection
- Attendance record updates

### 4.6 HR Event Service

**File**: `backend/services/hrEventService.js`

**Responsibilities**:

- Event-to-template mapping (EVENT_TEMPLATE_MAP)
- Variable resolution for template interpolation
- Email dispatch through Brevo
- Delivery result logging

### 4.7 Change Log Service

**File**: `backend/utils/changeLogService.js`

**Responsibilities**:

- Audit trail creation for all significant actions
- Event type enumeration for categorization
- Metadata capture including IP addresses
- Searchable log storage

---

## 5. Database Design Overview

### 5.1 Database Configuration

**Connection**: Mongoose connection to MongoDB Atlas with connection pooling

**Configuration** (`backend/config/db.js`):

- Connection string from MONGODB_URI environment variable
- Connection pool size: 10 connections
- Buffer commands during connection startup
- Unified topology for replica sets

### 5.2 Indexing Strategy

The system employs compound indexes for query optimization:

```javascript
// Task
{ status: 1 }
{ assigned_to: 1 }
{ team_id: 1 }
{ due_date: 1 }
{ project_id: 1, status: 1 }
{ sprint_id: 1, status: 1 }

// User
{ email: 1 } (unique)
{ role: 1 }

// Attendance
{ userId: 1, date: 1 } (unique)

// LeaveBalance
{ userId: 1, leaveTypeId: 1, year: 1 } (unique)

// LeaveRequest
{ status: 1, startDate: -1 }

// ChangeLog
{ created_at: -1 }
{ event_type: 1 }
{ user_id: 1 }
{ target_type: 1, target_id: 1 }

// TaskReallocationLog
{ reallocatedToUserId: 1, status: 1, createdAt: -1 }
{ originalUserId: 1, createdAt: -1 }
{ taskId: 1, status: 1 }
```

---

## 6. Entity-Relationship (ER) Model

### 6.1 Entities

#### User
- `_id`: ObjectId (primary key)
- `full_name`: String (required)
- `email`: String (required, unique per workspace)
- `password_hash`: String (required, bcrypt hashed)
- `role`: Enum ['admin', 'hr', 'team_lead', 'member', 'community_admin']
- `employmentStatus`: Enum ['ACTIVE', 'INACTIVE', 'ON_NOTICE', 'EXITED']
- `team_id`: ObjectId (ref: Team)
- `teams`: Array of ObjectId (ref: Team)
- `profile_picture`: String (base64 or URL)
- `isEmailVerified`: Boolean
- `created_at`: Date
- `updated_at`: Date

#### Team
- `_id`: ObjectId (primary key)
- `name`: String (required, unique within workspace)
- `hr_id`: ObjectId (ref: User, required)
- `lead_id`: ObjectId (ref: User, required)
- `members`: Array of ObjectId (ref: User)
- `pinned`: Boolean
- `priority`: Number
- `created_at`: Date

#### Task
- `_id`: ObjectId (primary key)
- `title`: String (required)
- `description`: String
- `task_type`: Enum ['task', 'milestone', 'phase']
- `status`: Enum ['todo', 'in_progress', 'review', 'done', 'archived']
- `priority`: Enum ['low', 'medium', 'high', 'urgent']
- `created_by`: ObjectId (ref: User, required)
- `assigned_to`: Array of ObjectId (ref: User)
- `team_id`: ObjectId (ref: Team)
- `project_id`: ObjectId (ref: Project)
- `sprint_id`: ObjectId (ref: Sprint)
- `parent_id`: ObjectId (ref: Task)
- `dependencies`: Array of { predecessor_id, type, lag_days }
- `start_date`: Date
- `due_date`: Date (required)
- `actual_start`: Date
- `actual_end`: Date
- `progress`: Number (0-100)
- `scheduled_start`: Date (computed)
- `scheduled_end`: Date (computed)
- `total_float`: Number
- `is_critical`: Boolean
- `reallocation_status`: Enum ['none', 'reallocated', 'redistributed', 'restored']
- `reallocated_from`: ObjectId (ref: User)
- `created_at`: Date
- `updated_at`: Date

#### Project
- `_id`: ObjectId (primary key)
- `name`: String (required)
- `description`: String
- `status`: Enum ['active', 'on_hold', 'completed', 'archived']
- `priority`: Enum ['low', 'medium', 'high', 'urgent']
- `progress`: Number
- `budget`: { allocated, spent, currency }
- `team_members`: Array of { user: ObjectId, role: String }
- `start_date`: Date
- `due_date`: Date (required)
- `created_by`: ObjectId (ref: User, required)
- `documents`: Array of { name, url, type, size, uploadedAt, uploadedBy }
- `tags`: Array of String
- `risks`: Array of { title, severity, description, status }
- `created_at`: Date
- `updated_at`: Date

#### Sprint
- `_id`: ObjectId (primary key)
- `workspace`: ObjectId (ref: Workspace, required)
- `project`: ObjectId (ref: Project)
- `name`: String (required)
- `startDate`: Date (required)
- `endDate`: Date (required)
- `goal`: String
- `capacity`: Number
- `teamSize`: Number
- `status`: Enum ['planning', 'active', 'completed', 'cancelled']
- `velocity`: Number
- `completedPoints`: Number
- `created_at`: Date
- `updated_at`: Date

#### LeaveRequest
- `_id`: ObjectId (primary key)
- `userId`: ObjectId (ref: User, required)
- `leaveTypeId`: ObjectId (ref: LeaveType, required)
- `startDate`: Date (required)
- `endDate`: Date (required)
- `days`: Number (required)
- `reason`: String (required)
- `status`: Enum ['pending', 'approved', 'rejected', 'cancelled']
- `approvedBy`: ObjectId (ref: User)
- `approvedAt`: Date
- `rejectionReason`: String
- `hrNotes`: String
- `attachments`: Array of String
- `reallocationTriggered`: Boolean
- `reallocationCount`: Number
- `createdAt`: Date
- `updatedAt`: Date

#### LeaveBalance
- `_id`: ObjectId (primary key)
- `userId`: ObjectId (ref: User, required)
- `leaveTypeId`: ObjectId (ref: LeaveType, required)
- `year`: Number (required)
- `totalQuota`: Number (required)
- `used`: Number
- `pending`: Number
- `available`: Number (computed)
- `carriedForward`: Number

#### LeaveType
- `_id`: ObjectId (primary key)
- `name`: String (required)
- `code`: String (uppercase, required)
- `annualQuota`: Number (required)
- `carryForward`: Boolean
- `maxCarryForward`: Number
- `color`: String (hex)
- `isActive`: Boolean
- `description`: String
- `createdAt`: Date
- `updatedAt`: Date

#### Holiday
- `_id`: ObjectId (primary key)
- `name`: String (required)
- `date`: Date (required)
- `isRecurring`: Boolean
- `description`: String
- `isActive`: Boolean
- `createdAt`: Date
- `updatedAt`: Date

#### Attendance
- `_id`: ObjectId (primary key)
- `userId`: ObjectId (ref: User, required)
- `date`: Date (required)
- `checkIn`: Date
- `checkOut`: Date
- `status`: Enum ['present', 'absent', 'half_day', 'leave', 'holiday']
- `workingHours`: Number
- `notes`: String
- `isOverride`: Boolean
- `overrideBy`: ObjectId (ref: User)
- `shift_id`: ObjectId (ref: Shift)
- `expected_hours`: Number
- `late_minutes`: Number
- `early_exit_minutes`: Number
- `overtime_hours`: Number
- `shift_status`: Enum ['on_time', 'late', 'early_exit', 'late_and_early_exit', null]
- `createdAt`: Date
- `updatedAt`: Date

#### Shift
- `_id`: ObjectId (primary key)
- `shift_name`: String (required)
- `start_time`: String (HH:MM format)
- `end_time`: String (HH:MM format)
- `total_hours`: Enum [8, 10, 12]
- `grace_period_minutes`: Number (0-60)
- `early_exit_threshold_minutes`: Number
- `min_hours_for_present`: Number
- `min_hours_for_half_day`: Number
- `is_night_shift`: Boolean
- `break_policy`: { break_duration_minutes, paid_break, max_breaks, break_after_hours }
- `shift_color`: String (hex)
- `shift_type`: Enum ['morning', 'afternoon', 'evening', 'night', 'flexible', 'custom']
- `is_active`: Boolean
- `created_by`: ObjectId (ref: User, required)
- `notes`: String
- `created_at`: Date
- `updated_at`: Date

#### Notification
- `_id`: ObjectId (primary key)
- `user_id`: ObjectId (ref: User, required)
- `type`: Enum (multiple types including task_assigned, task_updated, leave_approved, etc.)
- `message`: String (required)
- `task_id`: ObjectId (ref: Task)
- `payload`: Object
- `read_at`: Date
- `created_at`: Date

#### Comment
- `_id`: ObjectId (primary key)
- `task_id`: ObjectId (ref: Task, required)
- `author_id`: ObjectId (ref: User, required)
- `content`: String (required)
- `created_at`: Date

#### ChangeLog
- `_id`: ObjectId (primary key)
- `event_type`: Enum (extensive list of event types)
- `user_id`: ObjectId (ref: User)
- `user_email`: String
- `user_name`: String
- `user_role`: String
- `user_ip`: String
- `target_type`: Enum ['task', 'user', 'team', 'report', 'comment', 'system', 'notification', 'automation', 'email']
- `target_id`: String
- `target_name`: String
- `action`: String (required)
- `description`: String (required)
- `metadata`: Mixed
- `changes`: Object
- `created_at`: Date

#### TaskReallocationLog
- `_id`: ObjectId (primary key)
- `triggerType`: Enum ['leave_approved', 'absence_marked']
- `triggerRefId`: ObjectId (required)
- `leaveStartDate`: Date (required)
- `leaveEndDate`: Date (required)
- `originalUserId`: ObjectId (ref: User, required)
- `reallocatedToUserId`: ObjectId (ref: User, required)
- `redistributedToUserId`: ObjectId (ref: User)
- `taskId`: ObjectId (ref: Task, required)
- `taskTitle`: String
- `projectId`: ObjectId (ref: Project)
- `sprintId`: ObjectId (ref: Sprint)
- `taskPriority`: String
- `taskDueDate`: Date
- `status`: Enum ['pending', 'accepted', 'rejected', 'redistributed']
- `reallocationReason`: String
- `rejectionReason`: String
- `actedAt`: Date
- `leadNotes`: String
- `originalDueDate`: Date
- `adjustedDueDate`: Date
- `createdAt`: Date
- `updatedAt`: Date

#### EmailTemplate
- `_id`: ObjectId (primary key)
- `name`: String (required)
- `code`: String (uppercase, required, unique)
- `subject`: String (required)
- `htmlContent`: String (required)
- `variables`: Array of { name, description, example }
- `category`: Enum ['leave', 'attendance', 'system', 'custom', 'hiring', 'interview', 'onboarding', 'engagement', 'exit']
- `isActive`: Boolean
- `isPredefined`: Boolean
- `senderName`: String
- `senderEmail`: String
- `createdAt`: Date
- `updatedAt`: Date

### 6.2 Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User → Team | N:1 | User belongs to primary team via team_id |
| User → Teams | N:N | User can belong to multiple teams via teams array |
| Team → User | 1:N | Team has many members |
| Task → User (creator) | N:1 | Task created by user |
| Task → User (assignee) | N:N | Task assigned to multiple users |
| Task → Team | N:1 | Task belongs to team |
| Task → Project | N:1 | Task belongs to project |
| Task → Sprint | N:1 | Task belongs to sprint |
| Task → Task (parent) | N:1 | Task has parent task |
| Project → User | N:N | Project has team members |
| Project → Sprint | 1:N | Project has sprints |
| Sprint → Project | N:1 | Sprint belongs to project |
| LeaveRequest → User | N:1 | Leave requested by user |
| LeaveRequest → LeaveType | N:1 | Leave has type |
| LeaveBalance → User | N:1 | Balance belongs to user |
| LeaveBalance → LeaveType | N:1 | Balance for leave type |
| LeaveType → LeaveBalance | 1:N | Leave type has many balances |
| Attendance → User | N:1 | Attendance belongs to user |
| Attendance → Shift | N:1 | Attendance linked to shift |
| Shift → User | N:1 | Shift created by user |
| Notification → User | N:1 | Notification for user |
| Notification → Task | N:1 | Notification about task |
| Comment → Task | N:1 | Comment on task |
| Comment → User | N:1 | Comment authored by user |
| ChangeLog → User | N:1 | Log entry for user action |
| TaskReallocationLog → User (original) | N:1 | Log for original assignee |
| TaskReallocationLog → User (new) | N:1 | Log for new assignee |
| TaskReallocationLog → Task | N:1 | Log for reallocated task |

### 6.3 Cardinality

| Entity Pair | Cardinality | Notes |
|-------------|-------------|-------|
| User : Team | N:1 (primary) | One primary team per user |
| User : Teams | N:N | Multiple team membership |
| Task : User | N:N | Multiple assignees per task |
| Project : User | N:N | Multiple members per project |
| LeaveBalance : LeaveType | N:1 | One balance record per leave type per user per year |

### 6.4 Constraints

**Application-Level Constraints**:

- Email addresses must be unique within workspace
- Team names cannot be "Admin" (reserved)
- Leave balances cannot go negative
- Tasks must have due dates
- Leave requests cannot overlap within same leave type
- Shift total_hours must be 8, 10, or 12
- User roles must be valid enum values

**Database-Level Constraints**:

- Unique compound indexes prevent duplicate records
- Required fields enforced at schema level
- Enum validation for status and type fields
- Date validation for leave date ranges
- String length limits for text fields

---

## 7. API Design Principles

### 7.1 RESTful Conventions

**Base URL**: `/api`

**Resource Routes**:

| Resource | Routes |
|----------|--------|
| Auth | `/auth` (login, register, refresh, logout) |
| Users | `/users` |
| Teams | `/teams` |
| Tasks | `/tasks` |
| Projects | `/projects` |
| Sprints | `/sprints` |
| Comments | `/comments` |
| Notifications | `/notifications` |
| ChangeLogs | `/changelog` |
| Attendance | `/hr/attendance` |
| Leaves | `/hr/leaves` |
| LeaveTypes | `/hr/leave-types` |
| Holidays | `/hr/holidays` |
| HR Calendar | `/hr/calendar` |
| EmailTemplates | `/hr/email-templates` |
| Meetings | `/hr/meetings` |
| Shifts | `/hr/shifts` |
| Reallocation | `/hr/reallocation` |

**HTTP Methods**:

- `GET`: Retrieve resources
- `POST`: Create new resources
- `PATCH`: Update existing resources
- `DELETE`: Remove resources

### 7.2 Authentication

All protected routes require JWT authentication via `authenticate` middleware. The middleware:

1. Extracts token from Authorization header or cookies
2. Verifies token signature and expiration
3. Attaches user object to request
4. Passes control to route handlers

### 7.3 Authorization

Role-based access control uses `checkRole` middleware:

```javascript
// Example: Admin and HR only
router.patch('/:id/status', authenticate, checkRole(['admin', 'hr']), handler);
```

**Role Permissions**:

| Action | Admin | HR | Team Lead | Member |
|--------|-------|----|-----------|--------|
| Create Tasks | ✓ | ✓ | ✓ | ✓ |
| Assign Tasks | ✓ | ✓ | Team Only | Self Only |
| Delete Tasks | ✓ | ✓ | Own Tasks | ✗ |
| View All Tasks | ✓ | ✓ | ✓ | Own Only |
| Manage Users | ✓ | ✓ | ✗ | ✗ |
| Approve Leave | ✓ | ✓ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ |

### 7.4 Response Format

**Success Response**:

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response**:

```json
{
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

### 7.5 Validation

Input validation uses `express-validator` with custom sanitization:

- ObjectId validation for ID parameters
- String sanitization for text inputs
- Enum validation for status/type fields
- Date range validation for leave requests
- Email format validation

---

## 8. Real-Time and Asynchronous Behavior

### 8.1 Socket.IO Integration

**Connection**: WebSocket with JWT authentication

**Authentication Flow**:

1. Client connects to Socket.IO server
2. Client sends JWT token via handshake auth
3. Server verifies token and fetches user
4. User ID attached to socket for event routing
5. Socket joins user-specific notification room

**Room Architecture**:

- `userId`: Personal notification room
- `teamId`: Team-based notifications
- `project-{projectId}`: Project-specific updates

**Events Emitted by Server**:

| Event | Payload | Recipients |
|-------|---------|------------|
| `notification:new` | { type, message, task } | Specific user room |
| `task:created` | Task object | All connected clients |
| `task:updated` | Task object | All connected clients |
| `task:assigned` | { task, assigned_by } | Assigned users |
| `task:deleted` | Task ID | All connected clients |

**Events Received by Server**:

| Event | Handler |
|-------|---------|
| `join` | Join specified room with authorization check |
| `leave` | Leave specified room |

### 8.2 Cron Scheduled Jobs

**File**: `backend/utils/scheduler.js`

**Scheduled Jobs**:

| Job | Schedule | Action |
|-----|----------|--------|
| Overdue Reminders | Daily 9:00 AM | Email users with overdue tasks |
| Weekly Reports | Monday 8:00 AM | Generate and email PDF/Excel reports |

**Implementation**: Uses `node-cron` with timezone configuration.

### 8.3 Asynchronous Processing

**Task Reallocation**: Fire-and-forget pattern using `.catch()` to prevent blocking HTTP response:

```javascript
triggerReallocation({ ... }).catch(err => 
  console.error('[Reallocation] Background trigger failed:', err.message)
);
```

**Email Sending**: Asynchronous with error logging, does not block request response.

---

## 9. Integration Boundaries

### 9.1 Email Integration

**Provider**: Brevo (Sendinblue)

**Integration Points**:

- Transactional email sending via Brevo API
- Template rendering with variable substitution
- Delivery status tracking

**Configuration Required**:

- `BREVO_API_KEY`: Brevo API key
- `EMAIL_FROM`: Sender email address
- `EMAIL_FROM_NAME`: Sender display name

### 9.2 File Storage

**Provider**: Cloudinary (optional)

**Integration Points**:

- Profile picture uploads
- Document attachments
- Image hosting

**Configuration Required**:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 9.3 Database

**Provider**: MongoDB Atlas

**Connection**: Mongoose ODM with connection pooling

**Configuration Required**:

- `MONGODB_URI`: Connection string

---

## 10. Technical Assumptions and Limitations

### 10.1 Assumptions

**Environment Assumptions**:

- Node.js v18+ runtime available
- MongoDB Atlas or compatible MongoDB instance
- SMTP or Brevo API for email delivery
- HTTPS termination at load balancer/reverse proxy

**Operational Assumptions**:

- Single timezone per workspace (configured at workspace creation)
- Monday-Friday standard working week
- Working hours 9:00 AM - 6:00 PM for scheduling

**Data Assumptions**:

- Email addresses are unique within workspace
- User IDs are MongoDB ObjectIds
- All dates are stored in UTC

### 10.2 Limitations

**Workspace Tier Limitations**:

| Feature | CORE | COMMUNITY |
|---------|------|-----------|
| Max Users | Unlimited | 10 |
| Max Tasks | Unlimited | 100 |
| Max Teams | Unlimited | 3 |
| Max Leave Types | Unlimited | 5 |
| Bulk Import | ✓ | ✗ |
| Audit Logs | ✓ | ✗ |

**Technical Limitations**:

- Query result pagination required for large datasets
- File attachment size limits apply (configurable)
- Maximum 30-day inactivity threshold before user flagged
- Maximum 90-day date range for audit log queries

**API Limitations**:

- Rate limiting on administrative actions
- WebSocket connection limit per user
- Maximum file upload size: 10MB

---

## 11. Summary

The AetherTrackSAAS platform implements a production-grade multi-tenant SaaS architecture with the following key technical characteristics:

**Architecture**: Three-tier architecture with Express.js API layer, Mongoose/MongoDB data layer, and React SPA frontend. Multi-tenancy achieved through workspace-scoped data isolation.

**Authentication**: JWT-based with access/refresh token pattern. Role-based access control enforced at middleware level with six distinct roles.

**Data Model**: 16 MongoDB collections with comprehensive indexing strategy. Relationships modeled through ObjectId references with appropriate cardinality.

**Real-Time**: Socket.IO provides bidirectional communication for notifications and task updates. Cron jobs handle scheduled automation for reminders and reports.

**Integration**: Brevo provides transactional email. Optional Cloudinary integration for file storage. MongoDB Atlas for persistent storage.

**Constraints**: COMMUNITY tier enforces strict limits on users, tasks, teams, and leave types. CORE tier removes all limitations with additional audit logging and bulk operations support.

This architecture supports enterprise requirements for data isolation, role-based access, audit compliance, and scalable performance while maintaining the flexibility needed for diverse organizational workflows.

---

*This document is intended for technical audiences. For product features and user workflows, refer to separate product documentation.*
