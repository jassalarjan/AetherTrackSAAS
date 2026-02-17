# AetherTrack SAAS - Comprehensive System Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Core Features & Implementation](#core-features--implementation)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Key Technologies & Libraries](#key-technologies--libraries)
6. [Database Schema](#database-schema)
7. [API Structure](#api-structure)
8. [Frontend Implementation](#frontend-implementation)
9. [Security & Authentication](#security--authentication)
10. [Real-time Features](#real-time-features)
11. [Automation & Scheduling](#automation--scheduling)
12. [Deployment & Configuration](#deployment--configuration)

---

## System Overview

**AetherTrack SAAS** is a comprehensive Community Task Management System (CTMS) designed for team collaboration, project management, and human resource management. It combines traditional project management features with modern HR functionalities to provide an all-in-one solution for organizations.

### Current Status
✅ **Fully Operational** - All core modules are implemented and working

### System Type
- **Full-Stack Web Application**
- **Multi-tenant SAAS Platform**
- **Real-time Collaborative System**

---

## Technology Stack

### Backend Technologies

#### Core Framework
- **Node.js** (v18+) - JavaScript runtime environment
- **Express.js** (v4.18.2) - Web application framework
- **ES6 Modules** - Modern JavaScript module system

#### Database
- **MongoDB** (v8.0.0) - NoSQL database via Mongoose ODM
- **Mongoose** (v8.0.0) - MongoDB object modeling and schema validation

#### Authentication & Security
- **JWT (jsonwebtoken v9.0.2)** - Token-based authentication
  - Access tokens for session management
  - Refresh tokens for token renewal
- **bcryptjs (v2.4.3)** - Password hashing
- **Cookie Parser** - Cookie handling
- **Express Validator (v7.0.1)** - Input validation and sanitization

#### Real-time Communication
- **Socket.IO (v4.6.0)** - Bi-directional WebSocket communication
  - Real-time notifications
  - Live task updates
  - User presence tracking

#### Email Services
- **Brevo API (@getbrevo/brevo v3.0.1)** - Transactional email service
- **Nodemailer (v7.0.12)** - Fallback email service
- Email templates with dynamic variable replacement

#### Task Automation
- **node-cron (v4.2.1)** - Job scheduling
  - Daily overdue task reminders (9:00 AM)
  - Weekly reports (Monday 8:00 AM)
  - Auto-status updates

#### File Processing
- **Multer (v2.0.2)** - File upload handling
- **ExcelJS (v4.4.0)** - Excel file generation and parsing
- **XLSX (v0.18.5)** - Spreadsheet processing
- **jsPDF (v3.0.3)** - PDF generation
- **jsPDF-AutoTable (v5.0.2)** - Table generation in PDFs

### Frontend Technologies

#### Core Framework
- **React (v18.2.0)** - Component-based UI library
- **React DOM (v18.2.0)** - React rendering
- **Vite (v5.0.8)** - Build tool and dev server

#### Routing & State Management
- **React Router DOM (v6.20.0)** - Client-side routing
- **Context API** - Global state management
  - AuthContext - User authentication state
  - ThemeContext - Dark/light theme
  - SidebarContext - Sidebar state

#### UI Components & Styling
- **Tailwind CSS (v3.3.6)** - Utility-first CSS framework
- **PostCSS (v8.4.32)** - CSS processing
- **Autoprefixer (v10.4.16)** - CSS vendor prefixes
- **Framer Motion (v12.23.26)** - Animation library
- **Lucide React (v0.294.0)** - Icon library

#### Data Visualization
- **Recharts (v3.3.0)** - Chart library
  - Line charts
  - Bar charts
  - Pie charts
  - Area charts

#### Calendar & Scheduling
- **React Big Calendar (v1.19.4)** - Full-featured calendar component
- **Moment.js (v2.30.1)** - Date manipulation

#### Document Generation
- **html2canvas (v1.4.1)** - Screenshot generation
- **jsPDF (v3.0.3)** - Client-side PDF generation
- **jsPDF-AutoTable (v5.0.2)** - Table formatting

#### HTTP Client
- **Axios (v1.6.2)** - Promise-based HTTP client
  - Interceptors for token management
  - Automatic token refresh
  - Error handling

#### Real-time Communication
- **Socket.IO Client (v4.6.0)** - WebSocket client

#### Progressive Web App
- **Vite Plugin PWA (v1.1.0)** - PWA configuration
- **Workbox Window (v7.3.0)** - Service worker support

---

## Core Features & Implementation

### 1. Authentication & Authorization

#### Features
✅ User Registration with email verification
✅ Secure login with JWT tokens
✅ Password reset via email
✅ Session management with refresh tokens
✅ Role-based access control (RBAC)
✅ Activity timeout (30 minutes)
✅ Multi-workspace support

#### Implementation
```javascript
// Token-based authentication
- Access Token: Short-lived (15 minutes)
- Refresh Token: Long-lived (7 days)
- Stored in HTTP-only cookies & localStorage
```

#### User Roles
- **Admin** - Full system access
- **HR** - HR module management
- **Team Lead** - Team management, task assignment
- **Member** - Basic task access
- **Community Admin** - Multi-tenant workspace management

#### Security Features
- Password hashing with bcrypt (10 rounds)
- Token verification on each request
- CORS protection
- XSS protection via validation
- Rate limiting capabilities

### 2. Project Management

#### Features
✅ Project creation and management
✅ Project dashboard with analytics
✅ Budget tracking (allocated vs. spent)
✅ Team member assignment with roles
✅ Document management
✅ Risk tracking
✅ Progress monitoring
✅ Status management (active, on hold, completed, archived)
✅ Priority levels (low, medium, high, urgent)
✅ Tags for organization
✅ Gantt chart visualization

#### Implementation Details
- **Model**: Project.js with 15+ fields
- **Routes**: Full CRUD operations via `/api/projects`
- **Frontend Pages**: 
  - ProjectDashboard.jsx - Overview of all projects
  - MyProjects.jsx - User-specific projects
  - ProjectDetail.jsx - Detailed project view
  - ProjectGantt.jsx - Timeline visualization

### 3. Task Management

#### Features
✅ Task creation with rich details
✅ Task assignment (single/multiple users)
✅ Kanban board view
✅ List view with filtering
✅ Status tracking (todo, in progress, review, done, archived)
✅ Priority management
✅ Progress percentage
✅ Due date management
✅ Sprint association
✅ Project association
✅ Comments and attachments
✅ Real-time updates

#### Implementation
- **Model**: Task.js with indexed fields
- **Views**: 
  - Kanban.jsx - Drag-and-drop board
  - Tasks.jsx - List view with filters
- **Real-time**: Socket.IO events for live updates
- **Automation**: Overdue task detection and reminders

### 4. Sprint Management

#### Features
✅ Sprint planning
✅ Sprint capacity management
✅ Velocity tracking
✅ Burndown charts (via frontend)
✅ Sprint status (planning, active, completed, cancelled)
✅ Team size configuration
✅ Goal setting
✅ Task association
✅ Sprint timeline management

#### Implementation
- **Model**: Sprint.js with workspace and project references
- **Page**: SprintManagement.jsx
- **Integration**: Tasks can be assigned to sprints

### 5. Team Management

#### Features
✅ Team creation and management
✅ Member assignment
✅ Team lead designation
✅ Team-based task assignment
✅ Team analytics
✅ Multiple team membership support

#### Implementation
- **Model**: Team.js
- **Routes**: `/api/teams`
- **Page**: Teams.jsx
- Users can belong to multiple teams via `teams[]` array

### 6. HR Module - Attendance Management

#### Features
✅ Daily attendance tracking
✅ Check-in/check-out system
✅ Automatic working hours calculation
✅ Status management (present, absent, half day, leave, holiday)
✅ Manual override capabilities
✅ Calendar view
✅ Attendance reports
✅ Historical data tracking

#### Implementation
- **Model**: Attendance.js with auto-calculation
- **Routes**: `/api/hr/attendance`
- **Page**: AttendancePage.jsx
- **Auto-calculation**: Working hours computed from check-in/out times
- **Validation**: Prevents duplicate entries via compound index

### 7. HR Module - Leave Management

#### Features
✅ Leave request submission
✅ Leave approval workflow
✅ Leave type management (sick, vacation, casual, etc.)
✅ Leave balance tracking
✅ Calendar integration
✅ Email notifications
✅ HR notes and rejection reasons
✅ Attachment support
✅ Status tracking (pending, approved, rejected, cancelled)

#### Implementation
- **Models**: 
  - LeaveRequest.js - Leave applications
  - LeaveBalance.js - User leave balances
  - LeaveType.js - Configurable leave types
- **Routes**: `/api/hr/leaves`, `/api/hr/leave-types`
- **Page**: LeavesPage.jsx
- **Email Integration**: Brevo API for notifications

### 8. HR Module - Holiday Management

#### Features
✅ Holiday calendar setup
✅ Public holiday tracking
✅ Holiday list management
✅ Calendar integration
✅ Multi-year support

#### Implementation
- **Model**: Holiday.js
- **Routes**: `/api/hr/holidays`
- **Integration**: Syncs with HR Calendar

### 9. HR Module - Email System

#### Features
✅ Custom email templates
✅ Dynamic variable replacement
✅ Template preview
✅ Brevo API integration
✅ HTML email support
✅ Template versioning
✅ Leave notification emails
✅ Attendance alert emails

#### Implementation
- **Model**: EmailTemplate.js
- **Service**: brevoEmailService.js
- **Routes**: `/api/hr/email-templates`
- **Page**: EmailCenter.jsx
- **Variables**: Dynamic replacement like {{employeeName}}, {{leaveType}}

### 10. Analytics & Reporting

#### Features
✅ Task completion statistics
✅ Team performance metrics
✅ Project progress tracking
✅ Time tracking analytics
✅ Visual charts and graphs
✅ Export to PDF/Excel
✅ Custom date ranges
✅ Resource utilization reports
✅ Weekly automated reports

#### Implementation
- **Page**: Analytics.jsx
- **Charts**: Recharts library
- **Exports**: 
  - reportGenerator.js - PDF/Excel generation
  - comprehensiveReportGenerator.js - Advanced reports
- **Automation**: Weekly reports via scheduler

### 11. Calendar & Timeline Views

#### Features
✅ Interactive calendar
✅ Task due date visualization
✅ Leave calendar
✅ Holiday calendar
✅ Sprint timeline
✅ Gantt chart
✅ Drag-and-drop rescheduling
✅ Multiple view modes (month, week, day)

#### Implementation
- **Library**: React Big Calendar
- **Pages**: 
  - Calendar.jsx - Task calendar
  - HRCalendar.jsx - HR events
  - ProjectGantt.jsx - Project timeline
- **Integration**: Tasks, leaves, holidays, sprints

### 12. Notifications System

#### Features
✅ Real-time in-app notifications
✅ Browser push notifications
✅ Email notifications
✅ Notification center
✅ Mark as read/unread
✅ Notification preferences
✅ Custom notification sounds
✅ Notification queue management

#### Implementation
- **Model**: Notification.js
- **Service**: notificationService.js
- **Hook**: useNotifications.js
- **Socket.IO**: Real-time delivery
- **Browser API**: Web Notifications API
- **Page**: Notifications.jsx

### 13. Change Log & Audit Trail

#### Features
✅ Comprehensive activity logging
✅ User action tracking
✅ System event logging
✅ Audit trail for compliance
✅ Filterable history
✅ Metadata storage

#### Implementation
- **Model**: ChangeLog.js
- **Service**: changeLogService.js
- **Page**: ChangeLog.jsx
- **Events**: CRUD operations, status changes, approvals

### 14. Comments & Collaboration

#### Features
✅ Task comments
✅ User mentions
✅ Real-time comment updates
✅ Comment history
✅ Latest comment preview

#### Implementation
- **Model**: Comment.js
- **Routes**: `/api/comments`
- **Component**: LatestCommentPreview.jsx
- **Real-time**: Socket.IO for live updates

### 15. User Management

#### Features
✅ User CRUD operations
✅ Role assignment
✅ Team assignment
✅ Profile picture upload
✅ Employment status tracking
✅ Email verification status
✅ Bulk user import
✅ User search and filtering

#### Implementation
- **Model**: User.js with indexing
- **Routes**: `/api/users`
- **Pages**: 
  - UserManagement.jsx - Admin view
  - CommunityUserManagement.jsx - Community admin
- **Import**: Bulk import via Excel

### 16. Settings & Configuration

#### Features
✅ User profile settings
✅ Password change
✅ Theme toggle (dark/light)
✅ Notification preferences
✅ Session management
✅ Workspace settings

#### Implementation
- **Page**: Settings.jsx
- **Context**: ThemeContext.jsx
- **Components**: 
  - ThemeToggle.jsx
  - NotificationSettings.jsx
  - SessionSettings.jsx

### 17. Resource & Workload Management

#### Features
✅ Team workload visualization
✅ Resource allocation tracking
✅ Capacity planning
✅ Task distribution analysis

#### Implementation
- **Page**: ResourceWorkload.jsx
- **Visualization**: Charts showing team capacity

---

## Architecture & Design Patterns

### Backend Architecture

#### MVC Pattern
```
├── Models (Data Layer)
│   ├── User.js
│   ├── Task.js
│   ├── Project.js
│   └── ...
├── Routes (Controller Layer)
│   ├── auth.js
│   ├── tasks.js
│   ├── projects.js
│   └── ...
├── Middleware (Request Processing)
│   ├── auth.js
│   ├── roleCheck.js
│   └── auditLogger.js
├── Services (Business Logic)
│   ├── brevoEmailService.js
│   ├── hrActionService.js
│   └── hrEventService.js
└── Utils (Helper Functions)
    ├── reportGenerator.js
    ├── scheduler.js
    └── emailService.js
```

#### Key Design Patterns

1. **Middleware Pattern**
   - Authentication middleware for protected routes
   - Role-based access control
   - Request logging and auditing

2. **Service Layer Pattern**
   - Separation of business logic from routes
   - Reusable service functions
   - Email service abstraction

3. **Repository Pattern**
   - Mongoose models as data repositories
   - Centralized data access

4. **Observer Pattern**
   - Socket.IO for event-driven updates
   - Real-time notifications

5. **Scheduler Pattern**
   - Cron jobs for automated tasks
   - Background processing

### Frontend Architecture

#### Component-Based Architecture
```
├── Pages (Route Components)
│   ├── Dashboard.jsx
│   ├── Tasks.jsx
│   ├── Projects/
│   └── ...
├── Components (Reusable UI)
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── modals/
│   └── layouts/
├── Context (Global State)
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── SidebarContext.jsx
├── Hooks (Custom Logic)
│   └── useNotifications.js
├── API (HTTP Client)
│   └── axios.js
└── Utils (Helper Functions)
    ├── notificationService.js
    └── reportGenerator.js
```

#### Design Patterns

1. **Context Pattern**
   - Global state management
   - Prop drilling avoidance

2. **Custom Hooks Pattern**
   - Reusable logic extraction
   - Side effect management

3. **Higher-Order Component Pattern**
   - ProtectedRoute for authentication

4. **Compound Components Pattern**
   - Modal components
   - Form components

5. **Container/Presentational Pattern**
   - Separation of logic and UI

---

## Key Technologies & Libraries

### 1. Socket.IO - Real-time Communication

#### Purpose
Enables bi-directional, event-based communication between client and server for real-time features.

#### Implementation
```javascript
// Server (backend/server.js)
const io = new Server(httpServer, {
  cors: { 
    origin: ['http://localhost:5173'],
    credentials: true 
  }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });
});

// Client (frontend/src/context/AuthContext.jsx)
const socket = io('http://localhost:5000', {
  withCredentials: true
});
```

#### Use Cases
- Task updates
- New notifications
- Comment additions
- Leave request status changes
- Real-time collaboration

### 2. JWT (JSON Web Tokens) - Authentication

#### Purpose
Stateless authentication mechanism for secure API access.

#### Implementation
```javascript
// Token Generation
const accessToken = jwt.sign(
  { userId: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: user._id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

#### Security Features
- Short-lived access tokens (15 min)
- Refresh token rotation
- Secure HTTP-only cookies
- Token verification middleware

### 3. Mongoose - MongoDB ODM

#### Purpose
Object Data Modeling (ODM) library for MongoDB and Node.js.

#### Features Used
- Schema definition with validation
- Middleware (pre/post hooks)
- Virtual properties
- Population (relationships)
- Indexing for performance
- Query building

#### Example Schema
```javascript
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo' 
  },
  assigned_to: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Indexing
taskSchema.index({ status: 1, due_date: 1 });
```

### 4. Brevo API - Email Service

#### Purpose
Transactional email delivery with template support.

#### Implementation
```javascript
const apiInstance = new brevoAPI.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevoAPI.TransactionalEmailsApiApiKeys.apiKey, 
  process.env.BREVO_API_KEY
);

await apiInstance.sendTransacEmail({
  sender: { email: 'noreply@aethertrack.com' },
  to: [{ email: recipientEmail }],
  subject: 'Leave Request Update',
  htmlContent: emailHTML
});
```

#### Use Cases
- Leave request notifications
- Task assignments
- Password reset emails
- Weekly reports
- Attendance alerts

### 5. node-cron - Job Scheduler

#### Purpose
Task scheduling for automated background jobs.

#### Implementation
```javascript
// Daily overdue reminders at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  await sendOverdueReminders();
}, { timezone: "Asia/Karachi" });

// Weekly reports every Monday at 8:00 AM
cron.schedule('0 8 * * 1', async () => {
  await sendWeeklyReports();
}, { timezone: "Asia/Karachi" });
```

#### Scheduled Tasks
- Overdue task reminders
- Weekly performance reports
- Attendance auto-marking
- Leave balance updates

### 6. React Router DOM - Client-side Routing

#### Purpose
Declarative routing for React applications.

#### Implementation
```javascript
<Routes>
  <Route path="/" element={<Login />} />
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
</Routes>
```

#### Features Used
- Nested routing
- Protected routes
- Dynamic routes (/projects/:id)
- Navigation guards
- URL parameters

### 7. Tailwind CSS - Utility-First CSS

#### Purpose
Rapid UI development with utility classes.

#### Configuration
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...}
      }
    }
  }
}
```

#### Features Used
- Responsive design
- Dark mode support
- Custom color schemes
- Flexbox/Grid layouts
- Transitions and animations

### 8. Recharts - Data Visualization

#### Purpose
Composable charting library built with React components.

#### Implementation
```javascript
<LineChart data={chartData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="completed" stroke="#8884d8" />
</LineChart>
```

#### Chart Types Used
- Line charts (progress over time)
- Bar charts (task distribution)
- Pie charts (status breakdown)
- Area charts (resource utilization)

### 9. Axios - HTTP Client

#### Purpose
Promise-based HTTP client with interceptors.

#### Configuration
```javascript
// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
    }
  }
);
```

#### Features Used
- Request/response interceptors
- Automatic token refresh
- Error handling
- Request cancellation
- Base URL configuration

### 10. Framer Motion - Animation Library

#### Purpose
Production-ready animation and gesture library for React.

#### Implementation
```javascript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  <TaskCard />
</motion.div>
```

#### Use Cases
- Page transitions
- Modal animations
- List item animations
- Hover effects
- Loading states

---

## Database Schema

### Core Collections

#### 1. Users
```javascript
{
  full_name: String,
  email: String (unique),
  password_hash: String,
  profile_picture: String,
  role: Enum ['admin', 'hr', 'team_lead', 'member', 'community_admin'],
  employmentStatus: Enum ['ACTIVE', 'INACTIVE', 'ON_NOTICE', 'EXITED'],
  team_id: ObjectId (ref: Team),
  teams: [ObjectId] (ref: Team),
  isEmailVerified: Boolean,
  verificationToken: String,
  resetPasswordToken: String,
  created_at: Date,
  updated_at: Date
}
```

#### 2. Tasks
```javascript
{
  title: String,
  description: String,
  status: Enum ['todo', 'in_progress', 'review', 'done', 'archived'],
  priority: Enum ['low', 'medium', 'high', 'urgent'],
  created_by: ObjectId (ref: User),
  assigned_to: [ObjectId] (ref: User),
  team_id: ObjectId (ref: Team),
  project_id: ObjectId (ref: Project),
  sprint_id: ObjectId (ref: Sprint),
  due_date: Date,
  progress: Number (0-100),
  created_at: Date,
  updated_at: Date
}
```

#### 3. Projects
```javascript
{
  name: String,
  description: String,
  status: Enum ['active', 'on_hold', 'completed', 'archived'],
  priority: Enum ['low', 'medium', 'high', 'urgent'],
  progress: Number (0-100),
  budget: {
    allocated: Number,
    spent: Number,
    currency: String
  },
  team_members: [{
    user: ObjectId (ref: User),
    role: String
  }],
  start_date: Date,
  due_date: Date,
  created_by: ObjectId (ref: User),
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date,
    uploadedBy: ObjectId (ref: User)
  }],
  tags: [String],
  risks: [{
    title: String,
    severity: Enum ['low', 'medium', 'high', 'critical'],
    status: Enum ['active', 'mitigated', 'resolved']
  }]
}
```

#### 4. Sprints
```javascript
{
  workspace: ObjectId (ref: Workspace),
  project: ObjectId (ref: Project),
  name: String,
  startDate: Date,
  endDate: Date,
  goal: String,
  capacity: Number,
  teamSize: Number,
  status: Enum ['planning', 'active', 'completed', 'cancelled'],
  velocity: Number,
  completedPoints: Number
}
```

#### 5. Teams
```javascript
{
  name: String,
  description: String,
  lead_id: ObjectId (ref: User),
  members: [ObjectId] (ref: User),
  created_at: Date
}
```

#### 6. LeaveRequests
```javascript
{
  userId: ObjectId (ref: User),
  leaveTypeId: ObjectId (ref: LeaveType),
  startDate: Date,
  endDate: Date,
  days: Number,
  reason: String,
  status: Enum ['pending', 'approved', 'rejected', 'cancelled'],
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  rejectionReason: String,
  hrNotes: String,
  attachments: [String],
  timestamps: true
}
```

#### 7. Attendance
```javascript
{
  userId: ObjectId (ref: User),
  date: Date,
  checkIn: Date,
  checkOut: Date,
  status: Enum ['present', 'absent', 'half_day', 'leave', 'holiday'],
  workingHours: Number (auto-calculated),
  notes: String,
  isOverride: Boolean,
  overrideBy: ObjectId (ref: User),
  timestamps: true
}
```

#### 8. Notifications
```javascript
{
  recipient_id: ObjectId (ref: User),
  type: String,
  title: String,
  message: String,
  link: String,
  read: Boolean,
  created_at: Date
}
```

#### 9. ChangeLogs
```javascript
{
  user_id: ObjectId (ref: User),
  event_type: String,
  action: String,
  description: String,
  target_type: String,
  target_id: String,
  metadata: Object,
  timestamp: Date
}
```

#### 10. EmailTemplates
```javascript
{
  name: String,
  subject: String,
  htmlContent: String,
  variables: [String],
  type: Enum ['leave_approval', 'leave_rejection', 'attendance_alert'],
  isActive: Boolean,
  createdBy: ObjectId (ref: User),
  timestamps: true
}
```

### Database Indexes
- User.email (unique)
- Task.status, Task.due_date (compound)
- Task.assigned_to, Task.project_id, Task.sprint_id
- Attendance.userId + date (compound, unique)
- LeaveRequest.userId, LeaveRequest.status

---

## API Structure

### Authentication Endpoints

```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login user
POST   /api/auth/logout                - Logout user
GET    /api/auth/verify                - Verify token
POST   /api/auth/refresh-token         - Refresh access token
POST   /api/auth/verify-email          - Verify email address
POST   /api/auth/forgot-password       - Request password reset
POST   /api/auth/reset-password        - Reset password
```

### User Management
```
GET    /api/users                      - Get all users
GET    /api/users/:id                  - Get user by ID
PUT    /api/users/:id                  - Update user
DELETE /api/users/:id                  - Delete user
POST   /api/users/bulk-import          - Bulk import users
```

### Task Management
```
GET    /api/tasks                      - Get all tasks (with filters)
POST   /api/tasks                      - Create task
GET    /api/tasks/:id                  - Get task by ID
PUT    /api/tasks/:id                  - Update task
DELETE /api/tasks/:id                  - Delete task
PATCH  /api/tasks/:id/status           - Update task status
PATCH  /api/tasks/:id/progress         - Update task progress
```

### Project Management
```
GET    /api/projects                   - Get all projects
POST   /api/projects                   - Create project
GET    /api/projects/:id               - Get project by ID
PUT    /api/projects/:id               - Update project
DELETE /api/projects/:id               - Delete project
GET    /api/projects/:id/tasks         - Get project tasks
POST   /api/projects/:id/documents     - Upload document
```

### Sprint Management
```
GET    /api/sprints                    - Get all sprints
POST   /api/sprints                    - Create sprint
GET    /api/sprints/:id                - Get sprint by ID
PUT    /api/sprints/:id                - Update sprint
DELETE /api/sprints/:id                - Delete sprint
GET    /api/sprints/:id/tasks          - Get sprint tasks
```

### Team Management
```
GET    /api/teams                      - Get all teams
POST   /api/teams                      - Create team
GET    /api/teams/:id                  - Get team by ID
PUT    /api/teams/:id                  - Update team
DELETE /api/teams/:id                  - Delete team
POST   /api/teams/:id/members          - Add team member
```

### HR - Attendance
```
GET    /api/hr/attendance              - Get attendance records
POST   /api/hr/attendance/check-in     - Check-in
POST   /api/hr/attendance/check-out    - Check-out
GET    /api/hr/attendance/report       - Generate report
POST   /api/hr/attendance/override     - Manual override
```

### HR - Leave Management
```
GET    /api/hr/leaves                  - Get leave requests
POST   /api/hr/leaves                  - Submit leave request
GET    /api/hr/leaves/:id              - Get leave request
PUT    /api/hr/leaves/:id              - Update leave request
POST   /api/hr/leaves/:id/approve      - Approve leave
POST   /api/hr/leaves/:id/reject       - Reject leave
GET    /api/hr/leaves/balance/:userId  - Get leave balance
```

### HR - Holidays
```
GET    /api/hr/holidays                - Get holidays
POST   /api/hr/holidays                - Add holiday
DELETE /api/hr/holidays/:id            - Delete holiday
```

### HR - Email Templates
```
GET    /api/hr/email-templates         - Get templates
POST   /api/hr/email-templates         - Create template
PUT    /api/hr/email-templates/:id     - Update template
DELETE /api/hr/email-templates/:id     - Delete template
POST   /api/hr/email-templates/preview - Preview template
```

### Notifications
```
GET    /api/notifications              - Get user notifications
PATCH  /api/notifications/:id/read     - Mark as read
PATCH  /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/:id          - Delete notification
```

### Comments
```
GET    /api/comments/task/:taskId      - Get task comments
POST   /api/comments                   - Add comment
DELETE /api/comments/:id               - Delete comment
```

### Change Log
```
GET    /api/changelog                  - Get change logs (with filters)
```

---

## Frontend Implementation

### Routing Structure

```javascript
/ (root)                    → Login
/login                      → Login
/register-community         → Community Registration
/verify-email               → Email Verification
/forgot-password            → Password Reset Request
/reset-password             → Password Reset Form
/dashboard                  → Main Dashboard
/tasks                      → Task List View
/kanban                     → Kanban Board
/projects                   → Project Dashboard
/projects/:id               → Project Details
/my-projects                → User's Projects
/gantt                      → Gantt Chart
/sprints                    → Sprint Management
/teams                      → Team Management
/users                      → User Management
/analytics                  → Analytics Dashboard
/resource-workload          → Resource Management
/calendar                   → Task Calendar
/hr/dashboard               → HR Dashboard
/hr/attendance              → Attendance Management
/hr/leaves                  → Leave Management
/hr/calendar                → HR Calendar
/hr/email-center            → Email Templates
/notifications              → Notification Center
/settings                   → User Settings
/changelog                  → Change Log
```

### State Management

#### 1. AuthContext
- User authentication state
- Login/logout functions
- Token management
- Socket.IO connection
- Activity tracking

#### 2. ThemeContext
- Dark/light theme toggle
- Theme persistence
- CSS class switching

#### 3. SidebarContext
- Sidebar open/close state
- Mobile responsiveness

### Custom Hooks

#### useNotifications
- Initializes notification system
- Handles Socket.IO events
- Browser notification permissions
- Notification queue management
- Sound notifications

### API Integration

#### Axios Configuration
```javascript
// Base URL setup
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Token refresh logic
  }
);
```

### Component Structure

#### Layout Components
- **Navbar.jsx** - Top navigation bar with notifications
- **Sidebar.jsx** - Side navigation menu
- **MainLayout** - Wrapper for authenticated pages

#### Feature Components
- **TaskCard.jsx** - Reusable task display
- **ProjectLabel.jsx** - Project badge
- **SprintLabel.jsx** - Sprint badge
- **TeamLabel.jsx** - Team badge
- **ProgressBar.jsx** - Visual progress indicator
- **Avatar.jsx** - User avatar component

#### Modal Components
- CreateTaskModal
- EditTaskModal
- CreateProjectModal
- LeaveRequestModal
- AttendanceModal

### Styling Approach

#### Tailwind Utilities
- Responsive breakpoints (sm, md, lg, xl)
- Custom color palette
- Dark mode classes
- Utility-first approach

#### Custom CSS
- animations.css - Keyframe animations
- mobile-responsive.css - Mobile-specific styles
- index.css - Global styles

---

## Security & Authentication

### Security Measures

#### 1. Authentication Security
- JWT tokens with expiration
- Refresh token rotation
- Secure HTTP-only cookies
- Token verification on each request
- Password hashing with bcrypt (10 rounds)

#### 2. Authorization
- Role-based access control (RBAC)
- Middleware-based route protection
- Resource-level permissions
- Workspace isolation

#### 3. Input Validation
- Express Validator for sanitization
- Mongoose schema validation
- Type checking
- XSS prevention

#### 4. CORS Configuration
```javascript
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 5. Database Security
- MongoDB indexes for performance
- Unique constraints
- Data encryption at rest (MongoDB Atlas)
- Connection string in environment variables

#### 6. Session Management
- Activity timeout (30 minutes)
- Auto-logout on inactivity
- Token refresh mechanism
- Concurrent session handling

### Environment Variables
```
# Database
MONGODB_URI=mongodb://...

# JWT Secrets
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Email Service
BREVO_API_KEY=...
EMAIL_FROM=noreply@aethertrack.com

# Server
NODE_ENV=production
PORT=5000

# CORS
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Real-time Features

### Socket.IO Implementation

#### Server-Side Events
```javascript
// Task updates
io.to(userId).emit('task:updated', taskData);

// Notifications
io.to(userId).emit('notification', notificationData);

// Comments
io.to(taskId).emit('comment:added', commentData);

// Leave requests
io.to(hrUserId).emit('leave:requested', leaveData);
```

#### Client-Side Listeners
```javascript
socket.on('task:updated', (data) => {
  // Update task in UI
});

socket.on('notification', (data) => {
  // Show notification
  notificationService.show(data);
});
```

### Real-time Features

1. **Task Updates**
   - Status changes
   - Assignment changes
   - Progress updates
   - New comments

2. **Notifications**
   - In-app notifications
   - Browser push notifications
   - Real-time delivery

3. **Collaboration**
   - Live comment updates
   - User presence
   - Concurrent editing awareness

4. **HR Events**
   - Leave request notifications
   - Attendance alerts
   - Approval updates

---

## Automation & Scheduling

### Cron Jobs

#### 1. Daily Overdue Task Reminders
- **Schedule**: Every day at 9:00 AM
- **Function**: Sends email reminders for overdue tasks
- **Implementation**: scheduler.js → sendOverdueReminders()

#### 2. Weekly Performance Reports
- **Schedule**: Every Monday at 8:00 AM
- **Function**: Generates and emails weekly team reports
- **Implementation**: scheduler.js → sendWeeklyReports()

### Automated Processes

#### 1. Email Notifications
- Leave request submissions
- Leave approvals/rejections
- Task assignments
- Overdue task reminders
- Weekly summaries

#### 2. Attendance Auto-calculation
- Working hours computation
- Status determination (full-day, half-day)
- Holiday marking

#### 3. Leave Balance Updates
- Automatic deduction on approval
- Annual leave allocation
- Balance expiry handling

#### 4. Notification Delivery
- Real-time Socket.IO events
- Browser push notifications
- Email fallback

---

## Deployment & Configuration

### Environment Setup

#### Backend (.env)
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@yourdomain.com
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourfrontend.vercel.app
```

#### Frontend (.env)
```
VITE_API_URL=https://yourbackend.render.com/api
VITE_SOCKET_URL=https://yourbackend.render.com
```

### Deployment Platforms

#### Backend (Render)
- **File**: render.yaml
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node.js 18+
- **Health Check**: `/api/health`

#### Frontend (Vercel)
- **File**: vercel.json
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite

### Build Commands

#### Backend
```bash
npm install
npm start
```

#### Frontend
```bash
npm install
npm run build
npm run preview  # for testing
```

### Production Optimizations

1. **Database**
   - Connection pooling
   - Index optimization
   - Query optimization

2. **API**
   - Response compression
   - Rate limiting
   - Caching strategies

3. **Frontend**
   - Code splitting
   - Lazy loading
   - Asset optimization
   - PWA capabilities

4. **Security**
   - HTTPS enforcement
   - Security headers
   - CORS configuration
   - Environment variable protection

---

## System Performance

### Database Optimization
- ✅ Strategic indexing on frequently queried fields
- ✅ Compound indexes for complex queries
- ✅ Lean queries for read-only operations
- ✅ Population only when necessary

### API Performance
- ✅ Pagination for large datasets
- ✅ Filtering and projection
- ✅ Response compression
- ✅ Efficient query patterns

### Frontend Performance
- ✅ React.lazy() for code splitting
- ✅ Memoization with useMemo/useCallback
- ✅ Virtual scrolling for large lists
- ✅ Optimized re-renders

---

## Monitoring & Logging

### Backend Logging
```javascript
// Server events
console.log('✅ MongoDB Connected');
console.log('🔔 Starting overdue reminders...');
console.log('❌ Error:', error.message);
```

### Change Log System
- All CRUD operations logged
- User actions tracked
- System events recorded
- Metadata for debugging

### Error Handling
- Try-catch blocks
- Centralized error handling
- User-friendly error messages
- Error logging

---

## Future Enhancements (Not Yet Implemented)

While the system is fully functional, potential future additions could include:

- Video conferencing integration
- Advanced reporting with AI insights
- Mobile native apps (iOS/Android)
- Blockchain-based audit trails
- Advanced role hierarchies
- Multi-language support
- Integration with external tools (Slack, Jira, etc.)
- Time tracking with screenshots
- Budgeting and invoicing
- Client portal access

---

## Troubleshooting Guide

### Common Issues

#### 1. Socket.IO Connection Failed
- **Cause**: CORS or URL mismatch
- **Solution**: Verify CORS settings and Socket.IO URL

#### 2. Token Expired
- **Cause**: Access token lifetime exceeded
- **Solution**: Automatic refresh via interceptor

#### 3. Email Not Sending
- **Cause**: Brevo API key or configuration
- **Solution**: Check BREVO_API_KEY and from address

#### 4. Database Connection Error
- **Cause**: Incorrect MongoDB URI
- **Solution**: Verify MONGODB_URI in .env

---

## Conclusion

AetherTrack SAAS is a comprehensive, production-ready task management system with integrated HR capabilities. The system leverages modern technologies and best practices to deliver a robust, scalable, and user-friendly platform.

### Key Strengths
✅ **Full-Stack Solution** - Complete backend and frontend
✅ **Real-time Capabilities** - Socket.IO integration
✅ **Comprehensive HR Module** - Attendance, leaves, holidays
✅ **Automated Workflows** - Email notifications, scheduled tasks
✅ **Role-Based Access** - Secure authorization
✅ **Modern Tech Stack** - React, Node.js, MongoDB
✅ **Production Ready** - Deployment configurations included
✅ **Scalable Architecture** - Modular design patterns

### System Status
🟢 **FULLY OPERATIONAL** - All features working and tested

---

**Document Version**: 1.0  
**Last Updated**: February 15, 2026  
**Prepared for**: AetherTrack SAAS Project
