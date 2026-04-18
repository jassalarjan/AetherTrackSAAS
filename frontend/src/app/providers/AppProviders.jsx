/**
 * AppProviders – centralises all global context providers.
 *
 * Import order matters (inner providers can depend on outer ones):
 *   ThemeProvider  (no deps)
 *     └─ ToastProvider  (no deps)
 *          └─ AuthProvider  (uses Toast)
 *               └─ NotificationsProvider (uses Auth + Socket)
 *                    └─ SidebarProvider  (uses Auth)
 *
 * Usage:
 *   <AppProviders>
 *     <App />
 *   </AppProviders>
 */
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastProvider } from '@/shared/components/ui/Toast';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { NotificationsProvider } from '@/features/notifications/hooks/useNotifications';
import { SidebarProvider } from '@/features/workspace/context/SidebarContext';

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
