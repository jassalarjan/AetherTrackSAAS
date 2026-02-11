# 📘 AetherTrack SaaS - Comprehensive Project Documentation

> **Complete Technical Documentation and Developer Guide**
> 
> Version: 2.0 | Last Updated: February 2026

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Core Features & Modules](#core-features--modules)
6. [Database Architecture](#database-architecture)
7. [API Documentation](#api-documentation)
8. [Frontend Architecture](#frontend-architecture)
9. [Security & Authentication](#security--authentication)
10. [Real-time Features](#real-time-features)
11. [Email & Notification System](#email--notification-system)
12. [HR Management Module](#hr-management-module)
13. [Project & Sprint Management](#project--sprint-management)
14. [Analytics & Reporting](#analytics--reporting)
15. [Progressive Web App (PWA)](#progressive-web-app-pwa)
16. [Deployment Guide](#deployment-guide)
17. [Development Workflow](#development-workflow)
18. [Testing & Quality Assurance](#testing--quality-assurance)
19. [Troubleshooting](#troubleshooting)
20. [Future Roadmap](#future-roadmap)

---

## 🎯 Executive Summary

**AetherTrack** is a comprehensive, enterprise-grade SaaS task management and HR management platform designed for modern teams. Built with a microservices-inspired architecture, it provides complete workspace isolation, real-time collaboration, advanced analytics, and intelligent automation.

### Key Highlights

- 🏢 **Multi-tenant Architecture**: Complete workspace isolation with CORE (enterprise) and COMMUNITY (free) tiers
- 👥 **6-tier Role System**: Granular access control from System Admin to Team Member
- ⚡ **Real-time Collaboration**: Socket.IO powered instant updates across all clients
- 📊 **Advanced Analytics**: 11 comprehensive visualization charts with exportable reports
- 📧 **Intelligent Email System**: 11+ template types with dynamic rendering engine
- 🏃 **Agile Project Management**: Sprint planning, Gantt charts, Kanban boards
- 👨‍💼 **HR Management Suite**: Attendance tracking, leave management, holiday calendar
- 📱 **PWA Enabled**: Installable, offline-capable with push notifications
- 🎨 **Modern UI/UX**: Dark/light themes, responsive design, accessibility-first
- 🔒 **Enterprise Security**: JWT authentication, bcrypt encryption, audit logging

### Project Statistics

- **Lines of Code**: ~50,000+
- **Backend Routes**: 16 major route modules
- **Database Models**: 16 Mongoose schemas
- **Frontend Pages**: 45+ React components
- **API Endpoints**: 100+ RESTful endpoints
- **Real-time Events**: 15+ Socket.IO event types
- **Email Templates**: 11 professionally designed templates
- **Development Time**: 6+ months of active development

---

## 🌟 Project Overview

### Purpose

AetherTrack solves the challenge of fragmented team management by providing a unified platform that combines:
- Task and project management
- Human resources operations
- Team collaboration tools
- Analytics and business intelligence
- Automated workflow orchestration

### Target Audience

1. **Enterprises (CORE Workspaces)**
   - Unlimited users, tasks, and teams
   - Advanced features: Bulk imports, audit logging, custom reporting
   - Priority support and customization

2. **Small Teams (COMMUNITY Workspaces)**
   - Up to 10 users
   - Up to 100 tasks
   - Up to 3 teams
   - Core task management features
   - Self-service registration

### Business Model

- **Freemium**: Community workspaces are free forever
- **Enterprise**: CORE workspaces with unlimited resources
- **Feature Gating**: Advanced features restricted to CORE tier
- **Scalability**: System admin manages all workspaces from single dashboard

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Web Browser │  │ Mobile App   │  │ Desktop PWA  │         │
│  │  (React)     │  │ (PWA)        │  │ (Installed)  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ HTTPS / WSS
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                            ▼                                     │
│                   API GATEWAY / CORS                             │
│  ┌────────────────────────────────────────────────────┐         │
│  │           Express.js Application Server            │         │
│  │  ┌──────────────────────────────────────────────┐  │         │
│  │  │        Authentication Middleware              │  │         │
│  │  │   (JWT Verification, Refresh Tokens)          │  │         │
│  │  └──────────────────────────────────────────────┘  │         │
│  │  ┌──────────────────────────────────────────────┐  │         │
│  │  │     Workspace Context Middleware              │  │         │
│  │  │   (Multi-tenancy, Data Isolation)             │  │         │
│  │  └──────────────────────────────────────────────┘  │         │
│  │  ┌──────────────────────────────────────────────┐  │         │
│  │  │       Role-Based Access Control               │  │         │
│  │  │   (6-tier permission system)                  │  │         │
│  │  └──────────────────────────────────────────────┘  │         │
│  └────────────────────────────────────────────────────┘         │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         ▼                  ▼                  ▼                  │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐              │
│  │   REST   │      │ Socket.IO│      │   CRON   │              │
│  │   APIs   │      │ Real-time│      │Scheduler │              │
│  │ (100+ EP)│      │  Events  │      │ (Tasks)  │              │
│  └──────────┘      └──────────┘      └──────────┘              │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                   SERVICE LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Email     │  │    Brevo    │  │   Audit     │             │
│  │  Service    │  │   Service   │  │   Logger    │             │
│  │ (Nodemailer)│  │ (Templates) │  │ (ChangLog)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Report    │  │     HR      │  │  Workspace  │             │
│  │  Generator  │  │   Actions   │  │   Manager   │             │
│  │ (Excel/PDF) │  │  (Events)   │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     DATA LAYER                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │              MongoDB Atlas (Database)              │         │
│  │  ┌──────────────────────────────────────────────┐  │         │
│  │  │  Collections (16 Models):                    │  │         │
│  │  │  • Users, Teams, Tasks, Projects, Sprints   │  │         │
│  │  │  • Attendance, Leaves, Holidays, Leave Types│  │         │
│  │  │  • Notifications, Comments, ChangeLogs      │  │         │
│  │  │  • EmailTemplates, Workspaces, Recipients   │  │         │
│  │  └──────────────────────────────────────────────┘  │         │
│  │  ┌──────────────────────────────────────────────┐  │         │
│  │  │  Indexes: Workspace, User, Date, Status      │  │         │
│  │  │  Compound Indexes for performance            │  │         │
│  │  └──────────────────────────────────────────────┘  │         │
│  └────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                 EXTERNAL SERVICES                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Brevo    │  │   Cloudinary│  │    Render   │             │
│  │   (Email)   │  │   (Storage) │  │  (Hosting)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Vercel    │  │  MongoDB    │                               │
│  │  (Frontend) │  │    Atlas    │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Design Patterns

1. **MVC Architecture**: Model-View-Controller separation
2. **Middleware Chain**: Authentication → Context → Authorization → Route Handler
3. **Service Layer**: Business logic separated from route controllers
4. **Repository Pattern**: Mongoose models abstract database operations
5. **Observer Pattern**: Socket.IO event-driven real-time updates
6. **Strategy Pattern**: Multiple authentication strategies (JWT, refresh tokens)
7. **Factory Pattern**: Email template rendering, report generation

### Data Flow

#### Authentication Flow
```
User Login → Auth Route → JWT Generation → Token Storage (Cookie + LocalStorage) 
→ Subsequent Requests → JWT Middleware → Decode & Verify → Attach User to Request
→ Workspace Context → Scoped Data Access → Response
```

#### Task Creation Flow
```
User Creates Task → Frontend Validation → API Request → Authentication Middleware
→ Workspace Context → Role Check → Task Model Save → Audit Log Entry
→ Socket.IO Broadcast → All Connected Clients Updated → Email Notification (if needed)
→ Success Response → Frontend Update
```

---

## 💻 Technology Stack

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v18+ | JavaScript runtime environment |
| **Express.js** | v4.18 | Web application framework |
| **MongoDB** | v6.0+ | NoSQL database |
| **Mongoose** | v8.0 | MongoDB ODM (Object Data Modeling) |
| **Socket.IO** | v4.6 | Real-time bidirectional communication |
| **JWT** | v9.0 | JSON Web Token authentication |
| **bcryptjs** | v2.4 | Password hashing and encryption |
| **Nodemailer** | v7.0 | Email sending service |
| **@getbrevo/brevo** | v3.0 | Brevo API integration for transactional emails |
| **node-cron** | v4.2 | Scheduled task automation |
| **ExcelJS** | v4.4 | Excel file generation |
| **jsPDF** | v3.0 | PDF document generation |
| **Express Validator** | v7.0 | Request validation middleware |
| **cookie-parser** | v1.4 | Cookie parsing middleware |
| **cors** | v2.8 | Cross-Origin Resource Sharing |
| **dotenv** | v16.3 | Environment variable management |
| **multer** | v2.0 | File upload handling |

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | v18.2 | UI library for building user interfaces |
| **Vite** | v5.0 | Next-generation frontend build tool |
| **React Router** | v6.20 | Client-side routing |
| **Axios** | v1.6 | HTTP client for API requests |
| **TailwindCSS** | v3.3 | Utility-first CSS framework |
| **Recharts** | v3.3 | Composable charting library |
| **React Big Calendar** | v1.19 | Calendar component |
| **Lucide React** | v0.294 | Icon library (2000+ icons) |
| **Socket.IO Client** | v4.6 | Real-time client connection |
| **Framer Motion** | v12.23 | Animation library |
| **html2canvas** | v1.4 | Screenshot and DOM to canvas |
| **jsPDF AutoTable** | v5.0 | PDF table generation |
| **XLSX** | v0.18 | Excel file parsing and generation |
| **Moment.js** | v2.30 | Date manipulation library |
| **Workbox** | v7.3 | Service worker and PWA utilities |
| **vite-plugin-pwa** | v1.1 | PWA generation plugin |

### Development Tools

- **Nodemon** v3.0 - Auto-restart server on file changes
- **PostCSS** v8.4 - CSS transformation tool
- **Autoprefixer** v10.4 - Automatic vendor prefix addition
- **ESLint** - Code linting (configured)
- **Prettier** - Code formatting (configured)

### Infrastructure & Services

- **MongoDB Atlas** - Cloud-hosted database
- **Render** - Backend hosting platform
- **Vercel** - Frontend hosting platform
- **Brevo (Sendinblue)** - Transactional email service
- **Cloudinary** - Media storage (optional)
- **GitHub** - Version control and CI/CD

---

## 🎯 Core Features & Modules

### 1. Authentication & Authorization System

#### Features
- **JWT-based Authentication** with access and refresh tokens
- **6-tier Role System**:
  - 🔴 **System Admin**: Platform-wide access to all workspaces
  - 🟠 **Workspace Admin**: Full control within CORE workspace
  - 🟡 **Community Admin**: Limited admin for COMMUNITY workspaces
  - 🟢 **HR**: User and team management
  - 🔵 **Team Lead**: Team-level task management
  - ⚪ **Member**: Individual task management

- **Session Management**:
  - Configurable timeouts (30 min - 24 hours)
  - Inactivity detection with auto-logout
  - 5-minute warning before expiration
  - Tab visibility tracking
  - Activity-based timer reset

- **Security Features**:
  - Password hashing with bcrypt (10 rounds)
  - HTTP-only cookies for refresh tokens
  - Token expiration and rotation
  - IP address tracking (trust proxy)
  - CORS protection with origin validation

#### Implementation Details

**JWT Structure**:
```javascript
{
  userId: ObjectId,
  email: String,
  role: String,
  workspace: ObjectId (null for System Admin),
  iat: Number,
  exp: Number
}
```

**Authentication Middleware** (`middleware/auth.js`):
```javascript
// Verifies JWT from Authorization header or cookie
// Attaches decoded user to req.user
// Handles token expiration and refresh
```

**Workspace Context Middleware** (`middleware/workspaceContext.js`):
```javascript
// Extracts workspace from user token
// Adds workspaceId to req.workspaceId
// Enables multi-tenant data isolation
```

**Role Check Middleware** (`middleware/roleCheck.js`):
```javascript
// Validates user role against required roles
// Supports role hierarchies
// Blocks unauthorized access
```

### 2. Multi-Workspace Architecture

#### Workspace Types

| Feature | CORE Workspace | COMMUNITY Workspace |
|---------|----------------|---------------------|
| **Max Users** | Unlimited | 10 |
| **Max Tasks** | Unlimited | 100 |
| **Max Teams** | Unlimited | 3 |
| **Bulk User Import** | ✅ Yes | ❌ No |
| **Bulk User Delete** | ✅ Yes | ❌ No |
| **Audit Logs** | ✅ Yes | ❌ No |
| **Custom Reports** | ✅ Yes | ✅ Limited |
| **Email Templates** | ✅ Custom | ✅ Predefined |
| **Priority Support** | ✅ Yes | ❌ No |
| **Self-Registration** | ❌ No | ✅ Yes |
| **Cost** | Paid | Free Forever |

#### Workspace Isolation

**Database Level**:
- All models include `workspace` field
- Queries automatically scoped by `req.workspaceId`
- Compound indexes: `{workspace: 1, otherField: 1}`
- Prevents cross-workspace data leakage

**Application Level**:
```javascript
// Example: Task query with workspace scoping
const tasks = await Task.find({
  workspace: req.workspaceId,
  status: 'todo'
});
```

**Activation Control**:
- Workspaces can be activated/deactivated
- Deactivated workspaces block all user access
- System admins can toggle status via Workspace Management
- Visual indicators (green/red badges)

### 3. Task Management System

#### Task Lifecycle

```
Todo → In Progress → Review → Done
  ↑                              ↓
  └──────── Reopen ──────────────┘
```

#### Task Properties

```javascript
{
  title: String (required),
  description: String,
  status: Enum ['todo', 'in-progress', 'review', 'done'],
  priority: Enum ['low', 'medium', 'high', 'critical'],
  assignedTo: ObjectId (User),
  assignedBy: ObjectId (User),
  team: ObjectId (Team),
  project: ObjectId (Project),
  sprint: ObjectId (Sprint),
  dueDate: Date,
  tags: [String],
  attachments: [String],
  estimatedHours: Number,
  actualHours: Number,
  workspace: ObjectId (required),
  createdAt: Date,
  updatedAt: Date
}
```

#### Advanced Features

- **Comments System**: Threaded discussions on tasks
- **Status Tracking**: Automatic status change logging
- **Assignment History**: Track who assigned task to whom
- **Due Date Alerts**: Email notifications 24 hours before due
- **Overdue Detection**: Visual warnings for missed deadlines
- **Search & Filter**:
  - Full-text search across title, description, tags
  - Filter by status, priority, assignee, team, date range
  - Sort by due date, priority, created date
- **Bulk Operations**: Multi-select for status updates, deletions

### 4. Team Management System

#### Team Structure

```javascript
{
  name: String (required),
  description: String,
  lead: ObjectId (User),
  members: [ObjectId (User)],
  color: String (hex code),
  workspace: ObjectId (required),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Features

- **Team Creation**: Admins and HR can create teams
- **Team Lead Assignment**: Designate leaders with elevated permissions
- **Member Management**: Add/remove members dynamically
- **Team-based Views**: Filter tasks by team
- **Drag & Drop Reordering**: Visual team organization
- **Team Statistics**: 
  - Total tasks assigned
  - Completed tasks
  - Active members
  - Completion rate

### 5. User Management System

#### User Schema

```javascript
{
  fullName: String (required),
  email: String (required, unique per workspace),
  password: String (hashed),
  role: Enum ['system_admin', 'admin', 'community_admin', 'hr', 'team_lead', 'member'],
  team: ObjectId (Team),
  workspace: ObjectId (null for system_admin),
  avatar: String (URL or initials),
  isActive: Boolean,
  lastLogin: Date,
  preferences: {
    theme: String,
    notifications: Object,
    sessionTimeout: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Advanced Features

**Bulk User Import** (CORE workspaces only):
- Upload Excel/CSV files
- Automatic user creation
- Password generation
- Welcome email delivery
- Error handling for duplicates
- Validation and preview before import

**Bulk User Deletion** (CORE workspaces only):
- Multi-select users
- Confirmation dialog
- Cascade deletion (reassign tasks)
- Audit log entries

**User Activation**:
- Deactivate users without deletion
- Preserve historical data
- Block login for inactive users
- Reactivation support

### 6. Project Management Module

#### Project Structure

```javascript
{
  name: String (required),
  description: String,
  owner: ObjectId (User),
  team: ObjectId (Team),
  startDate: Date,
  endDate: Date,
  status: Enum ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
  budget: Number,
  progress: Number (0-100),
  workspace: ObjectId (required),
  sprints: [ObjectId (Sprint)],
  tasks: [ObjectId (Task)],
  createdAt: Date,
  updatedAt: Date
}
```

#### Features

- **Project Dashboard**: Overview of all projects
- **Project Details**: Deep dive into single project
- **Gantt Chart**: Visual timeline of tasks and milestones
- **Progress Tracking**: Automatic calculation based on task completion
- **Resource Allocation**: Team and budget management
- **Project Reports**: Export project summaries

### 7. Sprint Management Module

#### Sprint Structure

```javascript
{
  name: String (required),
  project: ObjectId (Project),
  startDate: Date (required),
  endDate: Date (required),
  goal: String,
  status: Enum ['planned', 'active', 'completed'],
  tasks: [ObjectId (Task)],
  velocity: Number,
  burndownData: [Object],
  workspace: ObjectId (required),
  createdAt: Date,
  updatedAt: Date
}
```

#### Features

- **Sprint Planning**: Create and configure sprints
- **Sprint Board**: Kanban view filtered by sprint
- **Burndown Charts**: Track sprint progress
- **Velocity Tracking**: Calculate team velocity
- **Sprint Reports**: Export sprint summaries
- **Sprint Retrospectives**: Document learnings

---

## 🗄️ Database Architecture

### MongoDB Collections (16 Models)

#### Core Collections

1. **Users** - User accounts and authentication
2. **Workspaces** - Multi-tenant workspace definitions
3. **Teams** - Team organization structure
4. **Tasks** - Task management core
5. **Projects** - Project groupings
6. **Sprints** - Agile sprint management
7. **Comments** - Task discussions
8. **Notifications** - User notification queue
9. **ChangeLogs** - Audit trail records

#### HR Module Collections

10. **Attendance** - Daily attendance tracking
11. **LeaveRequests** - Leave application management
12. **LeaveBalances** - User leave quota tracking
13. **LeaveTypes** - Leave type definitions
14. **Holidays** - Company holiday calendar
15. **EmailTemplates** - Email template definitions
16. **Recipients** - Email recipient tracking

### Indexing Strategy

#### Compound Indexes

```javascript
// Tasks
{ workspace: 1, status: 1 }
{ workspace: 1, assignedTo: 1 }
{ workspace: 1, dueDate: 1 }
{ workspace: 1, createdAt: -1 }

// Users
{ email: 1, workspace: 1 } (unique)
{ workspace: 1, role: 1 }

// Attendance
{ userId: 1, date: 1 } (unique)
{ workspace: 1, date: 1 }

// LeaveRequests
{ workspace: 1, userId: 1, status: 1 }
{ workspace: 1, startDate: 1, endDate: 1 }
```

#### Performance Considerations

- **Query Optimization**: All queries use indexed fields
- **Lean Queries**: `.lean()` for read-only operations
- **Projection**: Select only required fields
- **Pagination**: Implemented for large datasets
- **Aggregation**: Used for analytics and reporting

### Data Migration Scripts

Located in `backend/scripts/`:

- `seedAdmin.js` - Create default system admin
- `seedHRModule.js` - Initialize HR data (leave types, holidays)
- `migrateToWorkspaces.js` - Migrate legacy data to workspace model
- `assign-tasks-to-workspace.js` - Bulk workspace assignment
- `check-workspace-assignments.js` - Validate workspace integrity

---

## 🔌 API Documentation

### API Structure

**Base URL**: `http://localhost:5000/api` (development)

**Authentication**: Bearer token in Authorization header
```
Authorization: Bearer <JWT_TOKEN>
```

### Core API Routes

#### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Public |
|--------|----------|-------------|--------|
| POST | `/login` | User login | ✅ Yes |
| POST | `/register-community` | Community workspace registration | ✅ Yes |
| POST | `/refresh` | Refresh access token | ✅ Yes |
| POST | `/logout` | User logout | ❌ No |
| POST | `/forgot-password` | Request password reset | ✅ Yes |
| POST | `/reset-password` | Reset password with token | ✅ Yes |
| GET | `/verify-email` | Verify email address | ✅ Yes |

**Example: Login Request**
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}

Response:
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "user@example.com",
    "role": "member",
    "workspace": "507f1f77bcf86cd799439012"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### User Routes (`/api/users`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all workspace users | Any authenticated |
| GET | `/:id` | Get user by ID | Any authenticated |
| POST | `/` | Create new user | Admin, HR |
| POST | `/bulk-import` | Bulk import from Excel | Admin (CORE only) |
| PUT | `/:id` | Update user | Admin, HR, Self |
| DELETE | `/:id` | Delete user | Admin, HR |
| POST | `/bulk-delete` | Delete multiple users | Admin (CORE only) |
| GET | `/me` | Get current user | Any authenticated |
| PUT | `/me/preferences` | Update preferences | Any authenticated |

**Example: Bulk Import**
```javascript
POST /api/users/bulk-import
Content-Type: multipart/form-data

{
  file: <Excel file>
}

Excel Format:
| Full Name | Email | Role | Team |
|-----------|-------|------|------|
| John Doe  | john@example.com | member | Engineering |
| Jane Smith | jane@example.com | team_lead | Design |

Response:
{
  "success": true,
  "created": 2,
  "errors": [],
  "users": [...]
}
```

#### Task Routes (`/api/tasks`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all tasks (filtered) | Any authenticated |
| GET | `/:id` | Get task by ID | Task viewer |
| POST | `/` | Create new task | Any authenticated |
| PUT | `/:id` | Update task | Task owner/assignee |
| DELETE | `/:id` | Delete task | Admin, HR, Task owner |
| PATCH | `/:id/status` | Update task status | Assignee |
| POST | `/:id/assign` | Assign task to user | Admin, Team Lead |
| GET | `/overdue` | Get overdue tasks | Any authenticated |
| GET | `/my-tasks` | Get current user tasks | Any authenticated |
| GET | `/stats` | Get task statistics | Any authenticated |

**Example: Create Task**
```javascript
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "status": "todo",
  "priority": "high",
  "assignedTo": "507f1f77bcf86cd799439011",
  "team": "507f1f77bcf86cd799439012",
  "dueDate": "2026-02-15T00:00:00.000Z",
  "tags": ["backend", "security"],
  "estimatedHours": 8
}

Response:
{
  "success": true,
  "task": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Implement user authentication",
    ...
  }
}
```

#### Team Routes (`/api/teams`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all teams | Any authenticated |
| GET | `/:id` | Get team by ID | Any authenticated |
| POST | `/` | Create team | Admin, HR |
| PUT | `/:id` | Update team | Admin, HR |
| DELETE | `/:id` | Delete team | Admin, HR |
| POST | `/:id/members` | Add team member | Admin, HR |
| DELETE | `/:id/members/:userId` | Remove member | Admin, HR |
| GET | `/:id/stats` | Get team statistics | Any authenticated |

#### Project Routes (`/api/projects`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all projects | Any authenticated |
| GET | `/:id` | Get project by ID | Project viewer |
| POST | `/` | Create project | Admin, HR |
| PUT | `/:id` | Update project | Admin, Project owner |
| DELETE | `/:id` | Delete project | Admin |
| GET | `/:id/tasks` | Get project tasks | Project viewer |
| GET | `/:id/gantt` | Get Gantt chart data | Project viewer |
| PUT | `/:id/progress` | Update progress | Project owner |

#### Sprint Routes (`/api/sprints`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all sprints | Any authenticated |
| GET | `/:id` | Get sprint by ID | Sprint viewer |
| POST | `/` | Create sprint | Admin, Team Lead |
| PUT | `/:id` | Update sprint | Admin, Team Lead |
| DELETE | `/:id` | Delete sprint | Admin |
| POST | `/:id/tasks` | Add task to sprint | Team Lead |
| DELETE | `/:id/tasks/:taskId` | Remove task | Team Lead |
| GET | `/:id/burndown` | Get burndown data | Sprint viewer |

### HR Module Routes

#### Attendance Routes (`/api/hr/attendance`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get attendance records | HR, Self (filtered) |
| POST | `/checkin` | Check-in | Any authenticated |
| POST | `/checkout` | Check-out | Any authenticated |
| PUT | `/:id` | Override attendance | Admin, HR |
| GET | `/summary` | Get monthly summary | HR, Self |
| GET | `/user/:userId` | Get user attendance | HR, Self |

**Example: Check-in**
```javascript
POST /api/hr/attendance/checkin
Content-Type: application/json
Authorization: Bearer <token>

{
  "date": "2026-02-09"
}

Response:
{
  "success": true,
  "attendance": {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "date": "2026-02-09",
    "checkIn": "2026-02-09T09:00:00.000Z",
    "checkOut": null,
    "hoursWorked": 0,
    "status": "present"
  }
}
```

#### Leave Routes (`/api/hr/leaves`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get leave requests | HR, Self (filtered) |
| POST | `/` | Create leave request | Any authenticated |
| PATCH | `/:id/status` | Approve/reject leave | Admin, HR |
| DELETE | `/:id` | Cancel leave request | Self (if pending) |
| GET | `/balance` | Get leave balance | Any authenticated |
| GET | `/user/:userId` | Get user leaves | HR, Self |

#### Leave Type Routes (`/api/hr/leave-types`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all leave types | Any authenticated |
| POST | `/` | Create leave type | Admin, HR |
| PUT | `/:id` | Update leave type | Admin, HR |
| DELETE | `/:id` | Deactivate leave type | Admin |

#### Holiday Routes (`/api/hr/holidays`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all holidays | Any authenticated |
| POST | `/` | Create holiday | Admin, HR |
| PUT | `/:id` | Update holiday | Admin, HR |
| DELETE | `/:id` | Delete holiday | Admin, HR |
| GET | `/year/:year` | Get holidays by year | Any authenticated |

#### HR Calendar Routes (`/api/hr/calendar`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get calendar data | Any authenticated |
| GET | `/month/:year/:month` | Get month data | Any authenticated |

#### Email Template Routes (`/api/hr/email-templates`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all templates | Admin, HR |
| GET | `/:id` | Get template by ID | Admin, HR |
| POST | `/` | Create custom template | Admin, HR (CORE) |
| PUT | `/:id` | Update template | Admin, HR |
| DELETE | `/:id` | Delete custom template | Admin |

### Workspace Routes (`/api/workspaces`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get all workspaces | System Admin |
| GET | `/:id` | Get workspace by ID | System Admin |
| POST | `/` | Create workspace | System Admin |
| PUT | `/:id` | Update workspace | System Admin |
| DELETE | `/:id` | Delete workspace | System Admin |
| PATCH | `/:id/activate` | Activate workspace | System Admin |
| PATCH | `/:id/deactivate` | Deactivate workspace | System Admin |
| GET | `/:id/stats` | Get workspace stats | System Admin |

### Comment Routes (`/api/comments`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/task/:taskId` | Get task comments | Task viewer |
| POST | `/` | Create comment | Any authenticated |
| PUT | `/:id` | Update comment | Comment author |
| DELETE | `/:id` | Delete comment | Admin, Author |

### Notification Routes (`/api/notifications`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get user notifications | Any authenticated |
| GET | `/unread` | Get unread count | Any authenticated |
| PATCH | `/:id/read` | Mark as read | Any authenticated |
| PATCH | `/read-all` | Mark all as read | Any authenticated |
| DELETE | `/:id` | Delete notification | Any authenticated |

### ChangeLog Routes (`/api/changelog`)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/` | Get change logs | Admin |
| GET | `/user/:userId` | Get user actions | Admin |
| GET | `/entity/:entityType/:entityId` | Get entity history | Admin |
| POST | `/export` | Export logs (Excel) | Admin |

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App.jsx
├── AuthContext Provider
├── ThemeContext Provider
├── SocketContext Provider
└── Router
    ├── Public Routes
    │   ├── Landing.jsx
    │   ├── Login.jsx
    │   ├── CommunityRegister.jsx
    │   ├── ForgotPassword.jsx
    │   └── ResetPassword.jsx
    │
    └── Protected Routes
        ├── Dashboard.jsx
        ├── Task Management
        │   ├── Tasks.jsx (List View)
        │   ├── Kanban.jsx (Board View)
        │   └── Calendar.jsx (Calendar View)
        │
        ├── Project Management
        │   ├── MyProjects.jsx (Project List)
        │   ├── ProjectDashboard.jsx (Overview)
        │   ├── ProjectDetail.jsx (Single Project)
        │   ├── ProjectGantt.jsx (Gantt Chart)
        │   ├── SprintManagement.jsx (Sprint Board)
        │   └── ResourceWorkload.jsx (Resource View)
        │
        ├── Team Management
        │   ├── Teams.jsx
        │   └── UserManagement.jsx
        │
        ├── HR Module
        │   ├── HRDashboard.jsx
        │   ├── AttendancePage.jsx
        │   ├── LeavesPage.jsx
        │   ├── HRCalendar.jsx
        │   └── EmailCenter.jsx
        │
        ├── Analytics
        │   └── Analytics.jsx (11 Charts)
        │
        ├── System Admin
        │   ├── WorkspaceManagement.jsx
        │   └── ChangeLog.jsx
        │
        └── Settings
            ├── Settings.jsx
            └── Notifications.jsx
```

### State Management Strategy

#### Global State (Context API)

1. **AuthContext** (`context/AuthContext.jsx`)
   - User authentication state
   - Login/logout functions
   - Token management
   - User profile data

```javascript
{
  user: {
    id, fullName, email, role, workspace, avatar
  },
  isAuthenticated: Boolean,
  loading: Boolean,
  login: Function,
  logout: Function,
  updateUser: Function
}
```

2. **ThemeContext** (`context/ThemeContext.jsx`)
   - Theme mode (light/dark/auto)
   - Color scheme selection
   - Theme persistence

```javascript
{
  theme: 'light' | 'dark' | 'auto',
  colorScheme: 'purple' | 'blue' | 'green' | 'red' | 'slate',
  setTheme: Function,
  setColorScheme: Function
}
```

3. **SocketContext** (inline in App.jsx)
   - Socket.IO connection
   - Real-time event listeners
   - Connection state

#### Local State (useState, useReducer)

- Component-specific state
- Form inputs
- UI toggles (modals, dropdowns)
- Loading states

#### Server State (API Calls)

- Fetched data cached in component state
- Invalidation on mutations
- Optimistic updates for better UX

### Routing Structure

```javascript
// Public Routes
/                    → Landing Page
/login               → Login Page
/register-community  → Community Registration
/forgot-password     → Password Reset Request
/reset-password/:token → Password Reset Form

// Protected Routes
/dashboard           → Main Dashboard
/tasks               → Task List View
/kanban              → Kanban Board
/calendar            → Calendar View
/analytics           → Analytics Dashboard

// Project Management
/projects            → Project List
/project/:id         → Project Details
/project/:id/gantt   → Gantt Chart
/sprints             → Sprint Management
/resource-workload   → Resource & Workload View

// Team & User Management
/teams               → Team Management
/users               → User Management

// HR Module
/hr                  → HR Dashboard
/hr/attendance       → Attendance Tracking
/hr/leaves           → Leave Management
/hr/calendar         → HR Calendar
/hr/emails           → Email Center

// System Admin
/workspaces          → Workspace Management
/changelog           → Audit Logs

// Settings
/settings            → User Settings
/notifications       → Notification Preferences
```

### Custom Hooks

#### `useRealtimeSync.js`
```javascript
// Subscribes to Socket.IO events
// Automatically updates state on real-time events
// Handles disconnection and reconnection

Usage:
const { tasks, refreshTasks } = useRealtimeSync('tasks');
```

#### `useAuth.js`
```javascript
// Accesses AuthContext
// Provides user, login, logout functions

Usage:
const { user, logout } = useAuth();
```

#### `useTheme.js`
```javascript
// Accesses ThemeContext
// Provides theme, setTheme functions

Usage:
const { theme, setTheme } = useTheme();
```

### UI Component Library

#### Reusable Components

1. **Navbar.jsx** - Top navigation bar
2. **Sidebar.jsx** - Side navigation menu
3. **Avatar.jsx** - User avatar with initials
4. **Badge.jsx** - Status/priority badges
5. **Button.jsx** - Styled button variants
6. **Modal.jsx** - Popup dialog
7. **Dropdown.jsx** - Dropdown menu
8. **Table.jsx** - Data table with sorting
9. **Card.jsx** - Content card container
10. **LoadingSpinner.jsx** - Loading indicator
11. **Toast.jsx** - Notification toast
12. **ThemeToggle.jsx** - Theme switcher
13. **SearchBar.jsx** - Search input with icon

### Styling Approach

#### TailwindCSS Utilities

```javascript
// Example: Responsive card
<div className="
  bg-white dark:bg-gray-800
  rounded-lg shadow-md
  p-4 md:p-6
  hover:shadow-lg transition-shadow
  border border-gray-200 dark:border-gray-700
">
  Content
</div>
```

#### Custom Theme Classes

```css
/* tailwind.config.js */
theme: {
  extend: {
    colors: {
      primary: {
        50: '#f5f3ff',
        100: '#ede9fe',
        // ... purple shades
        900: '#4c1d95'
      }
    }
  }
}
```

#### Dark Mode Strategy

- Tailwind's `dark:` variant
- CSS variables for dynamic theming
- Automatic system preference detection
- Persistent user preference

---

## 🔒 Security & Authentication

### Security Measures

#### 1. Authentication Security

**JWT Implementation**:
```javascript
// Access Token: 15 minutes expiry
const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

// Refresh Token: 7 days expiry
const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
```

**Token Storage**:
- Access token: localStorage (for API calls)
- Refresh token: HTTP-only cookie (secure, prevents XSS)
- Tokens cleared on logout

**Token Rotation**:
- Refresh token used to get new access token
- Old refresh token invalidated on use
- Prevents token theft and replay attacks

#### 2. Password Security

**Hashing**:
```javascript
// bcrypt with 10 salt rounds
const hashedPassword = await bcrypt.hash(password, 10);
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- No common passwords (optional validation)

**Password Reset**:
- Time-limited reset tokens (1 hour)
- One-time use tokens
- Email verification required

#### 3. Authorization & Access Control

**Middleware Chain**:
```javascript
app.use('/api/tasks',
  authenticate,         // Verify JWT
  workspaceContext,     // Extract workspace
  roleCheck(['admin', 'member']), // Check roles
  taskRoutes           // Execute route
);
```

**Permission Matrix**:

| Action | System Admin | Admin | Community Admin | HR | Team Lead | Member |
|--------|--------------|-------|-----------------|-----|-----------|--------|
| View All Workspaces | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Workspace | ✅ | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ |
| Create Users | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Bulk Import | ✅ | ✅ (CORE) | ❌ | ✅ (CORE) | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Any Task | ✅ | ✅ | ✅ | ✅ | ⚠️ Team only | ❌ |

#### 4. Data Protection

**Workspace Isolation**:
```javascript
// Automatic workspace scoping in middleware
req.workspaceId = req.user.workspace;

// All queries filtered by workspace
const tasks = await Task.find({ workspace: req.workspaceId });
```

**Input Validation**:
```javascript
// Express Validator for all inputs
const { body, validationResult } = require('express-validator');

app.post('/api/tasks', [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('priority').isIn(['low', 'medium', 'high', 'critical'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

**SQL Injection Prevention**:
- Mongoose ODM prevents injection
- Parameterized queries
- Input sanitization

**XSS Prevention**:
- React escapes output by default
- Content Security Policy headers
- HTML sanitization for rich text

#### 5. CORS Configuration

```javascript
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://AetherTrack-nine-phi.vercel.app'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 6. Rate Limiting (Recommended)

```javascript
// Example with express-rate-limit
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

#### 7. Environment Variables

**Sensitive Data Protection**:
```env
# Never commit .env to version control
# Use strong, unique secrets in production

JWT_SECRET=<random 64-character string>
REFRESH_SECRET=<random 64-character string>
MONGODB_URI=<connection string with credentials>
EMAIL_PASSWORD=<app-specific password>
```

**Production Best Practices**:
- Use environment-specific `.env` files
- Rotate secrets regularly
- Use secret management services (AWS Secrets Manager, Vault)
- Enable 2FA for critical accounts

---

## ⚡ Real-time Features

### Socket.IO Implementation

#### Server Setup (`server.js`)

```javascript
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket']
});

// Make io accessible to routes
app.set('io', io);

// Connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Join user's personal room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});
```

#### Client Setup (`App.jsx`)

```javascript
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('🔌 Connected to server');
  if (user) {
    socket.emit('join', user.id);
  }
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});
```

### Real-time Events

#### Task Events

**Broadcast from Backend**:
```javascript
// When task is created
const io = req.app.get('io');
io.emit('task-created', {
  task: newTask,
  workspace: req.workspaceId
});

// When task is updated
io.emit('task-updated', {
  taskId: task._id,
  updates: updates,
  workspace: req.workspaceId
});

// When task is deleted
io.emit('task-deleted', {
  taskId: taskId,
  workspace: req.workspaceId
});

// When task status changes
io.emit('task-status-changed', {
  taskId: task._id,
  oldStatus: oldStatus,
  newStatus: newStatus,
  workspace: req.workspaceId
});
```

**Listen on Frontend**:
```javascript
useEffect(() => {
  socket.on('task-created', (data) => {
    if (data.workspace === user.workspace) {
      setTasks(prev => [data.task, ...prev]);
    }
  });

  socket.on('task-updated', (data) => {
    if (data.workspace === user.workspace) {
      setTasks(prev => prev.map(t => 
        t._id === data.taskId ? { ...t, ...data.updates } : t
      ));
    }
  });

  socket.on('task-deleted', (data) => {
    if (data.workspace === user.workspace) {
      setTasks(prev => prev.filter(t => t._id !== data.taskId));
    }
  });

  return () => {
    socket.off('task-created');
    socket.off('task-updated');
    socket.off('task-deleted');
  };
}, [user.workspace]);
```

#### User Events

```javascript
// Backend
io.emit('user-created', { user, workspace });
io.emit('user-updated', { userId, updates, workspace });
io.emit('user-deleted', { userId, workspace });

// Frontend
socket.on('user-created', handleUserCreated);
socket.on('user-updated', handleUserUpdated);
socket.on('user-deleted', handleUserDeleted);
```

#### Notification Events

```javascript
// Backend - Send to specific user
io.to(userId).emit('notification', {
  id: notification._id,
  type: 'task-assigned',
  message: 'You have been assigned a new task',
  taskId: task._id,
  timestamp: new Date()
});

// Frontend
socket.on('notification', (notification) => {
  // Show toast notification
  toast.info(notification.message);
  
  // Update notification count
  setUnreadCount(prev => prev + 1);
  
  // Show browser notification if enabled
  if (Notification.permission === 'granted') {
    new Notification('AetherTrack', {
      body: notification.message,
      icon: '/icons/icon-192x192.png'
    });
  }
});
```

### Auto-reconnection Strategy

```javascript
socket.on('connect_error', (error) => {
  console.log('🔴 Connection error:', error);
  // Fallback to HTTP polling
  socket.io.opts.transports = ['polling', 'websocket'];
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔄 Reconnected after', attemptNumber, 'attempts');
  // Re-sync data
  fetchLatestData();
});

socket.on('reconnect_failed', () => {
  console.log('❌ Reconnection failed');
  // Show offline indicator
  setIsOnline(false);
});
```

### Workspace Filtering

```javascript
// Only emit to users in same workspace
const workspaceUsers = await User.find({ 
  workspace: req.workspaceId,
  isActive: true 
});

workspaceUsers.forEach(user => {
  io.to(user._id.toString()).emit('event-name', data);
});
```

---

## 📧 Email & Notification System

### Email Service Architecture

#### 1. Nodemailer Service (`utils/emailService.js`)

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
};
```

#### 2. Brevo Email Service (`services/brevoEmailService.js`)

**Advanced Template System**:
- 11+ professional email templates
- Handlebars template rendering
- Dynamic variable substitution
- Responsive HTML design
- Tracking and analytics

**Template Categories**:
1. **Interview Invitation** - Initial interview scheduling
2. **Not Hired (Rejection)** - Rejection with community invitation
3. **Interview Update (Non-Attendee)** - Missed interview follow-up
4. **Reminder (Join Server)** - Server join reminder
5. **Interviewed (Team Choice)** - Post-interview team selection
6. **Not Interviewed (Team Choice)** - Alternative team options
7. **Leave Accepted** - Leave request approval
8. **Interview Rescheduled** - Interview date change
9. **Resignation Acknowledged** - Resignation confirmation
10. **Termination** - Formal termination notice
11. **Rejoining** - Re-invite former members

**Template Rendering**:
```javascript
import Handlebars from 'handlebars';
import fs from 'fs';

// Load and compile template
const templateSource = fs.readFileSync('template.html', 'utf8');
const template = Handlebars.compile(templateSource);

// Render with variables
const html = template({
  recipientName: 'John Doe',
  emailType: 'interview-invitation',
  headerText: 'Interview Invitation',
  bodyText: 'You are invited to attend an interview...',
  // 70+ variables supported
});
```

#### 3. HR Action Service (`services/hrActionService.js`)

**Pre-built Email Functions**:
```javascript
// Example: Send interview invitation
export const sendInterviewInvitation = async (candidateEmail, candidateName, details) => {
  const templateData = {
    recipientName: candidateName,
    emailType: 'interview-invitation',
    headerText: 'Interview Invitation',
    bodyText: `Dear ${candidateName}, You are invited to attend an interview...`,
    showDetailsCard: true,
    detailsCardTitle: 'Interview Details',
    detailsCardItems: [
      { label: 'Date', value: details.date },
      { label: 'Time', value: details.time },
      { label: 'Location', value: details.location },
      { label: 'Duration', value: details.duration }
    ],
    showCTA: true,
    ctaText: 'Confirm Attendance',
    ctaLink: details.confirmationLink
  };

  const htmlContent = emailTemplateService.renderTemplate(templateData);
  return brevoEmailService.sendEmail(candidateEmail, 'Interview Invitation', htmlContent);
};
```

### Notification System

#### Push Notification Service (`utils/notificationService.js`)

**Browser Notification API**:
```javascript
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('❌ Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showNotification = (title, options = {}) => {
  if (Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    ...options
  });

  notification.onclick = () => {
    window.focus();
    if (options.data?.url) {
      window.location.href = options.data.url;
    }
    notification.close();
  };
};
```

**Service Worker Push Notifications** (`public/sw-custom.js`):
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

#### Notification Types

| Type | Trigger | Recipients | Example |
|------|---------|------------|---------|
| **task-assigned** | Task assigned to user | Assignee | "You have been assigned: Fix login bug" |
| **task-updated** | Task details changed | Assignee, Creator | "Task updated: Design homepage" |
| **comment-added** | Comment on task | Assignee, Creator, Commenters | "New comment on: API integration" |
| **status-changed** | Task status updated | Assignee, Creator | "Task moved to Review: Payment gateway" |
| **due-date-reminder** | 24h before due | Assignee | "Task due tomorrow: Write documentation" |
| **overdue-alert** | Task overdue | Assignee, Team Lead | "Overdue: Database migration" |
| **leave-approved** | Leave request approved | Employee | "Your leave request has been approved" |
| **leave-rejected** | Leave request rejected | Employee | "Your leave request was not approved" |

#### Smart Notification Filtering

```javascript
// Only notify involved users
const notifyUsers = new Set([
  task.assignedTo?.toString(),
  task.assignedBy?.toString(),
  ...task.comments.map(c => c.author.toString())
]);

notifyUsers.forEach(userId => {
  if (userId !== req.user.id) { // Don't notify actor
    io.to(userId).emit('notification', notificationData);
  }
});
```

### Scheduled Email Automation

#### Cron Jobs (`utils/scheduler.js`)

```javascript
import cron from 'node-cron';

export const initializeScheduler = () => {
  // Daily overdue reminders at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🕐 Running daily overdue task reminder');
    
    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $ne: 'done' }
    }).populate('assignedTo');

    overdueTasks.forEach(async (task) => {
      await sendEmail(
        task.assignedTo.email,
        'Overdue Task Reminder',
        `You have an overdue task: ${task.title}`
      );
    });
  });

  // Weekly reports every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('📊 Generating weekly reports');
    
    const admins = await User.find({ role: { $in: ['admin', 'system_admin'] } });
    
    for (const admin of admins) {
      const report = await generateWeeklyReport(admin.workspace);
      await sendEmail(
        admin.email,
        'Weekly Task Report',
        report.html,
        [{ filename: 'weekly-report.xlsx', content: report.excel }]
      );
    }
  });

  // Due date reminders 24h before
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Checking tasks due tomorrow');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasksDueTomorrow = await Task.find({
      dueDate: {
        $gte: tomorrow.setHours(0, 0, 0, 0),
        $lt: tomorrow.setHours(23, 59, 59, 999)
      },
      status: { $ne: 'done' }
    }).populate('assignedTo');

    tasksDueTomorrow.forEach(async (task) => {
      await sendEmail(
        task.assignedTo.email,
        'Task Due Tomorrow',
        `Reminder: ${task.title} is due tomorrow`
      );
    });
  });
};
```

---

## 👨‍💼 HR Management Module

### Module Overview

The HR module provides comprehensive employee lifecycle management integrated directly into the task management platform.

### Features

#### 1. Attendance Tracking

**Daily Check-in/Check-out**:
```javascript
// Check-in
POST /api/hr/attendance/checkin
{
  "date": "2026-02-09"
}

// Auto-creates attendance record
{
  userId: ObjectId,
  date: "2026-02-09",
  checkIn: "2026-02-09T09:00:00Z",
  checkOut: null,
  hoursWorked: 0,
  status: "present"
}

// Check-out
POST /api/hr/attendance/checkout
{
  "date": "2026-02-09"
}

// Updates record and calculates hours
{
  checkOut: "2026-02-09T17:30:00Z",
  hoursWorked: 8.5
}
```

**Attendance Status Types**:
- ✅ **Present**: Normal working day
- ❌ **Absent**: No check-in/out
- ⚠️ **Half-day**: Less than 4 hours
- 🏖️ **Leave**: Approved leave day
- 🎉 **Holiday**: Company holiday

**Admin Override**:
```javascript
PUT /api/hr/attendance/:id
{
  "status": "present",
  "checkIn": "2026-02-09T09:00:00Z",
  "checkOut": "2026-02-09T17:00:00Z",
  "hoursWorked": 8,
  "remarks": "Manual entry - forgot to check-in"
}
```

**Monthly Summary**:
```javascript
GET /api/hr/attendance/summary?month=2&year=2026

Response:
{
  totalDays: 28,
  presentDays: 20,
  absentDays: 2,
  leaveDays: 3,
  holidays: 2,
  halfDays: 1,
  totalHours: 162.5,
  averageHours: 8.1
}
```

#### 2. Leave Management

**Leave Types**:
```javascript
{
  name: "Casual Leave",
  code: "CL",
  annualQuota: 12,
  carryForward: true,
  maxCarryForward: 5,
  requiresApproval: true,
  isPaid: true,
  isActive: true
}
```

**Leave Request Flow**:
```
Employee Creates Request → Pending Status → HR Reviews
                                           ↓
                                    Approve or Reject
                                           ↓
                              Leave Balance Updated
                                           ↓
                              Employee Notified via Email
```

**Leave Request Structure**:
```javascript
{
  userId: ObjectId,
  leaveType: ObjectId,
  startDate: Date,
  endDate: Date,
  totalDays: Number,
  reason: String,
  status: "pending" | "approved" | "rejected",
  approvedBy: ObjectId,
  approvedAt: Date,
  rejectionReason: String,
  workspace: ObjectId
}
```

**Leave Balance Tracking**:
```javascript
{
  userId: ObjectId,
  leaveType: ObjectId,
  year: 2026,
  totalQuota: 12,
  used: 5,
  pending: 2,
  available: 5,
  carriedForward: 3
}
```

**Auto-deduction Logic**:
```javascript
// On leave approval
const leaveBalance = await LeaveBalance.findOne({
  userId: request.userId,
  leaveType: request.leaveType,
  year: new Date().getFullYear()
});

leaveBalance.used += request.totalDays;
leaveBalance.available = leaveBalance.totalQuota - leaveBalance.used - leaveBalance.pending;
await leaveBalance.save();
```

#### 3. Holiday Management

**Holiday Structure**:
```javascript
{
  name: "Independence Day",
  date: "2026-07-04",
  type: "public" | "optional" | "regional",
  description: "National holiday",
  workspace: ObjectId,
  isActive: true
}
```

**Holiday Features**:
- Create annual holiday calendar
- Import holidays from CSV
- Public, optional, and regional categories
- Automatic attendance status updates
- Holiday warnings in attendance system

#### 4. HR Calendar

**Unified Calendar View**:
```javascript
GET /api/hr/calendar?month=2&year=2026

Response:
{
  attendance: [
    { date: "2026-02-01", status: "present", hoursWorked: 8 },
    { date: "2026-02-02", status: "absent" }
  ],
  leaves: [
    { startDate: "2026-02-10", endDate: "2026-02-12", type: "Sick Leave" }
  ],
  holidays: [
    { date: "2026-02-14", name: "Valentine's Day", type: "optional" }
  ]
}
```

**Calendar Features**:
- Monthly and weekly views
- Color-coded events
- Event details on click
- Role-based visibility (members see only their data)
- Export calendar to iCal/PDF

#### 5. Email Template Management

**Predefined Templates** (Immutable):
1. `LEAVE_REQUEST_SUBMITTED` - Notification to HR
2. `LEAVE_APPROVED` - Notification to employee
3. `LEAVE_REJECTED` - Notification to employee
4. `ATTENDANCE_REMINDER` - Missing check-in/out

**Custom Template Builder** (CORE workspaces):
```javascript
{
  name: "Probation Completion",
  type: "custom",
  subject: "Congratulations on completing probation",
  body: "Dear {{recipientName}},\n\nCongratulations...",
  variables: ["recipientName", "probationEndDate", "newDesignation"],
  workspace: ObjectId,
  isActive: true
}
```

**Variable Substitution**:
```javascript
const emailBody = template.body
  .replace('{{recipientName}}', employee.fullName)
  .replace('{{probationEndDate}}', formatDate(employee.probationEndDate))
  .replace('{{newDesignation}}', employee.designation);
```

---

## 📊 Project & Sprint Management

### Project Structure

```javascript
{
  name: "Mobile App Redesign",
  description: "Complete UI/UX overhaul of mobile application",
  owner: ObjectId (User),
  team: ObjectId (Team),
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  status: "active",
  budget: 50000,
  progress: 35,
  workspace: ObjectId,
  sprints: [ObjectId],
  tasks: [ObjectId]
}
```

### Sprint Management

**Sprint Creation**:
```javascript
POST /api/sprints
{
  "name": "Sprint 12 - User Profile",
  "project": "507f1f77bcf86cd799439011",
  "startDate": "2026-02-10",
  "endDate": "2026-02-24",
  "goal": "Implement user profile editing and settings"
}
```

**Sprint Features**:
- 2-week sprint cycles (configurable)
- Sprint backlog management
- Burndown charts
- Velocity tracking
- Sprint retrospectives

**Burndown Chart Data**:
```javascript
{
  date: "2026-02-10",
  planned: 40,
  actual: 40
},
{
  date: "2026-02-11",
  planned: 38,
  actual: 37
},
{
  date: "2026-02-12",
  planned: 36,
  actual: 35
}
// ... continues daily
```

### Gantt Chart

**Task Timeline Visualization**:
```javascript
GET /api/projects/:id/gantt

Response:
{
  tasks: [
    {
      id: "task1",
      title: "Design mockups",
      start: "2026-02-01",
      end: "2026-02-07",
      progress: 100,
      dependencies: []
    },
    {
      id: "task2",
      title: "Frontend implementation",
      start: "2026-02-08",
      end: "2026-02-21",
      progress: 60,
      dependencies: ["task1"]
    }
  ],
  milestones: [
    {
      date: "2026-02-28",
      title: "Beta Release"
    }
  ]
}
```

**Gantt Features**:
- Drag to adjust dates
- Task dependencies
- Milestone markers
- Critical path highlighting
- Resource allocation

### Resource & Workload View

**Capacity Planning**:
```javascript
GET /api/resource-workload

Response:
{
  teamMembers: [
    {
      user: { id, name, avatar },
      totalTasks: 15,
      inProgress: 5,
      completed: 8,
      overdue: 2,
      estimatedHours: 120,
      availableHours: 40,
      utilization: 75,
      projects: [
        { name: "Project A", tasks: 8 },
        { name: "Project B", tasks: 7 }
      ]
    }
  ],
  projects: [
    {
      name: "Project A",
      totalTasks: 45,
      assignedUsers: 6,
      progress: 65
    }
  ]
}
```

**Workload Features**:
- Team capacity overview
- Individual utilization rates
- Project distribution
- Overallocation warnings
- Rebalancing suggestions

---

## 📊 Analytics & Reporting

### 11 Comprehensive Charts

#### 1. Status Distribution (Pie Chart)
- Todo, In Progress, Review, Done breakdown
- Percentage and count labels
- Color-coded segments

#### 2. Priority Distribution (Bar Chart)
- Low, Medium, High, Critical counts
- Color-coded bars
- Horizontal layout

#### 3. Overdue Tasks by Priority (Bar Chart)
- Critical bottleneck analysis
- Urgency indicators
- Action recommendations

#### 4. 30-Day Completion Trend (Area Chart)
- Created vs Completed tasks
- Dual-line visualization
- Gradient fill

#### 5. User Performance (Grouped Bar Chart)
- Individual productivity metrics
- Assigned vs Completed
- Top performers highlighting

#### 6. Team Distribution (Multi-color Bar Chart)
- Tasks per team
- Color variety for distinction
- Team comparisons

#### 7. Weekly Progress (Line Chart) 🆕
- 8-week trend analysis
- Completion velocity
- Trend prediction

#### 8. Hourly Distribution (Bar Chart) 🆕
- 24-hour task creation patterns
- Peak hours identification
- Workload planning insights

#### 9. Task Age Distribution (Horizontal Bar Chart) 🆕
- Pending task analysis
- Age categories (< 1 week, 1-2 weeks, 2-4 weeks, > 1 month)
- Stale task identification

#### 10. Priority Trend (Stacked Area Chart) 🆕
- 12-week urgency evolution
- Priority shift visualization
- Forecasting workload changes

#### 11. Team Completion Rate (Bar Chart) 🆕
- Team efficiency comparison
- Completion percentages
- Performance benchmarking

### Report Generation

#### Excel Reports

**Task Report Structure**:
```javascript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();

// Summary Sheet
const summarySheet = workbook.addWorksheet('Summary');
summarySheet.addRow(['Total Tasks', taskStats.total]);
summarySheet.addRow(['Completed', taskStats.completed]);
summarySheet.addRow(['In Progress', taskStats.inProgress]);

// Task Details Sheet
const taskSheet = workbook.addWorksheet('Tasks');
taskSheet.columns = [
  { header: 'Title', key: 'title', width: 30 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Priority', key: 'priority', width: 15 },
  { header: 'Assignee', key: 'assignee', width: 20 },
  { header: 'Due Date', key: 'dueDate', width: 15 }
];

tasks.forEach(task => {
  taskSheet.addRow({
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee: task.assignedTo?.fullName,
    dueDate: formatDate(task.dueDate)
  });
});

// Export
const buffer = await workbook.xlsx.writeBuffer();
```

#### PDF Reports

**Comprehensive Report with Charts**:
```javascript
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const doc = new jsPDF();

// Title
doc.setFontSize(20);
doc.text('Task Report', 14, 20);

// Summary
doc.setFontSize(12);
doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

// Embed chart
const chartElement = document.getElementById('status-chart');
const canvas = await html2canvas(chartElement);
const imgData = canvas.toDataURL('image/png');
doc.addImage(imgData, 'PNG', 14, 40, 180, 90);

// Task table
doc.autoTable({
  startY: 140,
  head: [['Title', 'Status', 'Priority', 'Assignee']],
  body: tasks.map(t => [t.title, t.status, t.priority, t.assignee])
});

doc.save('task-report.pdf');
```

### Analytics Features

**Custom Date Ranges**:
```javascript
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onChange={(start, end) => {
    setStartDate(start);
    setEndDate(end);
    fetchAnalytics(start, end);
  }}
/>
```

**Filter Controls**:
- Status filter (multi-select)
- Priority filter (multi-select)
- Team filter (dropdown)
- User filter (dropdown)
- Date range filter (calendar picker)

**Export Options**:
- Export as Excel (all charts + data)
- Export as PDF (formatted report with charts)
- Export individual charts as PNG
- Schedule automated reports

---

## 📱 Progressive Web App (PWA)

### PWA Configuration

#### Manifest (`public/manifest.json`)

```json
{
  "name": "AetherTrack - Task Management",
  "short_name": "AetherTrack",
  "description": "Enterprise Task Management System",
  "theme_color": "#8b5cf6",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/dashboard",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Tasks",
      "url": "/tasks",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Kanban",
      "url": "/kanban",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

#### Service Worker (`public/sw-custom.js`)

**Caching Strategy**:
```javascript
const CACHE_NAME = 'aethertrack-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/tasks',
  '/kanban',
  '/offline.html',
  '/icons/icon-192x192.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response and cache it
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseToCache));
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            return cachedResponse || caches.match('/offline.html');
          });
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

**Push Notification Handling**:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'view', title: 'View', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

### PWA Features

**Installation Prompt**:
```javascript
// Capture beforeinstallprompt event
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

// Trigger installation
const installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('✅ PWA installed');
    }
    deferredPrompt = null;
  }
};
```

**Offline Detection**:
```javascript
window.addEventListener('online', () => {
  showToast('✅ Back online', 'success');
  syncPendingData();
});

window.addEventListener('offline', () => {
  showToast('⚠️ You are offline', 'warning');
});
```

**Background Sync**:
```javascript
// Register sync
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then((registration) => {
    return registration.sync.register('sync-tasks');
  });
}

// Service worker sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks());
  }
});

async function syncPendingTasks() {
  const pendingTasks = await getPendingTasksFromIndexedDB();
  for (const task of pendingTasks) {
    await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }
}
```

---

## 🚀 Deployment Guide

### Production Deployment

#### Backend Deployment (Render)

**render.yaml Configuration**:
```yaml
services:
  - type: web
    name: AetherTrack-backend
    env: node
    region: oregon
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASS
        sync: false
      - key: FRONTEND_URL
        value: https://your-app.vercel.app
```

**Deployment Steps**:
1. Push code to GitHub
2. Connect Render to repository
3. Configure environment variables
4. Deploy backend service
5. Note backend URL

#### Frontend Deployment (Vercel)

**vercel.json Configuration**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    {
      "src": "/[^.]+",
      "dest": "/",
      "status": 200
    }
  ],
  "env": {
    "VITE_API_URL": "https://your-backend.onrender.com/api",
    "VITE_SOCKET_URL": "https://your-backend.onrender.com"
  }
}
```

**Deployment Steps**:
1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy frontend
5. Custom domain setup (optional)

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aethertrack

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Brevo/Sendinblue)
BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM_NAME=AetherTrack
EMAIL_FROM_ADDRESS=noreply@aethertrack.com

# Email (SMTP - Alternative)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend
FRONTEND_URL=https://your-app.vercel.app

# Application
APP_NAME=AetherTrack
COMPANY_NAME=Your Company
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_APP_NAME=AetherTrack
```

### Database Setup

**MongoDB Atlas Configuration**:

1. **Create Cluster**
   - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create new cluster (M0 free tier)
   - Choose region closest to your backend

2. **Network Access**
   - Add IP: `0.0.0.0/0` (allow from anywhere) for Render
   - Or add Render's specific IPs

3. **Database User**
   - Create database user with read/write permissions
   - Use strong password

4. **Connection String**
   - Get connection string
   - Replace `<password>` with actual password
   - Set as `MONGODB_URI` in backend env

5. **Initial Data**
   - Run seeding scripts:
   ```bash
   npm run seed:admin
   node scripts/seedHRModule.js
   ```

### SSL/HTTPS Setup

- **Vercel**: Automatic SSL via Let's Encrypt
- **Render**: Automatic SSL included
- **Custom Domain**: Configure DNS records:
  - Vercel: A record → 76.76.21.21
  - Render: CNAME record → your-app.onrender.com

### Performance Optimization

**Backend**:
- Enable compression middleware
- Implement caching with Redis (optional)
- Use CDN for static assets
- Database indexing (already implemented)
- Rate limiting for API endpoints

**Frontend**:
- Code splitting with React.lazy
- Image optimization (WebP, lazy loading)
- Minification and tree-shaking (Vite default)
- Service worker caching
- Preload critical resources

---

## 🛠️ Development Workflow

### Setup for Local Development

#### Prerequisites
```bash
# Check versions
node --version  # Should be v18+
npm --version   # Should be v9+
git --version
```

#### Clone and Install
```bash
# Clone repository
git clone https://github.com/your-org/aethertrack.git
cd aethertrack

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run seed:admin
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with backend URL
npm run dev
```

### Git Workflow

**Branch Strategy**:
```
main (production)
  └─ develop (integration)
       ├─ feature/task-comments
       ├─ feature/hr-module
       ├─ bugfix/login-error
       └─ hotfix/security-patch
```

**Commit Conventions**:
```bash
feat: Add task comment functionality
fix: Resolve login authentication bug
docs: Update API documentation
style: Format code with Prettier
refactor: Restructure task routes
test: Add unit tests for user service
chore: Update dependencies
```

### Code Quality

**ESLint Configuration** (`.eslintrc.json`):
```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "react/prop-types": "off"
  }
}
```

**Prettier Configuration** (`.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Debugging

**Backend Debugging**:
```javascript
// Add debug logging
import debug from 'debug';
const log = debug('app:server');

log('Server started on port %d', PORT);
log('User %s created task %s', user.email, task.title);
```

**Frontend Debugging**:
```javascript
// React DevTools
// Redux DevTools (if using Redux)
// Console logging with categories
console.log('%c 🚀 Task Created', 'color: green; font-weight: bold', task);
console.error('%c ❌ API Error', 'color: red; font-weight: bold', error);
```

**Network Debugging**:
- Browser DevTools → Network tab
- Check request/response headers
- Verify JWT token in Authorization header
- Monitor Socket.IO connections

---

## 🧪 Testing & Quality Assurance

### Testing Strategy

#### Unit Tests (Backend)

**Example: User Service Test**:
```javascript
import { expect } from 'chai';
import { createUser, getUserById } from '../services/userService.js';

describe('User Service', () => {
  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        role: 'member',
        workspace: '507f1f77bcf86cd799439011'
      };

      const user = await createUser(userData);

      expect(user).to.have.property('_id');
      expect(user.fullName).to.equal('John Doe');
      expect(user.password).to.not.equal('Password123'); // Should be hashed
    });

    it('should reject duplicate email in same workspace', async () => {
      // Test duplicate prevention
    });
  });
});
```

#### Integration Tests (API)

**Example: Task API Test**:
```javascript
import request from 'supertest';
import app from '../server.js';

describe('Task API', () => {
  let authToken;

  before(async () => {
    // Login and get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    authToken = res.body.token;
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          priority: 'high'
        });

      expect(res.status).to.equal(201);
      expect(res.body.task).to.have.property('_id');
      expect(res.body.task.title).to.equal('Test Task');
    });

    it('should reject unauthorized requests', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task' });

      expect(res.status).to.equal(401);
    });
  });
});
```

#### Frontend Tests (React)

**Example: Component Test**:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../components/TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    _id: '1',
    title: 'Test Task',
    status: 'todo',
    priority: 'high'
  };

  it('renders task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onStatusChange when status is updated', () => {
    const mockOnStatusChange = jest.fn();
    render(<TaskCard task={mockTask} onStatusChange={mockOnStatusChange} />);
    
    fireEvent.click(screen.getByText('In Progress'));
    expect(mockOnStatusChange).toHaveBeenCalledWith('1', 'in-progress');
  });
});
```

### Manual Testing Checklist

#### Authentication
- ✅ User can login with valid credentials
- ✅ Invalid credentials show error
- ✅ Session expires after inactivity
- ✅ Refresh token renews access token
- ✅ Logout clears all tokens

#### Task Management
- ✅ Create task with all fields
- ✅ Update task details
- ✅ Change task status
- ✅ Delete task
- ✅ Add comment to task
- ✅ Assign task to user
- ✅ Filter tasks by status/priority
- ✅ Search tasks by keyword

#### Real-time Features
- ✅ Task updates sync across tabs
- ✅ Notifications appear in real-time
- ✅ Socket connection resilient to network issues

#### HR Module
- ✅ Check-in/check-out functionality
- ✅ Leave request submission
- ✅ Leave approval/rejection
- ✅ Leave balance calculation
- ✅ Calendar view displays all events

#### PWA
- ✅ Install prompt appears
- ✅ App works offline
- ✅ Service worker caches assets
- ✅ Push notifications work

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Won't Start

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**:
- Check MongoDB connection string in `.env`
- Verify MongoDB Atlas IP whitelist
- Ensure network connection
- Test connection: `node -e "require('./config/db.js')"`

#### 2. Frontend Can't Connect to Backend

**Error**: `Network Error` or `CORS Error`

**Solution**:
```javascript
// Check VITE_API_URL in frontend .env
VITE_API_URL=http://localhost:5000/api  // Should match backend URL

// Check CORS configuration in backend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173'  // Add your frontend URL
];
```

#### 3. JWT Authentication Failing

**Error**: `jwt malformed` or `invalid token`

**Solution**:
- Clear localStorage and cookies
- Check JWT_SECRET matches in .env
- Verify token format: `Bearer <token>`
- Check token expiration

#### 4. Socket.IO Not Connecting

**Error**: `WebSocket connection failed`

**Solution**:
```javascript
// Check VITE_SOCKET_URL
VITE_SOCKET_URL=http://localhost:5000

// Enable polling fallback
const socket = io(VITE_SOCKET_URL, {
  transports: ['polling', 'websocket']  // Polling first
});
```

#### 5. Emails Not Sending

**Error**: `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solution for Gmail**:
1. Enable 2-Factor Authentication
2. Generate App Password:
   - Google Account → Security → 2-Step Verification
   - App passwords → Generate
3. Use app password in EMAIL_PASSWORD

**Solution for Brevo**:
1. Get API key from Brevo dashboard
2. Set BREVO_API_KEY in .env
3. Verify sender email is authenticated

#### 6. Database Queries Slow

**Solution**:
- Check indexes: `db.tasks.getIndexes()`
- Add missing indexes:
```javascript
TaskSchema.index({ workspace: 1, status: 1 });
TaskSchema.index({ workspace: 1, assignedTo: 1 });
```
- Use `.lean()` for read-only queries
- Implement pagination for large datasets

#### 7. PWA Not Installing

**Solution**:
- Must use HTTPS (or localhost)
- Check manifest.json is accessible
- Verify service worker registration:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-custom.js')
    .then(reg => console.log('✅ SW registered', reg))
    .catch(err => console.error('❌ SW error', err));
}
```

#### 8. Real-time Updates Not Working

**Solution**:
- Check Socket.IO connection in browser console
- Verify workspace filtering:
```javascript
socket.on('task-created', (data) => {
  if (data.workspace === user.workspace) {
    // Update state
  }
});
```
- Check if user joined their room:
```javascript
socket.emit('join', user.id);
```

---

## 🔮 Future Roadmap

### Planned Features

#### Q1 2026
- ✅ **Completed**: HR Module with attendance and leave management
- ✅ **Completed**: Advanced analytics with 11 charts
- ✅ **Completed**: Mobile responsiveness improvements
- 🔄 **In Progress**: API rate limiting and security enhancements
- 📅 **Planned**: Time tracking and billing module
- 📅 **Planned**: Advanced permissions and custom roles

#### Q2 2026
- 📅 **Kanban Customization**: Custom columns and workflow
- 📅 **Integrations**: Slack, Microsoft Teams webhooks
- 📅 **AI Features**: Smart task assignment and predictions
- 📅 **Advanced Reporting**: Custom report builder
- 📅 **Multi-language Support**: Internationalization (i18n)

#### Q3 2026
- 📅 **Mobile Apps**: Native iOS and Android apps
- 📅 **Advanced Analytics**: Machine learning insights
- 📅 **Workflow Automation**: No-code automation builder
- 📅 **Document Management**: File storage and versioning
- 📅 **Video Conferencing**: Integrated video calls

#### Q4 2026
- 📅 **Enterprise SSO**: SAML, OAuth2 integration
- 📅 **Advanced Security**: Penetration testing, SOC 2 compliance
- 📅 **Performance**: Redis caching, database optimization
- 📅 **White-label**: Custom branding for enterprises
- 📅 **API Marketplace**: Third-party integrations

### Technical Debt

- Implement comprehensive unit test coverage (target: 80%)
- Add end-to-end tests with Cypress
- Refactor legacy components to modern React patterns
- Optimize bundle size with code splitting
- Implement API versioning for backward compatibility
- Add monitoring and logging with Sentry/LogRocket
- Database query optimization and caching
- Implement blue-green deployment

---

## 📚 Additional Resources

### Documentation Files

Located in project root:

#### Core Documentation
- `README.md` - Main project overview and quick start
- `COMPREHENSIVE_PROJECT_DOCUMENTATION.md` - This file (complete technical guide)
- `IMPLEMENTATION_SUMMARY.md` - Email system implementation
- `HR_MODULE_IMPLEMENTATION.md` - HR module technical guide

#### Feature Guides
- `DASHBOARD_FEATURES_FIXED.md` - Dashboard improvements
- `ANALYTICS_DASHBOARD_IMPROVEMENTS.md` - Analytics enhancements
- `NOTIFICATIONS_FIXED_README.md` - Notification system fixes
- `MOBILE_RESPONSIVENESS_IMPROVEMENTS.md` - Mobile optimization

#### Setup Guides
- `WORKSPACE_QUICK_START.md` - Community workspace setup
- `WORKSPACE_ACTIVATION_GUIDE.md` - Workspace activation control
- `BULK_USER_IMPORT_GUIDE.md` - Bulk import instructions
- `QUICK_START_NOTIFICATIONS.md` - 30-second notification test

#### API & Integration
- `API_REFERENCE_HR_MODULE.md` - HR API documentation
- `BREVO_MIGRATION_GUIDE.md` - Brevo email integration
- `EMAIL_VARIABLES_REFERENCE.md` - Email template variables
- `SYSTEM_INTEGRATION_GUIDE.md` - Backend integration

#### Migration & Deployment
- `MIGRATION_GUIDE.md` - System migration instructions
- `DEPLOYMENT_CHECKLIST.md` - Production deployment steps
- `RENDER.yaml` - Backend deployment configuration

### External Resources

- **MongoDB**: [docs.mongodb.com](https://docs.mongodb.com)
- **Express.js**: [expressjs.com](https://expressjs.com)
- **React**: [react.dev](https://react.dev)
- **Socket.IO**: [socket.io/docs](https://socket.io/docs)
- **TailwindCSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Recharts**: [recharts.org](https://recharts.org)

### Support Channels

- **GitHub Issues**: Report bugs and request features
- **Email**: support@aethertrack.com
- **Documentation**: Check project docs folder
- **Community**: Join Discord server (link TBD)

---

## 📄 License & Credits

### License

This project is proprietary software. All rights reserved.

Copyright © 2025-2026 AetherTrack. Unauthorized copying, distribution, or modification is prohibited.

### Credits

**Development Team**:
- Lead Developer: [Your Name]
- Backend Engineer: [Team Member]
- Frontend Engineer: [Team Member]
- UI/UX Designer: [Team Member]

**Technologies & Libraries**:
- Built with Node.js, Express, MongoDB, React, and Socket.IO
- Icons by Lucide React
- Charts by Recharts
- Email service by Brevo (Sendinblue)
- Hosting by Render and Vercel

**Special Thanks**:
- MongoDB Atlas for cloud database
- GitHub for version control
- Open source community for amazing libraries

---

## 🎓 Conclusion

AetherTrack represents a comprehensive, production-ready SaaS solution that combines task management, project planning, HR operations, and team collaboration into a unified platform. With its modern architecture, robust security, real-time capabilities, and extensive feature set, it serves as both a powerful business tool and a showcase of full-stack development best practices.

This documentation provides a complete technical overview suitable for:
- **Developers**: Understanding architecture and implementation
- **System Administrators**: Deployment and maintenance
- **Business Stakeholders**: Feature capabilities and roadmap
- **End Users**: Platform capabilities and usage

For specific implementation details, refer to the individual documentation files in the project root directory.

---

**Built with ❤️ for modern team collaboration**

*Last Updated: February 9, 2026*
