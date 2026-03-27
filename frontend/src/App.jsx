import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AppProviders } from '@/app/providers/AppProviders';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import useNotifications from '@/features/notifications/hooks/useNotifications';
import { useMobileCapabilities } from '@/shared/hooks/useMobileCapabilities';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { useAppAutoUpdate } from '@/shared/hooks/useAppAutoUpdate';
import { getAccessToken } from '@/features/auth/services/tokenStore';
import { PageLoader } from '@/shared/components/ui/Spinner';
import { AppVersionIndicator } from '@/shared/components/ui/AppVersionIndicator';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';

// Auth pages – loaded eagerly (tiny, always needed at first paint)
import Login from '@/features/auth/pages/Login';
import VerifyEmail from '@/features/auth/pages/VerifyEmail';
import ForgotPassword from '@/features/auth/pages/ForgotPassword';
import ResetPassword from '@/features/auth/pages/ResetPassword';

// All other pages – lazy-loaded to keep initial bundle lean
const Workspace            = lazy(() => import('@/features/dashboard/pages/Workspace'));
const Tasks                = lazy(() => import('@/features/tasks/pages/Tasks'));
const Kanban               = lazy(() => import('@/features/tasks/pages/Kanban'));
const Teams                = lazy(() => import('@/features/workspace/pages/Teams'));
const UserManagement       = lazy(() => import('@/features/workspace/pages/UserManagement'));
const Analytics            = lazy(() => import('@/features/analytics/pages/Analytics'));
const Settings             = lazy(() => import('@/features/settings/pages/Settings'));
const Calendar             = lazy(() => import('@/features/calendar/pages/Calendar'));
const ChangeLog            = lazy(() => import('@/features/admin/pages/ChangeLog'));
const Notifications        = lazy(() => import('@/features/notifications/pages/Notifications'));
const ScreenshotDemo       = lazy(() => import('@/features/admin/pages/ScreenshotDemo'));
const AttendancePage       = lazy(() => import('@/features/hr/pages/AttendancePage'));
const SelfAttendance       = lazy(() => import('@/features/hr/pages/SelfAttendance'));
const HRCalendar           = lazy(() => import('@/features/hr/pages/HRCalendar'));
const LeavesPage           = lazy(() => import('@/features/hr/pages/LeavesPage'));
const HRDashboard          = lazy(() => import('@/features/hr/pages/HRDashboard'));
const VerificationSettings = lazy(() => import('@/features/hr/pages/VerificationSettings'));
const GeofenceManagement   = lazy(() => import('@/features/hr/pages/GeofenceManagement'));
const AuditLog             = lazy(() => import('@/features/admin/pages/AuditLog'));
const EmailCenter          = lazy(() => import('@/features/hr/pages/EmailCenter'));
const ProjectDashboard     = lazy(() => import('@/features/projects/pages/ProjectDashboard'));
const MyProjects           = lazy(() => import('@/features/projects/pages/MyProjects'));
const ProjectDetail        = lazy(() => import('@/features/projects/pages/ProjectDetail'));
const ProjectGantt         = lazy(() => import('@/features/projects/pages/ProjectGantt'));
const SprintManagement     = lazy(() => import('@/features/projects/pages/SprintManagement'));
const ResourceWorkload     = lazy(() => import('@/features/projects/pages/ResourceWorkload'));
const ReallocationDashboard = lazy(() => import('@/features/projects/pages/ReallocationDashboard'));
const FeatureMatrix        = lazy(() => import('@/features/admin/pages/FeatureMatrix'));
const MobileAppDownload    = lazy(() => import('@/features/admin/pages/MobileAppDownload'));
const NotFound             = lazy(() => import('@/app/pages/NotFound'));

function AppContent() {
  // Remove the native HTML preloader once React has mounted
  useEffect(() => {
    const el = document.getElementById('app-preloader');
    if (!el) return;
    el.classList.add('apl-hide');
    const timer = setTimeout(() => el.remove(), 420);
    return () => clearTimeout(timer);
  }, []);

  // Initialize notifications
  useNotifications();

  // Initialize mobile capabilities (safe no-op on web)
  useMobileCapabilities();
  useAppAutoUpdate();

  // Initialize push notifications once user is authenticated
  const { user } = useAuth();
  usePushNotifications({
    userId: user?.id,
    authToken: getAccessToken(),
  });

  // Global keyboard shortcuts: G→D/T/P/H/C/S navigation, ⌘/, ⌘\
  // ⌘K is handled separately in AppHeader to control the command palette state
  useKeyboardShortcuts({
    onCommandPalette: () => window.dispatchEvent(new CustomEvent('open-command-palette')),
  });

  return (
    <>
    <Suspense fallback={<PageLoader label="Loading page…" />}>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        }
      />


      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kanban"
        element={
          <ProtectedRoute>
            <Kanban />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-projects"
        element={
          <ProtectedRoute>
            <MyProjects />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/gantt"
        element={
          <ProtectedRoute>
            <ProjectGantt />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sprints"
        element={
          <ProtectedRoute>
            <SprintManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <ResourceWorkload />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr', 'team_lead']}>
            <Teams />
          </ProtectedRoute>
        }
      />

      {/* Unified HR Dashboard */}
      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <HRDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/attendance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr', 'team_lead', 'member']}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/calendar"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr', 'team_lead', 'member']}>
            <HRCalendar />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/leaves"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr', 'team_lead', 'member']}>
            <LeavesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/email-center"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <EmailCenter />
          </ProtectedRoute>
        }
      />

      {/* User Management - Admin & HR only */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* Analytics */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/:section"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/verification-settings"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <VerificationSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/geofence-management"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <GeofenceManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-log"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <AuditLog />
          </ProtectedRoute>
        }
      />

      <Route
        path="/self-attendance"
        element={
          <ProtectedRoute>
            <SelfAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/changelog"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ChangeLog />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/reallocation"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr', 'team_lead']}>
            <ReallocationDashboard />
          </ProtectedRoute>
        }
      />

      {/* Shift config lives inside Attendance — redirect old /hr/shifts URL */}
      <Route path="/hr/shifts" element={<Navigate to="/hr/attendance?tab=shifts" replace />} />

      {/* Screenshot Demo - Public route for capturing marketing screenshots */}
      <Route path="/screenshot-demo" element={<ScreenshotDemo />} />

      <Route
        path="/feature-matrix"
        element={
          <ProtectedRoute requireSystemAdmin>
            <FeatureMatrix />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mobile-app-download"
        element={
          <ProtectedRoute>
            <MobileAppDownload />
          </ProtectedRoute>
        }
      />

      {/* Legacy aliases kept for older quick links/bookmarks */}
      <Route path="/hr/self-attendance" element={<Navigate to="/self-attendance" replace />} />
      <Route path="/audit" element={<Navigate to="/audit-log" replace />} />
      <Route path="/geofence" element={<Navigate to="/geofence-management" replace />} />
      <Route path="/email-center" element={<Navigate to="/hr/email-center" replace />} />
      <Route path="/features" element={<Navigate to="/feature-matrix" replace />} />
      <Route path="/verification" element={<Navigate to="/verification-settings" replace />} />

      {/* Catch-all: show 404 page with sidebar for logged-in users */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    {/* Global version / update indicator — fixed floating badge */}
    <AppVersionIndicator />
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders>
        {/* Skip link - first focusable element per WCAG 2.2 */}
        <a
          href="#main-content"
          className="skip-link"
          style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', transform: 'translateY(calc(-100% - 32px))' }}
          onFocus={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.pointerEvents = 'auto'; e.currentTarget.style.transform = 'translateY(0)'; }}
          onBlur={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.pointerEvents = 'none'; e.currentTarget.style.transform = 'translateY(calc(-100% - 32px))'; }}
        >
          Skip to main content
        </a>
        <AppContent />
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;