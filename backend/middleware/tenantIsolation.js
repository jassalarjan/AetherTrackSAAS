export const requireTenant = (req, res, next) => {
  const role = String(req.user?.systemRole || req.user?.role || '').toLowerCase();
  const isSuperAdmin = role === 'super_admin';

  const rawTenant = req.user?.workspaceId || req.user?.workspace_id || req.user?.workspace || null;
  const tenantId = rawTenant && typeof rawTenant === 'object' && rawTenant._id
    ? rawTenant._id
    : rawTenant;

  if (!tenantId && !isSuperAdmin) {
    return res.status(403).json({ message: 'Tenant context required' });
  }

  req.tenantId = tenantId ? String(tenantId) : null;
  return next();
};