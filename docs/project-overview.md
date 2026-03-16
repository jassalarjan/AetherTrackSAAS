# AetherTrack — Project Overview

## Project Name
**AetherTrack**

## What Is AetherTrack?
AetherTrack is a **multi-tenant SaaS Team Management System** built for real-world businesses. It consolidates workforce operations — project delivery, task tracking, HR management, attendance, leave, and internal communications — into a single platform accessible from web, Android, and iOS.

It is built for organizations that need to manage their people and work in one place, without stitching together five separate tools.

## Problems It Solves
| Business Problem | AetherTrack Solution |
|---|---|
| Teams using separate tools for tasks, HR, and comms | Unified platform covering all three domains |
| Manual or paper-based attendance with no accountability | GPS + photo verified check-in/out with shift-aware metrics |
| No visibility into leave balances or approval status | Structured leave request and approval workflow with balances |
| HR decisions made with no paper trail | Immutable audit log covering every HR and system action |
| Field/remote employees hard to manage | Mobile app (Android/iOS) with geofence enforcement |
| Reporting done manually in spreadsheets | Automated weekly Excel + PDF reports emailed to managers |
| No real-time awareness of task progress | Socket.IO live updates across all connected devices |

## Who Uses It
| Role | Who They Are | What They Can Do |
|---|---|---|
| `admin` | Business owner / System administrator | Full access — users, billing, workspace config, audit |
| `hr` | HR manager / HR officer | Attendance, leaves, shifts, email center, employee records |
| `team_lead` | Department head / Project manager | Projects, tasks, sprint planning, team member management |
| `member` | Employee / Team member | Own tasks, self check-in/out, leave requests, notifications |
| `community_admin` | Workspace-scoped administrator | Admin privileges scoped to a specific sub-workspace |

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 4.x |
| Database | MongoDB via Mongoose 8 |
| Real-time | Socket.IO 4 |
| Auth | JWT (access 15 min + refresh 7 days, httpOnly cookies) |
| Email | Brevo (API + SMTP fallback via Nodemailer) |
| File Storage | Cloudinary |
| Rate Limiting | express-rate-limit |
| Security | helmet, xss, bcryptjs, express-validator |
| Scheduling | node-cron |
| Reports | ExcelJS + jsPDF + jspdf-autotable |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS 3 + custom design tokens |
| Animations | Framer Motion |
| Charts | Recharts |
| Calendar | react-big-calendar |
| Maps | Leaflet + react-leaflet |
| HTTP | Axios (with token refresh interceptor) |
| Real-time | Socket.IO client |
| Mobile | Capacitor 8 (iOS/Android wrapper) |
| Push Notifications | Capacitor PushNotifications (FCM) |
| OTA Updates | @capgo/capacitor-updater |
| PWA | vite-plugin-pwa + Workbox |
| PDF/Excel export | jsPDF + xlsx |

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Client Layer                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Web (PWA)   │  │ Android APK  │  │   iOS (Cap.)  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         └─────────────────┴──────────────────┘          │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS + WebSocket
┌────────────────────────▼─────────────────────────────────┐
│  Backend (Node.js / Express)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ REST API │  │Socket.IO │  │ Cron Jobs│  │ Helmet  │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
   ┌─────────┐    ┌────────────┐    ┌──────────────┐
   │ MongoDB │    │  Cloudinary│    │  Brevo Email │
   └─────────┘    └────────────┘    └──────────────┘
```

## Core Modules

### Work Management
| Module | Description |
|---|---|
| **Tasks** | Full task lifecycle — create, assign, prioritize, Kanban board, comments, real-time sync |
| **Projects** | Project planning with Gantt chart, sprint management, document storage, member roles |
| **Sprints** | Time-boxed iteration planning linked to projects with progress tracking |
| **Meetings** | Schedule meetings with conflict detection, attendees, agendas, and notes |
| **Analytics** | KPI dashboards, status distributions, auto-generated weekly Excel + PDF reports |

### Workforce Management (HR)
| Module | Description |
|---|---|
| **Attendance** | GPS + photo verified check-in/out, shift-aware hours calculation, admin review queue |
| **Leave Management** | Leave requests, configurable types, balance tracking, approval workflow with email notifications |
| **Shift Management** | Define shifts, assign individually or via rotation rules, night-shift support |
| **Geofence Management** | Define location boundaries; enforce or audit employee check-in proximity |
| **HR Email Center** | 20+ lifecycle email templates (hire, leave, termination, etc.) dispatched via Brevo |
| **HR Calendar** | Unified visibility of holidays, leaves, and attendance events |

### Platform
| Module | Description |
|---|---|
| **Authentication** | Secure login, email verification, JWT token rotation, password reset |
| **Users & Teams** | Employee directory, role management, bulk import from Excel/JSON |
| **Notifications** | In-app real-time alerts + FCM push notifications on Android/iOS |
| **Settings** | 13-panel workspace and user configuration including billing and webhooks |
| **Audit Log** | Tamper-evident system-wide event log with export and filtering |
| **Settings** | User preferences, workspace config, webhooks, billing panel |
| **Audit / Changelog** | System-wide event log with filtering and export |
