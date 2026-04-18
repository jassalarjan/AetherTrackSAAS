import express from 'express';
import { checkRole } from '../middleware/roleCheck.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';
import { logSystemAuditIssue } from '../services/systemAuditService.js';
import SystemAuditLog from '../models/SystemAuditLog.js';

const router = express.Router();

router.post('/errors', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    if (!tenantId) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const {
      level,
      category,
      message,
      request,
      error,
      metadata
    } = req.body || {};

    if (!String(message || '').trim()) {
      return res.status(400).json({ message: 'message is required' });
    }

    await logSystemAuditIssue({
      source: 'frontend',
      level,
      category,
      message,
      request,
      error,
      metadata,
      user: req.user,
      workspaceId: tenantId
    });

    res.locals.auditLogged = true;
    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to record audit error', error: err?.message });
  }
});

router.get('/logs', checkRole(['super_admin']), async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const includeAllWorkspaces = req.user?.systemRole === 'super_admin' || req.user?.role === 'super_admin';

    if (!tenantId && !includeAllWorkspaces) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const {
      page = 1,
      limit = 50,
      source,
      level,
      category,
      start_date,
      end_date,
      search,
      status_code
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};
    if (!includeAllWorkspaces) query.workspaceId = tenantId;
    if (source) query.source = String(source).trim().toLowerCase();
    if (level) query.level = String(level).trim().toLowerCase();
    if (category) query.category = String(category).trim().toLowerCase();

    if (status_code) {
      const parsedStatus = parseInt(status_code, 10);
      if (!Number.isNaN(parsedStatus)) query['request.status_code'] = parsedStatus;
    }

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    if (search) {
      const regex = new RegExp(String(search), 'i');
      query.$or = [
        { message: regex },
        { category: regex },
        { source: regex },
        { user_email: regex },
        { user_name: regex },
        { 'request.path': regex }
      ];
    }

    const [logs, total] = await Promise.all([
      SystemAuditLog.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      SystemAuditLog.countDocuments(query)
    ]);

    return res.json({
      logs,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch audit logs', error: err?.message });
  }
});

export default router;
