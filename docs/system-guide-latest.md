# AetherTrack SaaS System Guide (Latest)

Last updated: 2026-03-16

## 1. System Summary
AetherTrack is a multi-tenant SaaS platform for work management and HR operations. It combines task/project execution, attendance and leave workflows, communication, analytics, and mobile-first operations in one product.

Primary app surfaces:
- Web app (React + Vite)
- Progressive Web App (PWA)
- Android/iOS wrappers via Capacitor

Core goals:
- Unified operational workspace for Admin, HR, Team Leads, and Members
- Real-time collaboration and notifications
- Secure, workspace-scoped access control and auditing

## 2. Tech Stack

### Frontend
- React 18 + Vite 5
- React Router DOM 6
- Tailwind CSS 3
- Axios for API access
- Socket.IO client for real-time events
- Recharts for analytics
- React Big Calendar for scheduling
- Leaflet + React Leaflet for map/geofence features
- Capacitor 8 for mobile shell and device APIs
- vite-plugin-pwa + Workbox for PWA support

### Backend
- Node.js + Express 4 (ESM)
- MongoDB + Mongoose 8
- Socket.IO server
- JWT auth (access + refresh flows)
- Helmet + CORS + express-rate-limit + xss for security hardening
- ExcelJS / jsPDF for report generation
- Nodemailer + Brevo integration for email workflows

## 3. High-Level Architecture

Client Layer:
- Browser/PWA and mobile wrappers call REST APIs and open Socket.IO connections.

Application Layer:
- Express REST routes provide business logic for auth, users, teams, tasks, projects, HR, settings, notifications.
- Socket.IO provides real-time updates and room-based event delivery.

Data/Service Layer:
- MongoDB for persistent domain data.
- Cloudinary for media storage.
- Brevo/SMTP for transactional email.

## 4. Frontend Application Structure

Main app routing is defined in [frontend/src/App.jsx](../frontend/src/App.jsx).

Primary route groups:
- Authentication: login, verify-email, reset flows
- Workspace and tasks: dashboard, tasks, kanban
- Projects: project dashboard, detail, gantt, sprints, resource workload, reallocation
- HR: dashboard, attendance, calendar, leaves, email center, geofence management
- Admin/Platform: users, settings, audit log, changelog, analytics

Shared platform capabilities initialized in App:
- Global keyboard shortcuts
- Notifications hooks
- Mobile capabilities hooks
- Auto update hook

## 5. Backend Services and API Surface

Server bootstrap and route registration are in [backend/server.js](../backend/server.js).

Main route prefixes:
- /api/auth
- /api/users
- /api/teams
- /api/tasks
- /api/projects
- /api/sprints
- /api/comments
- /api/notifications
- /api/changelog
- /api/hr/attendance
- /api/geofences
- /api/hr/leaves
- /api/hr/leave-types
- /api/hr/holidays
- /api/hr/calendar
- /api/hr/email-templates
- /api/hr/meetings
- /api/hr/shifts
- /api/hr/reallocation
- /api/settings
- /api/app-version
- /api/health

Backend characteristics:
- Global authentication middleware for protected routes
- Strict CORS allowlist strategy in production
- Socket authentication through JWT verification middleware
- Health endpoint for runtime checks
- Version notify endpoint for client update signaling

## 6. Security Model

Authentication and sessions:
- Access token + refresh flow
- Frontend interceptor refreshes on 401
- Refresh throttling/rate limit handling included

Authorization:
- Role-based route protection in both frontend and backend
- Workspace and role checks for sensitive endpoints

Hardening controls:
- Helmet security headers
- CORS allowlist enforcement
- Rate limiting and input validation
- XSS sanitization controls
- Environment variable validation at backend startup

## 7. Real-Time and Notifications

Socket.IO:
- Server authenticates each socket with JWT
- Users auto-join scoped rooms
- Room join authorization checks for team/project rooms

Notification paths:
- In-app real-time notifications
- Browser/system notifications where allowed
- Mobile push via Capacitor integrations

## 8. HR and Workforce Modules

Attendance and verification:
- Shift-aware attendance processing
- Geofence route support and location checks
- Verification and audit capabilities

Leave and scheduling:
- Leave requests + approval flows
- Leave types and holiday calendars
- HR calendar and meetings support

Workforce operations:
- Task reallocation workflows for leave periods
- HR email template center

## 9. Project and Delivery Modules

Execution:
- Task lifecycle with status progression
- Team ownership and assignment workflows
- Sprint and workload planning
- Gantt/project timeline views

Reporting and visibility:
- Analytics dashboards
- Export-ready reporting artifacts

## 10. Deployment and Runtime Notes

### Frontend scripts
Defined in [frontend/package.json](../frontend/package.json):
- npm run dev
- npm run build
- npm run preview

### Backend scripts
Defined in [backend/package.json](../backend/package.json):
- npm run dev
- npm run start

### Health checks
- API health: /api/health
- App version: /api/app-version

### Environment expectations
Backend requires (minimum):
- JWT_SECRET
- MONGODB_URI

Production additionally requires secure origin configuration and refresh secret settings as enforced by startup validation.

## 11. Current Operational Baseline (March 2026)
Recent stabilization work applied in current codebase:
- HR Calendar sidebar visibility behavior aligned with shell mode routing
- Geofence modal rendering corrected to avoid layout-constrained positioning issues
- Reallocation dashboard frontend request shape aligned with backend pending endpoint requirements
- Auth bootstrap refresh flow hardened to avoid duplicate strict-mode refresh spikes and reduce 429 bursts
- Keyboard shortcut handling guarded against undefined key edge cases

## 12. Recommended Next Enhancements
1. Add centralized API contract docs for each route group (request/response schemas).
2. Add frontend error boundary strategy per route group for resilient UX.
3. Add backend structured logging correlation IDs for cross-service traceability.
4. Add a deployment checklist doc for environment parity across dev/staging/prod.
5. Add end-to-end smoke tests for auth refresh, HR calendar, geofence, and reallocation flows.

---
This guide is intended as the current system-level reference for architecture, modules, and operations.
