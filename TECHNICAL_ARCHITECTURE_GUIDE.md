# AetherTrackSAAS Technical Architecture Guide

## 1. Purpose of This Document

This document provides a comprehensive technical overview of the AetherTrackSAAS platform architecture. It is designed to help technical teams, developers, and IT staff understand the system's design decisions, technology choices, data models, API structure, and integration points. The guide covers both backend and frontend components, authentication mechanisms, real-time features, and external service integrations.

The document serves as a reference for developers who need to maintain, extend, or troubleshoot the platform. It explains the "why" behind architectural decisions rather than just describing "what" exists, providing context that aids in effective system navigation and modification.

---

## 2. Who Should Read This Document

This guide is intended for the following audiences:

**Software Developers**: Developers working on the AetherTrack codebase who need to understand the existing architecture before implementing new features or fixing bugs. This includes both backend developers working with Node.js and MongoDB, and frontend developers working with React.

**DevOps and Infrastructure Engineers**: Technical staff responsible for deploying, monitoring, and maintaining the platform. The document covers infrastructure choices, deployment targets, and security configurations that inform operational decisions.

**Technical Leads and Architects**: Team leads who need to understand the system holistically to make informed decisions about future development directions, technology choices, and architectural changes.

**Integration Specialists**: Developers working on third-party integrations or API extensions who need to understand the existing API patterns, authentication mechanisms, and data models.

---

## 3. High-Level Architecture Overview

AetherTrackSAAS is a full-stack enterprise SaaS application built with a modern JavaScript technology stack. The platform follows a client-server architecture with a RESTful API backend and a single-page application frontend. Real-time communication is handled through WebSockets, enabling live updates across connected clients.

The system is designed as a multi-tenant platform where workspaces serve as the primary isolation boundary. Each workspace contains its own teams, projects, tasks, and HR-related data. Users can belong to multiple teams within a workspace, and role-based access control ensures appropriate data visibility and action permissions.

The architecture emphasizes separation of concerns, with distinct layers for data persistence, business logic, API handling, and presentation. This separation facilitates maintainability, testability, and the ability to scale individual components independently.

---

## 4. Detailed Architecture Sections

### 4.1 System Architecture

The AetherTrack platform consists of three primary layers:

**Presentation Layer (Frontend)**: A React-based single-page application served from Vercel. The frontend communicates with the backend exclusively through RESTful API endpoints and receives real-time updates via Socket.IO. The frontend is configured as a Progressive Web App (PWA), enabling offline capabilities and push notifications.

**Application Layer (Backend)**: A Node.js Express.js server hosted on Render. This layer handles API request processing, business logic execution, authentication and authorization, and coordination with external services. The backend exposes over 100 RESTful endpoints organized by functional modules.

**Data Layer**: MongoDB hosted on MongoDB Atlas. The database contains 21 collections (models) that store all application data, including users, teams, projects, tasks, attendance records, leave requests, and configuration data.

**External Services Layer**: The backend integrates with third-party services for specialized functionality. Brevo handles transactional email delivery, Cloudinary manages media assets, and MongoDB Atlas provides the database infrastructure with built-in backup and scaling capabilities.

The following diagram illustrates the high-level data flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐     │
│  │   React SPA (Vercel) │    │   PWA Service Worker        │     │
│  │   - TailwindCSS      │    │   - Workbox caching         │     │
│  │   - Recharts         │    │   - Push notifications      │     │
│  │   - React Big Calendar│   │                             │     │
│  └──────────┬───────────┘    └──────────────┬──────────────┘     │
│             │                                │                    │
│             │ HTTP/REST                      │ WebSocket          │
└─────────────┼────────────────────────────────┼────────────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server Layer (Render)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Express.js Server                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────────────────┐  │ │
│  │  │ Auth Layer │ │ API Routes │ │ Socket.IO Handler      │  │ │
│  │  │ - JWT       │ │ - 18 route │ │ - 15+ event types     │  │ │
│  │  │ - RBAC      │ │   files    │ │ - Real-time updates   │  │ │
│  │  └─────────────┘ └─────────────┘ └────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              │
              │                    │
              ▼                    ▼
┌─────────────────────┐    ┌─────────────────────┐
│  MongoDB Atlas      │    │  External Services  │
│  - 21 Collections   │    │  - Brevo (Email)    │
│  - Multi-tenant     │    │  - Cloudinary       │
│  - Auto-scaling     │    │    (Media)          │
└─────────────────────┘    └─────────────────────┘
```

### 4.2 Technology Stack

The platform uses a carefully selected technology stack chosen for developer productivity, performance, and ecosystem maturity.

**Backend Technologies**:

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20.x | JavaScript execution environment |
| Framework | Express.js | 4.18.x | REST API framework |
| Database | MongoDB | 6.0+ | Document database with Mongoose ODM |
| Real-time | Socket.IO | 4.6.x | WebSocket abstraction layer |
| Authentication | JWT | 9.0.x | Token-based authentication |
| Security | Helmet | 8.1.x | HTTP security headers |
| Validation | express-validator | 7.0.x | Request validation middleware |
| Rate Limiting | express-rate-limit | 8.2.x | API rate limiting |
| Scheduling | node-cron | 4.2.x | Cron-based job scheduling |
| Email | @getbrevo/brevo | 3.0.x | Brevo API client |
| Media | cloudinary | 2.9.x | Cloud media management |
| Password Hashing | bcryptjs | 2.4.x | Secure password hashing |

**Frontend Technologies**:

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18.2.x | UI component library |
| Build Tool | Vite | 5.0.x | Fast development and builds |
| Styling | TailwindCSS | 3.3.x | Utility-first CSS framework |
| Charts | Recharts | 3.3.x | Data visualization |
| Calendar | React Big Calendar | 1.19.x | Calendar UI component |
| Routing | React Router DOM | 6.20.x | Client-side routing |
| HTTP Client | Axios | 1.6.x | API communication |
| WebSocket Client | socket.io-client | 4.6.x | Real-time updates |
| PWA | vite-plugin-pwa | 1.1.x | Service worker generation |
| Animations | framer-motion | 12.23.x | Animation library |

**Infrastructure Services**:

| Service | Provider | Purpose |
|---------|----------|---------|
| Database | MongoDB Atlas | Cloud-hosted MongoDB with automatic scaling |
| Backend Hosting | Render | Containerized Node.js application hosting |
| Frontend Hosting | Vercel | Edge-deployed static and SPA hosting |
| Email Delivery | Brevo | Transactional email service |
| Media Storage | Cloudinary | Image and video management |
| CDN | Vercel Edge Network | Static asset delivery |

### 4.3 Database Design

The database uses MongoDB with the Mongoose ODM for schema definition and query building. The system follows a denormalized document structure optimized for the access patterns of a task management system.

#### 4.3.1 Core Data Models

**User Model**: Stores authentication credentials, profile information, and role assignments. The model includes fields for email (unique), password hash, full name, profile picture, employment status, and role. Users can belong to multiple teams through a teams array field.

```javascript
{
  _id: ObjectId,
  full_name: String,
  email: String (unique, indexed),
  password_hash: String,
  profile_picture: String (base64 or URL),
  role: String (enum: 'admin', 'hr', 'team_lead', 'member', 'community_admin'),
  employmentStatus: String (enum: 'ACTIVE', 'INACTIVE', 'ON_NOTICE', 'EXITED'),
  team_id: ObjectId (ref: Team, deprecated - use teams),
  teams: ObjectId[] (ref: Team),
  isEmailVerified: Boolean,
  verificationToken: String,
  resetPasswordToken: String,
  created_at: Date,
  updated_at: Date
}
```

**Team Model**: Represents organizational units within a workspace. Each team has a name, HR contact, team lead, and member list.

```javascript
{
  _id: ObjectId,
  name: String (unique within workspace, validated),
  hr_id: ObjectId (ref: User, required),
  lead_id: ObjectId (ref: User, required),
  members: ObjectId[] (ref: User),
  pinned: Boolean,
  priority: Number,
  created_at: Date
}
```

**Task Model**: The central entity in the system, representing work items that can be assigned to users, organized into projects, and tracked through sprints.

```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  task_type: String (enum: 'task', 'milestone', 'phase'),
  scheduling_mode: String (enum: 'auto', 'manual', 'locked'),
  constraint_type: String (enum: 'ASAP', 'ALAP', 'SNET', 'FNLT', 'MSO', 'MFO'),
  constraint_date: Date,
  status: String (enum: 'todo', 'in_progress', 'review', 'done', 'archived'),
  priority: String (enum: 'low', 'medium', 'high', 'urgent'),
  created_by: ObjectId (ref: User, required),
  assigned_to: ObjectId[] (ref: User),
  team_id: ObjectId (ref: Team),
  project_id: ObjectId (ref: Project),
  sprint_id: ObjectId (ref: Sprint),
  start_date: Date,
  due_date: Date,
  estimated_hours: Number,
  actual_hours: Number,
  dependencies: [{
    predecessor_id: ObjectId (ref: Task),
    type: String (enum: 'FS', 'SS', 'FF', 'SF'),
    lag_days: Number
  }],
  created_at: Date,
  updated_at: Date
}
```

**Project Model**: Groups related tasks and provides organizational context.

```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  status: String (enum: 'active', 'completed', 'archived'),
  start_date: Date,
  end_date: Date,
  created_by: ObjectId (ref: User),
  team_id: ObjectId (ref: Team),
  created_at: Date,
  updated_at: Date
}
```

**Sprint Model**: Provides time-boxed iteration context for tasks within agile workflows.

```javascript
{
  _id: ObjectId,
  name: String (required),
  start_date: Date (required),
  end_date: Date (required),
  goal: String,
  status: String (enum: 'planning', 'active', 'completed'),
  project_id: ObjectId (ref: Project),
  created_at: Date
}
```

#### 4.3.2 HR Module Data Models

The HR module extends the core functionality with attendance tracking, leave management, and shift scheduling.

**Attendance Model**: Tracks daily attendance records including check-in/check-out times and status.

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, indexed),
  date: Date (indexed),
  checkIn: Date,
  checkOut: Date,
  status: String (enum: 'present', 'absent', 'half_day', 'leave', 'holiday'),
  workingHours: Number,
  notes: String,
  isOverride: Boolean,
  overrideBy: ObjectId (ref: User),
  shift_id: ObjectId (ref: Shift)
}
```

**LeaveRequest Model**: Manages employee leave submissions and approvals.

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, indexed),
  leaveTypeId: ObjectId (ref: LeaveType),
  startDate: Date (indexed),
  endDate: Date,
  days: Number,
  reason: String,
  status: String (enum: 'pending', 'approved', 'rejected', 'cancelled', indexed),
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectionReason: String
}
```

**LeaveBalance Model**: Tracks accrued and used leave for each user by leave type.

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  leaveTypeId: ObjectId (ref: LeaveType),
  year: Number,
  totalDays: Number,
  usedDays: Number,
  balance: Number
}
```

**LeaveType Model**: Defines available leave categories.

```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  accrualRate: Number,
  maxCarryover: Number,
  isActive: Boolean
}
```

**Shift Model**: Defines work schedules that can be assigned to employees.

```javascript
{
  _id: ObjectId,
  name: String (required),
  start_time: String (HH:mm format),
  end_time: String (HH:mm format),
  days_of_week: Number[] (0-6, Sunday-Saturday),
  is_active: Boolean,
  created_by: ObjectId (ref: User)
}
```

**Holiday Model**: Stores organizational holidays that affect attendance calculations.

```javascript
{
  _id: ObjectId,
  name: String (required),
  date: Date (required),
  is_recurring: Boolean,
  created_at: Date
}
```

#### 4.3.3 Communication and Activity Models

**Notification Model**: Stores user notifications for in-app and real-time delivery.

```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: User, indexed),
  type: String (enum: 'task_assigned', 'task_updated', 'task_completed', 
                'comment_added', 'meeting_created', 'leave_approved', etc.),
  message: String,
  task_id: ObjectId (ref: Task),
  payload: Object,
  read_at: Date,
  created_at: Date
}
```

**Comment Model**: Provides threaded discussions on tasks.

```javascript
{
  _id: ObjectId,
  task_id: ObjectId (ref: Task, indexed),
  user_id: ObjectId (ref: User),
  content: String (required),
  created_at: Date,
  updated_at: Date
}
```

**ChangeLog Model**: Tracks all entity modifications for audit purposes.

```javascript
{
  _id: ObjectId,
  entity_type: String (required),
  entity_id: ObjectId (required),
  action: String (enum: 'create', 'update', 'delete'),
  changes: Object,
  user_id: ObjectId (ref: User),
  timestamp: Date
}
```

**Meeting Model**: Schedules and tracks meetings with participant management.

```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  start_time: Date (required),
  end_time: Date (required),
  organizer: ObjectId (ref: User),
  participants: ObjectId[] (ref: User),
  meeting_link: String,
  location: String,
  reminders: Number[] (minutes before),
  is_recurring: Boolean,
  recurrence_pattern: Object,
  status: String (enum: 'scheduled', 'completed', 'cancelled'),
  created_at: Date
}
```

**EmailTemplate Model**: Stores reusable email templates with variable substitution.

```javascript
{
  _id: ObjectId,
  name: String (required),
  subject: String (required),
  body: String (required, HTML),
  type: String (enum: 'leave', 'task', 'meeting', 'system', etc.),
  variables: String[] (available template variables),
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}
```

**Recipient Model**: Manages email recipient preferences and history.

```javascript
{
  _id: ObjectId,
  email: String (required),
  user_id: ObjectId (ref: User),
  preferences: Object,
  last_notified: Date,
  notification_types: String[]
}
```

#### 4.3.4 Model Relationships

The following relationships exist between core models:

- Users belong to multiple Teams (many-to-many)
- Teams have one HR lead and one Team Lead (many-to-one with User)
- Tasks belong to one Project (many-to-one)
- Tasks belong to one Sprint (many-to-one)
- Tasks belong to one Team (many-to-one)
- Tasks can have multiple Assignees (many-to-many with User)
- Tasks can have dependencies on other Tasks (self-referencing many-to-many)
- LeaveRequests reference LeaveTypes (many-to-one)
- LeaveBalances track User and LeaveType (compound unique index)
- Attendance records link to Users (many-to-one)
- Attendance records can reference Shifts (optional many-to-one)

### 4.4 API Design Principles

The RESTful API follows consistent patterns across all endpoints to ensure predictability and ease of integration.

#### 4.4.1 Request/Response Conventions

All API endpoints follow these conventions:

**Base URL Structure**: `/api/v1/{resource}`

**HTTP Methods**:
- GET: Retrieve resources (list or single)
- POST: Create new resources
- PUT: Full resource update
- PATCH: Partial resource update
- DELETE: Remove resources

**Response Format**: All responses follow a consistent JSON structure:

```javascript
// Success response
{
  "success": true,
  "data": { /* resource or array */ },
  "message": "Optional success message"
}

// Error response
{
  "success": false,
  "message": "Error description",
  "error": "Optional detailed error"
}
```

**Pagination**: List endpoints support pagination with query parameters:

```
GET /api/v1/tasks?page=1&limit=20&sort=-created_at
```

**Filtering**: Filter parameters use field names directly:

```
GET /api/v1/tasks?status=in_progress&priority=high&team_id=abc123
```

**Field Selection**: Clients can request specific fields:

```
GET /api/v1/tasks?fields=title,status,assigned_to,due_date
```

#### 4.4.2 Workspace Scoping

Most endpoints operate within a workspace context. The workspace is determined from the authenticated user's session rather than being passed as a URL parameter. This design ensures that workspace context cannot be manipulated through URL manipulation attacks.

Endpoints that need explicit workspace context accept an optional `workspace_id` query parameter for cross-workspace operations (admin only).

#### 4.4.3 Error Handling

The API uses appropriate HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Data validation failure |
| 422 | Unprocessable Entity - Business logic error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### 4.5 Authentication and Authorization

The platform uses a robust JWT-based authentication system with refresh token support.

#### 4.5.1 Authentication Flow

**Login Process**:
1. Client submits credentials (email/password) to `/api/v1/auth/login`
2. Server validates credentials against hashed password
3. On success, server generates access token (15-minute expiry) and refresh token (7-day expiry)
4. Tokens are returned to client for storage and subsequent requests

**Token Refresh**:
1. When access token expires, client submits refresh token to `/api/v1/auth/refresh`
2. Server validates refresh token and generates new token pair
3. Old refresh token is invalidated to prevent token reuse attacks

**Logout**:
1. Client submits refresh token to `/api/v1/auth/logout`
2. Server blacklists the refresh token

#### 4.5.2 Token Structure

**Access Token** (JWT):

```javascript
{
  "userId": "user_id_here",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700000900  // 15 minutes from issue
}
```

**Refresh Token** (JWT):

```javascript
{
  "userId": "user_id_here",
  "iat": 1700000000,
  "exp": 1700600000  // 7 days from issue
}
```

#### 4.5.3 Role-Based Access Control

The system implements a 6-tier role hierarchy:

| Role | Permissions |
|------|-------------|
| Super Admin | Full system access, cross-workspace operations, user management |
| Admin | Workspace administration, user management within workspace |
| HR | HR module full access, leave management, attendance viewing |
| Team Lead | Team management, task assignment, team reporting |
| Member | Standard user access, personal tasks, team participation |
| Community Admin | Community-specific administrative functions |

Role checks are implemented as middleware that validates the user's role before allowing access to protected endpoints. The role hierarchy enables permission escalation where higher roles inherit all permissions from lower roles.

#### 4.5.4 Authentication Middleware

The [`authenticate`](backend/middleware/auth.js:4) middleware validates incoming requests:

1. Extracts Bearer token from Authorization header
2. Verifies token signature and expiry
3. Retrieves user from database (excluding password hash)
4. Attaches user object to request for downstream handlers

```javascript
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  const user = await User.findById(decoded.userId)
    .select('-password_hash')
    .populate('team_id', 'name description');
  
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  
  req.user = user;
  next();
};
```

### 4.6 Real-Time Features

Socket.IO enables real-time bidirectional communication between the server and connected clients. This enables instant updates when data changes occur.

#### 4.6.1 Socket.IO Configuration

The Socket.IO server is initialized alongside the Express HTTP server:

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Strict CORS validation against allowed origins
      if (!origin) return callback(null, false);
      const isAllowed = allowedOrigins.some(allowed => 
        origin.replace(/\/$/, '').replace('https://', 'http://') === 
        allowed.replace(/\/$/, '').replace('https://', 'http://')
      );
      isAllowed ? callback(null, true) : callback(new Error('Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  transports: ['polling', 'websocket']
});
```

#### 4.6.2 Socket Events

The system supports 15+ event types for real-time updates:

**Connection Events**:
- `connection`: Client connects to Socket.IO namespace
- `disconnect`: Client disconnects

**Task Events**:
- `task:created`: New task added
- `task:updated`: Task modified
- `task:deleted`: Task removed
- `task:assigned`: Task assigned to user

**Notification Events**:
- `notification:new`: New notification for user
- `notification:read`: Notification marked as read

**HR Events**:
- `leave:created`: Leave request submitted
- `leave:updated`: Leave status changed
- `attendance:checkin`: User checked in
- `attendance:checkout`: User checked out

**Meeting Events**:
- `meeting:created`: Meeting scheduled
- `meeting:updated`: Meeting modified
- `meeting:cancelled`: Meeting cancelled

#### 4.6.3 Room-Based Broadcasting

Socket.IO uses a room-based broadcasting model where clients join rooms corresponding to their user ID or team ID. This enables targeted event broadcasting:

```javascript
// Send to specific user
io.to(`user_${userId}`).emit('notification:new', notification);

// Send to all team members
io.to(`team_${teamId}`).emit('task:updated', task);

// Send to all workspace members
io.to(`workspace_${workspaceId}`).emit('announcement', data);
```

### 4.7 External Integrations

#### 4.7.1 Brevo Email Service

Brevo (formerly Sendinblue) handles all transactional email delivery. The integration supports both the Brevo API and SMTP fallback.

**Configuration Required**:
- `BREVO_API_KEY`: API key for Brevo REST API
- `EMAIL_HOST`: SMTP host (typically smtp-relay.brevo.com)
- `EMAIL_PORT`: SMTP port (typically 587)
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password

**Email Template Variables**: The system supports 70+ template variables that can be inserted into email templates. Variables are wrapped in double curly braces (e.g., `{{user_name}}`, `{{task_title}}`) and are dynamically replaced at send time.

**Service Implementation**: The [`BrevoEmailService`](backend/services/brevoEmailService.js:14) class provides:

- Lazy client initialization (only when needed)
- Automatic fallback from API to SMTP
- Template variable substitution
- Send tracking and error handling

```javascript
class BrevoEmailService {
  async sendEmail(to, subject, templateName, variables) {
    // Try Brevo API first
    if (this.getClient()) {
      try {
        return await this.sendViaApi(to, subject, templateName, variables);
      } catch (error) {
        console.warn('Brevo API failed, falling back to SMTP');
      }
    }
    // Fallback to SMTP
    return await this.sendViaSmtp(to, subject, templateName, variables);
  }
}
```

#### 4.7.2 Cloudinary Media Management

Cloudinary provides cloud-based image and video management for user profile pictures and task attachments.

**Configuration Required**:
- `CLOUDINARY_CLOUD_NAME`: Cloud name from Cloudinary dashboard
- `CLOUDINARY_API_KEY`: API key
- `CLOUDINARY_API_SECRET`: API secret

**Usage Patterns**:
- User profile picture uploads
- Task attachment storage
- Image transformations (resizing, cropping, format conversion)

The Cloudinary integration uses signed uploads to prevent unauthorized file uploads to the Cloudinary account.

#### 4.7.3 MongoDB Atlas

The database is hosted on MongoDB Atlas with the following features:

- **Connection**: Uses Mongoose ODM with connection pooling
- **Scaling**: Auto-scaling enabled for storage and compute
- **Backup**: Automated daily backups with point-in-time recovery
- **Security**: IP whitelist and VPC peering for production

Connection string format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### 4.8 PWA and Mobile Support

The frontend is configured as a Progressive Web App (PWA) using Vite PWA plugin with Workbox.

#### 4.8.1 Service Worker Configuration

The service worker uses a generateSW strategy with the following caching configuration:

```javascript
workbox: {
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 }
      }
    }
  ]
}
```

**Caching Strategies**:
- **App Shell**: Cached via generateSW for instant load
- **API Requests**: NetworkFirst strategy (try network, fallback to cache)
- **Static Assets**: CacheFirst with versioned cache busting

#### 4.8.2 Web App Manifest

The manifest defines PWA appearance and behavior:

```json
{
  "name": "AetherTrack - Task Management System",
  "short_name": "AetherTrack",
  "theme_color": "#667eea",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "start_url": "/",
  "icons": [
    { "src": "/icons/pwa-192x192.png", "sizes": "192x192" },
    { "src": "/icons/pwa-512x512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

#### 4.8.3 Push Notifications

The PWA supports push notifications for:
- New task assignments
- Task status changes
- Leave request updates
- Meeting reminders
- Comment mentions

Push notification delivery requires the VAPID key pair configuration and service worker registration.

### 4.9 Security Considerations

The platform implements multiple security layers to protect data and prevent common vulnerabilities.

#### 4.9.1 Transport Security

- **HTTPS Only**: Production deployments enforce HTTPS through HSTS (HTTP Strict Transport Security) with a 1-year max age
- **Helmet.js**: Comprehensive security headers including CSP, X-Frame-Options, X-Content-Type-Options
- **Trust Proxy**: Enabled for proper client IP detection behind reverse proxies

#### 4.9.2 Input Validation

- **express-validator**: All API inputs are validated before processing
- **XSS Protection**: Input sanitization prevents cross-site scripting
- **SQL Injection**: Parameterized MongoDB queries prevent injection attacks

#### 4.9.3 Authentication Security

- **Password Hashing**: bcryptjs with appropriate salt rounds
- **Token Expiry**: Short-lived access tokens (15 minutes) limit exposure
- **Refresh Token Invalidation**: Tokens are blacklisted after use

#### 4.9.4 Rate Limiting

API endpoints are protected against abuse:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});
```

#### 4.9.5 CORS Configuration

Cross-Origin Resource Sharing is strictly controlled:

- **Development**: Allows localhost origins (3000, 5173)
- **Production**: Requires explicit ALLOWED_ORIGINS configuration
- **Socket.IO**: Mirrors Express CORS policy with fail-closed behavior

#### 4.9.6 Environment Variable Validation

Critical environment variables are validated at startup:

```javascript
function validateCriticalEnvVars() {
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  
  if (process.env.NODE_ENV === 'production') {
    required.push('JWT_REFRESH_SECRET', 'ALLOWED_ORIGINS');
  }
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('[CRITICAL] Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}
```

### 4.10 Scalability and Performance

The platform is designed to handle growth through horizontal scaling and optimized data access patterns.

#### 4.10.1 Database Optimization

- **Indexes**: Critical query fields are indexed (e.g., email, status, dates)
- **Compound Indexes**: Composite indexes for common query patterns
- **Denormalization**: Strategic denormalization reduces join complexity

#### 4.10.2 API Performance

- **Pagination**: All list endpoints support pagination to limit response size
- **Field Selection**: Clients can request only needed fields
- **Caching**: Redis-compatible caching layer can be added for high-traffic endpoints

#### 4.10.3 Real-Time Optimization

- **Room-Based Broadcasting**: Events are broadcast only to relevant rooms
- **Connection Pooling**: Socket.IO connections are efficiently managed
- **Event Debouncing**: Rapid changes are batched to reduce event volume

#### 4.10.4 Infrastructure Scaling

- **Backend**: Render provides auto-scaling for the Node.js application
- **Database**: MongoDB Atlas cluster can be scaled vertically and horizontally
- **CDN**: Vercel Edge Network serves static assets globally

---

## 5. API Endpoint Overview

The backend exposes 100+ RESTful endpoints organized by functional module. Below is a summary of key endpoints by module.

### 5.1 Authentication Module (`/api/v1/auth`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/register` | POST | Register new user |
| `/login` | POST | Authenticate user, receive tokens |
| `/logout` | POST | Invalidate refresh token |
| `/refresh` | POST | Refresh access token |
| `/forgot-password` | POST | Request password reset |
| `/reset-password` | POST | Reset password with token |

### 5.2 Users Module (`/api/v1/users`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List users (paginated) |
| `/me` | GET | Get current user profile |
| `/:id` | GET | Get user by ID |
| `/` | POST | Create new user (admin) |
| `/:id` | PUT | Update user |
| `/:id` | DELETE | Delete user (admin) |
| `/:id/role` | PATCH | Update user role |

### 5.3 Teams Module (`/api/v1/teams`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List teams |
| `/` | POST | Create team |
| `/:id` | GET | Get team details |
| `/:id` | PUT | Update team |
| `/:id` | DELETE | Delete team |
| `/:id/members` | POST | Add team members |
| `/:id/members/:userId` | DELETE | Remove team member |

### 5.4 Projects Module (`/api/v1/projects`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List projects |
| `/` | POST | Create project |
| `/:id` | GET | Get project details |
| `/:id` | PUT | Update project |
| `/:id` | DELETE | Delete project |
| `/:id/tasks` | GET | Get project tasks |

### 5.5 Tasks Module (`/api/v1/tasks`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List tasks (with filters) |
| `/` | POST | Create task |
| `/:id` | GET | Get task details |
| `/:id` | PUT | Update task |
| `/:id` | DELETE | Delete task |
| `/:id/assign` | POST | Assign users to task |
| `/:id/comments` | GET | Get task comments |
| `/:id/comments` | POST | Add comment to task |

### 5.6 Sprints Module (`/api/v1/sprints`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List sprints |
| `/` | POST | Create sprint |
| `/:id` | GET | Get sprint details |
| `/:id` | PUT | Update sprint |
| `/:id/tasks` | GET | Get sprint tasks |

### 5.7 HR Module Endpoints

**Attendance** (`/api/v1/attendance`):
- `GET /` - List attendance records
- `POST /check-in` - Record check-in
- `POST /check-out` - Record check-out
- `GET /:id` - Get attendance record
- `PUT /:id` - Update attendance (override)

**Leaves** (`/api/v1/leaves`):
- `GET /` - List leave requests
- `POST /` - Submit leave request
- `GET /:id` - Get leave request
- `PUT /:id` - Update leave request
- `PATCH /:id/approve` - Approve leave (HR/Admin)
- `PATCH /:id/reject` - Reject leave (HR/Admin)

**Leave Types** (`/api/v1/leaveTypes`):
- `GET /` - List leave types
- `POST /` - Create leave type
- `PUT /:id` - Update leave type
- `DELETE /:id` - Delete leave type

**Holidays** (`/api/v1/holidays`):
- `GET /` - List holidays
- `POST /` - Create holiday
- `PUT /:id` - Update holiday
- `DELETE /:id` - Delete holiday

**Shifts** (`/api/v1/shifts`):
- `GET /` - List shifts
- `POST /` - Create shift
- `PUT /:id` - Update shift
- `DELETE /:id` - Delete shift

**Meetings** (`/api/v1/meetings`):
- `GET /` - List meetings
- `POST /` - Create meeting
- `GET /:id` - Get meeting details
- `PUT /:id` - Update meeting
- `DELETE /:id` - Cancel meeting

### 5.8 Notifications Module (`/api/v1/notifications`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List user notifications |
| `/:id/read` | PATCH | Mark as read |
| `/read-all` | PATCH | Mark all as read |

### 5.9 Email Templates Module (`/api/v1/emailTemplates`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List email templates |
| `/` | POST | Create template |
| `/:id` | GET | Get template |
| `/:id` | PUT | Update template |
| `/:id` | DELETE | Delete template |
| `/:id/send-test` | POST | Send test email |

---

## 6. Edge Cases, Assumptions, and Constraints

### 6.1 Assumptions

**User Assumptions**:
- Users have modern browsers supporting ES6+ and WebSockets
- Users have stable internet connections (real-time features require connectivity)
- Users understand basic task management concepts

**Data Assumptions**:
- Workspace is the primary isolation boundary
- User email addresses are unique within a workspace
- Date/time handling uses UTC internally, converted to user timezone on display

**Deployment Assumptions**:
- Production environment uses HTTPS
- MongoDB Atlas provides adequate performance for expected load
- Third-party services (Brevo, Cloudinary) remain available

### 6.2 Edge Cases

**Authentication Edge Cases**:
- Concurrent login from multiple devices: Each device maintains separate tokens
- Token refresh during network interruption: Client implements retry with backoff
- Session timeout during form submission: Form data is preserved, user re-authenticates

**Data Conflict Edge Cases**:
- Two users editing same task simultaneously: Last write wins, with notification to first editor
- Leave request overlapping existing approved leave: System validates and rejects with message
- Task deletion with active dependencies: System prevents deletion, requires dependency resolution

**Performance Edge Cases**:
- Large datasets: Pagination prevents memory issues
- High-frequency updates: Event debouncing reduces Socket.IO traffic
- Slow network: Optimistic UI updates with rollback on failure

### 6.3 Constraints

**Technical Constraints**:
- Browser-based only (no native mobile app)
- Single-page application requires JavaScript
- Real-time features require WebSocket support

**Business Constraints**:
- Free tier limited to workspace members
- Email sending subject to Brevo rate limits
- Media storage subject to Cloudinary quotas

**Development Constraints**:
- Monorepo structure requires coordinated deployments
- MongoDB schema migrations require downtime or careful rollout
- PWA updates require service worker lifecycle awareness

---

## 7. Summary

The AetherTrackSAAS platform is a comprehensive enterprise task management system built on modern, proven technologies. The architecture emphasizes security, scalability, and developer productivity through clean separation of concerns and well-defined interfaces.

**Key Architectural Highlights**:

- **Multi-tenant Design**: Workspaces provide logical isolation while sharing infrastructure
- **Role-Based Access**: Six-tier role system enables fine-grained permission management
- **Real-Time Updates**: Socket.IO enables instant collaboration across users
- **HR Module Integration**: Full attendance, leave, and shift management capabilities
- **PWA Support**: Offline-capable Progressive Web App with push notifications
- **Enterprise-Grade Security**: JWT authentication, Helmet security headers, rate limiting, and input validation

**Technology Decisions Rationale**:

- **MongoDB**: Flexible schema supports evolving requirements without migrations
- **Express.js**: Minimal, unopinionated framework enables rapid feature development
- **React**: Component-based architecture promotes code reuse and maintainability
- **Vite**: Fast development experience with optimized production builds
- **Socket.IO**: Reliable WebSocket abstraction with fallback support

The platform can be extended through custom email templates, additional API endpoints, and integration with external services. Developers should reference this guide when making architectural decisions to maintain consistency with existing patterns.

For operational guidance, refer to the deployment documentation and environment configuration guide. For user-facing features, consult the end-user and administrator guides.
