/**
 * AppProviders – centralises all global context providers.
 *
 * Import order matters (inner providers can depend on outer ones):
 *   ThemeProvider  (no deps)
 *     └─ ToastProvider  (no deps)
 *          └─ AuthProvider  (uses Toast)
 *               └─ SidebarProvider  (uses Auth)
 *
 * Usage:
 *   <AppProviders>
 *     <App />
 *   </AppProviders>
 */
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastProvider } from '@/shared/components/ui/Toast';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { SidebarProvider } from '@/features/workspace/context/SidebarContext';

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
