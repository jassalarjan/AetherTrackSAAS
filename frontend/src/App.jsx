import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './routes/ProtectedRoute';
import useNotifications from './hooks/useNotifications';
import Login from './pages/Login';
import CommunityRegister from './pages/CommunityRegister';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Tasks from './pages/Tasks';
import Kanban from './pages/Kanban';
import Teams from './pages/Teams';
import UserManagement from './pages/UserManagement';
import CommunityUserManagement from './pages/CommunityUserManagement';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import ChangeLog from './pages/ChangeLog';
import Notifications from './pages/Notifications';
import ScreenshotDemo from './pages/ScreenshotDemo';
import AttendancePage from './pages/AttendancePage';
import SelfAttendance from './pages/SelfAttendance';
import HRCalendar from './pages/HRCalendar';
import LeavesPage from './pages/LeavesPage';
import HRDashboard from './pages/HRDashboard';
import VerificationSettings from './pages/VerificationSettings';
import GeofenceManagement from './pages/GeofenceManagement';
import AuditLog from './pages/AuditLog';
import EmailCenter from './pages/EmailCenter';
import ProjectDashboard from './pages/ProjectDashboard';
import MyProjects from './pages/MyProjects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectGantt from './pages/ProjectGantt';
import SprintManagement from './pages/SprintManagement';
import ResourceWorkload from './pages/ResourceWorkload';
import ReallocationDashboard from './pages/ReallocationDashboard';
import FeatureMatrix from './pages/FeatureMatrix';
import NotFound from './pages/NotFound';
import Workspace from './pages/Workspace';

function AppContent() {
  // Initialize notifications
  useNotifications();

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<CommunityRegister />} />
      <Route path="/register-community" element={<CommunityRegister />} />
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
          <ProtectedRoute allowedRoles={['admin', 'hr', 'team_lead', 'community_admin']}>
            <Teams />
          </ProtectedRoute>
        }
      />

      {/* Unified HR Dashboard */}
      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr', 'community_admin']}>
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

      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/community-users"
        element={
          <ProtectedRoute allowedRoles={['community_admin']}>
            <CommunityUserManagement />
          </ProtectedRoute>
        }
      />

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
          <ProtectedRoute allowedRoles={['admin']}>
            <FeatureMatrix />
          </ProtectedRoute>
        }
      />

      {/* Catch-all: show 404 page with sidebar for logged-in users */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SidebarProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              {/* Skip link - first focusable element per WCAG 2.2 */}
              <a 
                href="#main-content" 
                className="skip-link"
              >
                Skip to main content
              </a>
              <AppContent />
            </BrowserRouter>
          </SidebarProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;