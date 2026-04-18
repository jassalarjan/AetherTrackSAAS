import express from 'express';
import { checkRole } from '../middleware/roleCheck.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';
import ApiRequestLog from '../models/ApiRequestLog.js';
import getClientIP from '../utils/getClientIP.js';

const router = express.Router();

const METHOD_TO_OPERATION = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete'
};

router.post('/client-event', async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    if (!tenantId) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const {
      method,
      path,
      status_code,
      outcome,
      target_type,
      target_id,
      target_name,
      metadata
    } = req.body || {};

    const normalizedMethod = String(method || '').trim().toUpperCase();
    const normalizedPath = String(path || '').trim();
    if (!normalizedMethod || !normalizedPath) {
      return res.status(400).json({ message: 'method and path are required' });
    }

    const operation = METHOD_TO_OPERATION[normalizedMethod] || 'read';
    const normalizedOutcome = String(outcome || 'success').trim().toLowerCase() === 'failed' ? 'failed' : 'success';
    const parsedStatus = Number.isFinite(Number(status_code)) ? Number(status_code) : (normalizedOutcome === 'failed' ? 500 : 200);

    const moduleName = normalizedPath
      .replace(/^\/?api\/?/i, '')
      .replace(/^\//, '')
      .split('/')[0] || 'frontend';

    await ApiRequestLog.create({
      workspaceId: tenantId,
      user_id: normalizeObjectId(req.user?._id),
      user_email: req.user?.email || '',
      user_name: req.user?.full_name || req.user?.name || '',
      user_role: req.user?.role || '',
      method: normalizedMethod,
      path: normalizedPath,
      module: String(moduleName).toLowerCase(),
      operation,
      outcome: normalizedOutcome,
      status_code: parsedStatus,
      target_type: String(target_type || 'api_request').trim().toLowerCase(),
      target_id: target_id ? String(target_id).trim() : `${normalizedMethod} ${normalizedPath}`,
      target_name: target_name ? String(target_name).trim() : normalizedPath,
      ip: getClientIP(req),
      metadata: {
        source: 'frontend_client_event',
        ...(metadata && typeof metadata === 'object' ? metadata : {})
      }
    });

    res.locals.auditLogged = true;
    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to record client API log', error: err?.message });
  }
});

router.get('/', checkRole(['super_admin']), async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const includeAllWorkspaces = req.user?.systemRole === 'super_admin' || req.user?.role === 'super_admin';

    if (!tenantId && !includeAllWorkspaces) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const {
      page = 1,
      limit = 50,
      method,
      module,
      operation,
      outcome,
      status_code,
      start_date,
      end_date,
      search
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};
    if (!includeAllWorkspaces) query.workspaceId = tenantId;
    if (method) query.method = String(method).trim().toUpperCase();
    if (module) query.module = String(module).trim().toLowerCase();
    if (operation) query.operation = String(operation).trim().toLowerCase();
    if (outcome) query.outcome = String(outcome).trim().toLowerCase();

    if (status_code) {
      const parsedStatus = parseInt(status_code, 10);
      if (!Number.isNaN(parsedStatus)) query.status_code = parsedStatus;
    }

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    if (search) {
      const regex = new RegExp(String(search), 'i');
      query.$or = [
        { path: regex },
        { module: regex },
        { target_type: regex },
        { target_name: regex },
        { user_email: regex },
        { user_name: regex }
      ];
    }

    const [logs, total] = await Promise.all([
      ApiRequestLog.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      ApiRequestLog.countDocuments(query)
    ]);

    return res.json({
      logs,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch API request logs', error: err?.message });
  }
});

export default router;
