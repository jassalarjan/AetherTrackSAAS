export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const normalizedAllowed = Array.isArray(allowedRoles) ? allowedRoles : [];
    // Prefer canonical systemRole when present, while preserving legacy role behavior.
    const currentRole = req.user.systemRole || req.user.role;
    const hasDirectRole = normalizedAllowed.includes(currentRole);
    const hasSuperAdminOverride = currentRole === 'super_admin' && normalizedAllowed.includes('admin');

    if (!hasDirectRole && !hasSuperAdminOverride) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: normalizedAllowed,
        current: currentRole
      });
    }

    next();
  };
};