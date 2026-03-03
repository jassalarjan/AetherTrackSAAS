AetherTrackSAAS – UI/UX Design Summary (Essential)

1. Design System (What governs everything)

Stack





React 18 (component-driven UI)



Tailwind CSS (mobile-first, utility-first)



React Router v6 (routing)



Recharts (analytics & dashboards)



React Big Calendar (calendar views)



Lucide React (icons)

Themes





Light & Dark mode



5 selectable color schemes (Blue, Purple, Green, Orange, Pink)



Brand primary: #136dec

Typography





System sans-serif (Inter-like)



Headings: text-lg → text-2xl



Body: text-sm → text-base



Weights: 400–700

2. Core Layout Architecture (Structural backbone)

ResponsivePageLayout





Used across all authenticated pages



Sidebar + header + content



Mobile: single column, hamburger



Desktop: fixed sidebar, wide canvas



Optional title, subtitle, actions, max-width control

ResponsiveModal





Mobile: full-screen bottom sheet



Desktop: centered modal



Sizes: small / default / large / full



Accessible: ESC close, focus trap, scroll lock

Sidebar





Role-based navigation (admin, HR, lead, member)



Collapsible



Active route highlighting



Mobile overlay behavior

3. Page Groups & UX Patterns (What users actually experience)

Authentication





Login, Register, Forgot/Reset Password, Verify Email



Centered card layouts



Inline validation, loading states



Password strength enforcement



Token-based security flows

Dashboards





Operations Dashboard: KPIs, charts, task stats, exports



HR Dashboard: Attendance, leaves, calendar, email



Real-time updates



Empty states, filters, date ranges

Task Management





Task List: CRUD via modals, filters, pagination



Kanban: Drag & drop across 4 statuses



Calendar: Month/Week/Day/Agenda mapped from tasks



Live sync via Socket.io

HR & Attendance





Attendance table + calendar



Self-attendance with:





Photo capture



GPS capture



Geofence validation



Leaves: balances, requests, approvals



HR calendar: holidays + leaves

Project Management





Project dashboard (card grid)



Project detail with tabs (Overview, Tasks, Team, Docs, Settings)



Gantt chart for timelines



Sprint management + burndown



Resource workload visualization

Admin & System Control





Settings (Profile, Security, Appearance, Notifications)



User & Team management



Verification rules (photo/location toggles)



Geofence management (map-based)



Audit logs & change logs



Feature matrix (role-based access)



Email center (campaign wizard)

Utilities





Notifications (real-time)



Analytics (multi-chart dashboards)



Reallocation dashboard



404 and system status pages

4. Component Library (Reusable UI assets)

Core





TaskCard, Avatar, ProgressBar



Labels (Project, Sprint, Team)



PhotoCapture, LocationCapture



MapView



ConfirmModal

Layout





ResponsivePageLayout



ResponsiveModal



ResponsiveCard



ResponsiveGrid

All components are mobile-first, theme-aware, and reusable.

5. State & Data Flow (How UI stays sane)

Contexts





AuthContext – auth/session



ThemeContext – theme + colors



SidebarContext – layout state

Hooks





Real-time sync



Notifications



Verification



Shifts, meetings, confirmations

API Layer





Axios with interceptors



Modular APIs (attendance, projects, geofence)

6. Responsive & Mobile UX Rules





Mobile-first Tailwind breakpoints



Touch targets ≥ 44px



Tables scroll horizontally on mobile



Modals adapt (sheet → dialog)

7. Accessibility (Current state)





Keyboard navigable



ARIA labels on icon buttons



Modal focus trapping



Sufficient color contrast

Planned improvements





Skip links



Better focus indicators



Screen reader announcements



Reduced-motion support

Executive Snapshot





40+ screens, fully role-based



Single design system, themeable



Mobile-first, production-grade UX



Real-time, data-heavy, enterprise-ready



Highly modular, scalable frontend architecture

This UI/UX is not decorative—it is operational infrastructure. It prioritizes clarity, speed, and control across HR, operations, and project execution, while remaining extensible for future modules.

