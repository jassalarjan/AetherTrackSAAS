import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PageLoader } from '@/shared/components/ui/Spinner';

export const ProtectedRoute = ({ children, allowedRoles = [], requireSystemAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check if route requires system admin (admin with no workspace)
  if (requireSystemAdmin) {
    const isSystemAdmin = user.isSystemAdmin || user.role === 'super_admin' || (!user.workspaceId && user.role === 'admin');
    if (!isSystemAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};
