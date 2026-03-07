# Architecture — AetherTrack SaaS Frontend
> Version: 2.0 (Feature-Based Architecture)  
> Author: Refactoring pass, 2026-03-06

---

## Overview

AetherTrack's frontend follows a **feature-based (domain-driven) architecture**. All application code lives within `frontend/src/` and is split into four layers:

```
frontend/src/
│
├── app/          ← Application bootstrap layer
├── features/     ← Business domain modules
├── shared/       ← Cross-cutting reusable primitives
└── styles/       ← Global stylesheets
```

---

## Layer Descriptions

### `app/`

Top-level application shell. Contains code that wires the whole app together.

```
app/
├── config/         ← App-level constants (env, feature flags)
├── layouts/        ← Root layout wrappers (e.g., AppShell)
├── pages/          ← App-level pages that don't belong to a domain (NotFound)
├── providers/
│   ├── AppProviders.jsx   ← Single provider tree wrapper
│   └── ThemeProvider.jsx  ← Global theme context
└── routes/
    └── ProtectedRoute.jsx ← Role-based route guard
```

`AppProviders` is the **single entry point** for all global context. Import order reflects provider dependency:

```
ThemeProvider
  └─ ToastProvider
       └─ AuthProvider
            └─ SidebarProvider
```

---

### `features/`

Each subdirectory represents one **business capability**. Features are isolated units.

```
features/
├── auth/
├── dashboard/
├── tasks/
├── projects/
├── hr/
├── notifications/
├── workspace/
├── analytics/
├── settings/
├── admin/
├── calendar/
└── landing/
```

Every feature **must** expose a public API through its `index.js` barrel. No code outside the feature may import from an internal path — only from the barrel.

---

### `shared/`

Reusable code used by **multiple features**. Nothing domain-specific lives here.

```
shared/
├── components/
│   ├── ui/          ← Primitive UI components (Button, Input, Dialog…)
│   ├── layout/      ← App-wide layout components (Sidebar, Navbar…)
│   └── responsive/  ← Responsive layout wrappers
├── hooks/           ← Generic custom React hooks
├── services/        ← Infrastructure services (axios instance, socket)
├── utils/           ← Pure utility functions (cn, dateNormalization)
├── constants/       ← Static data (pages.json, etc.)
└── types/           ← Shared TypeScript / JSDoc types
```

---

### `styles/`

All global CSS files consolidated in one location.

```
styles/
├── index.css               ← Base reset + root variables
├── animations.css          ← Keyframe animations
├── mobile-responsive.css   ← Global responsive overrides
├── design-tokens.css       ← Design token definitions
├── tokens.css              ← Tailwind-extended tokens
├── ui-system.css           ← UI system utilities
└── aethertrack-reference.css ← Design system reference
```

---

## Feature Domain Map

| Feature | Route Prefix | Key Pages | Description |
|---|---|---|---|
| `auth` | `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | Login, VerifyEmail, ForgotPassword, ResetPassword | Authentication flow |
| `dashboard` | `/dashboard` | Workspace | Main home dashboard after login |
| `tasks` | `/tasks`, `/kanban` | Tasks, Kanban | Task CRUD, kanban board |
| `projects` | `/projects`, `/sprints`, `/resources` | ProjectDashboard, ProjectDetail, ProjectGantt, SprintManagement, ResourceWorkload, ReallocationDashboard, MyProjects | Project management suite |
| `hr` | `/hr/*` | HRDashboard, AttendancePage, HRCalendar, LeavesPage, EmailCenter, VerificationSettings, GeofenceManagement, SelfAttendance | Human resources module |
| `notifications` | `/notifications` | Notifications | In-app notification inbox |
| `workspace` | `/teams`, `/users` | Teams, UserManagement | Team and user management |
| `analytics` | `/analytics` | Analytics | Reporting and analytics |
| `settings` | `/settings` | Settings | User and workspace settings |
| `admin` | `/audit-log`, `/changelog`, `/feature-matrix`, `/screenshot-demo` | AuditLog, ChangeLog, FeatureMatrix | Admin-only tools |
| `calendar` | `/calendar` | Calendar | Shared calendar view |
| `landing` | (public) | Hero, Pricing, etc. | Marketing/landing page |

---

## Data Flow

```
User action
     │
     ▼
Feature Component
     │ calls
     ▼
Feature Hook (use*.js)
     │ calls
     ▼
Feature Service (api/*.js) ───▶ shared/services/axios.js ───▶ API Server
     │ returns
     ▼
Feature State (useState/useReducer)
     │ updates
     ▼
Feature Component (re-render)
```

Global state (auth, theme, sidebar) flows through `app/providers/` contexts.

---

## Dependency Rules

```
app/          → can import from: features/*, shared/*
features/X/   → can import from: shared/*, @/ (other features via barrel ONLY)
shared/       → can import from: (external packages only)
styles/       → no imports
```

**Forbidden:**
- `features/A` importing directly from `features/B/internal/SomeFile`
- `shared/` importing from `features/`
- `app/` importing from deep feature internals

---

## Path Aliases

Configured in `vite.config.js`:

| Alias | Resolves to |
|---|---|
| `@/` | `src/` |
| `@features/` | `src/features/` |
| `@shared/` | `src/shared/` |
| `@app/` | `src/app/` |
| `@components/` | `src/shared/components/` |
| `@hooks/` | `src/shared/hooks/` |
| `@utils/` | `src/shared/utils/` |
| `@styles/` | `src/styles/` |

**Usage examples:**

```js
// ✅ Correct
import { useAuth } from '@/features/auth/context/AuthContext';
import { Button } from '@/shared/components/ui/Button';
import { Tasks } from '@/features/tasks';          // via barrel
import api from '@/shared/services/axios';

// ❌ Wrong
import { useAuth } from '../../context/AuthContext';
import { TaskCard } from '../../../components/TaskCard';
```
