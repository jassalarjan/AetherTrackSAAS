import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import { getChangeLogs, getChangeLogStats, exportChangeLogs } from '../utils/changeLogService.js';
import ChangeLog from '../models/ChangeLog.js';
import ChangelogEntry from '../models/ChangelogEntry.js';
import ApiRequestLog from '../models/ApiRequestLog.js';
import { TRIGGER_MANIFEST } from '../constants/triggerManifest.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';
import { logChange } from '../utils/changeLogService.js';
import getClientIP from '../utils/getClientIP.js';

const router = express.Router();

const KNOWN_TARGET_TYPES = [
  'attendance',
  'auth',
  'automation',
  'comment',
  'email',
  'email_template',
  'external_recipient',
  'holiday',
  'leave_request',
  'leave_type',
  'meeting',
  'notification',
  'project',
  'reallocation',
  'report',
  'report_automation',
  'settings',
  'shift',
  'sprint',
  'system',
  'task',
  'team',
  'user',
  'verification'
];

// Automation changelog trigger definitions (tenant-agnostic static manifest)
router.get('/trigger-types', authenticate, async (_req, res) => {
  res.json(TRIGGER_MANIFEST);
});

router.post('/client-event', authenticate, async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    if (!tenantId) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const {
      event_type,
      action,
      target_type,
      target_id,
      target_name,
      description,
      metadata
    } = req.body || {};

    const normalizedAction = String(action || '').trim();
    const normalizedTargetType = String(target_type || '').trim().toLowerCase();

    if (normalizedAction === 'FRONTEND_API_REQUEST' || normalizedTargetType === 'api_request') {
      const methodFromMeta = String(metadata?.method || '').trim().toUpperCase();
      const targetIdText = String(target_id || '').trim();
      const methodFromTarget = targetIdText.split(' ')[0]?.toUpperCase();
      const method = methodFromMeta || (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(methodFromTarget) ? methodFromTarget : 'GET');

      const pathFromMeta = String(metadata?.path || '').trim();
      const pathFromTarget = targetIdText.replace(/^[A-Z]+\s+/, '').trim();
      const requestPath = pathFromMeta || String(target_name || '').trim() || pathFromTarget || '/unknown';

      const operationMap = { GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
      const statusCode = Number.isFinite(Number(metadata?.status_code)) ? Number(metadata.status_code) : 200;
      const outcome = statusCode >= 400 ? 'failed' : 'success';

      await ApiRequestLog.create({
        workspaceId: tenantId,
        user_id: normalizeObjectId(req.user?._id),
        user_email: req.user?.email || '',
        user_name: req.user?.full_name || req.user?.name || '',
        user_role: req.user?.role || '',
        method,
        path: requestPath,
        module: String(requestPath).replace(/^\/?api\/?/i, '').replace(/^\//, '').split('/')[0] || 'frontend',
        operation: operationMap[method] || 'read',
        outcome,
        status_code: statusCode,
        target_type: 'api_request',
        target_id: targetIdText || `${method} ${requestPath}`,
        target_name: String(target_name || requestPath).trim(),
        ip: getClientIP(req),
        metadata: {
          source: 'client_event_rerouted_from_changelog',
          original_event_type: event_type,
          original_description: description,
          ...(metadata && typeof metadata === 'object' ? metadata : {})
        }
      });

      res.locals.auditLogged = true;
      return res.status(201).json({ success: true, stream: 'api_logs' });
    }

    if (!String(event_type || '').trim()) {
      return res.status(400).json({ message: 'event_type is required' });
    }
    if (!String(action || '').trim()) {
      return res.status(400).json({ message: 'action is required' });
    }

    await logChange({
      event_type,
      user: req.user,
      user_ip: getClientIP(req),
      action,
      target_type: String(target_type || 'report').trim(),
      target_id: target_id ? String(target_id).trim() : undefined,
      target_name: target_name ? String(target_name).trim() : undefined,
      description: description
        ? String(description).trim()
        : `${req.user?.full_name || req.user?.email || 'User'} performed ${String(action).trim()}`,
      workspaceId: tenantId,
      metadata: {
        source: 'client_event',
        ...(metadata && typeof metadata === 'object' ? metadata : {})
      }
    });

    res.locals.auditLogged = true;
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record client event', error: error?.message });
  }
});

/**
 * @route   GET /api/changelog
 * @desc    Get change logs with filters and pagination (Admin only)
 * @access  Private (Admin + CORE workspace OR System Admin)
 */
router.get('/', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      entityType,
      action,
      includeAudit = 'true',
      dateRange,
      startDate,
      endDate
    } = req.query;
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    if (!tenantId) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const parsedPage = Math.max(parseInt(page, 10), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { tenantId };
    if (entityType) query.entityType = entityType;
    if (action) query.action = action;

    if (dateRange || startDate || endDate) {
      query.createdAt = {};
      if (dateRange) {
        const now = new Date();
        const start = new Date(now);
        if (dateRange === '24h') start.setHours(now.getHours() - 24);
        if (dateRange === '7d') start.setDate(now.getDate() - 7);
        if (dateRange === '30d') start.setDate(now.getDate() - 30);
        query.createdAt.$gte = start;
      }
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [entries, entriesTotal] = await Promise.all([
      ChangelogEntry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('changedBy', 'full_name email role')
        .lean(),
      ChangelogEntry.countDocuments(query)
    ]);

    let items = entries.map((entry) => ({
      ...entry,
      source: 'automation'
    }));
    let total = entriesTotal;

    if (String(includeAudit).toLowerCase() !== 'false') {
      const auditQuery = { workspaceId: tenantId };
      if (entityType) {
        auditQuery.$or = [
          { target_type: String(entityType) },
          { event_type: new RegExp(String(entityType), 'i') }
        ];
      }
      if (action) {
        auditQuery.action = new RegExp(String(action), 'i');
      }

      if (query.createdAt) {
        auditQuery.created_at = {};
        if (query.createdAt.$gte) auditQuery.created_at.$gte = query.createdAt.$gte;
        if (query.createdAt.$lte) auditQuery.created_at.$lte = query.createdAt.$lte;
      }

      const [auditRows, auditTotal] = await Promise.all([
        ChangeLog.find(auditQuery)
          .sort({ created_at: -1 })
          .limit(parsedLimit)
          .lean(),
        ChangeLog.countDocuments(auditQuery)
      ]);

      const mappedAuditRows = auditRows.map((row) => ({
        _id: row._id,
        tenantId,
        entityType: String(row.target_type || row.event_type || 'system').toLowerCase(),
        action: String(row.action || row.event_type || 'event').trim().toLowerCase().replace(/\s+/g, '_'),
        entityId: row.target_id || row.user_id || tenantId,
        entityName: row.target_name || '',
        changedBy: row.user_id
          ? {
            _id: row.user_id,
            full_name: row.user_name || '',
            email: row.user_email || '',
            role: row.user_role || ''
          }
          : null,
        diff: {
          event_type: row.event_type,
          description: row.description,
          metadata: row.metadata || {},
          changes: row.changes || {}
        },
        createdAt: row.created_at,
        source: 'audit'
      }));

      items = [...items, ...mappedAuditRows]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, parsedLimit);
      total += auditTotal;
    }

    return res.json({
      page: parsedPage,
      limit: parsedLimit,
      total,
      items
    });
  } catch (error) {
    console.error('Error fetching change logs:', error);
    res.status(500).json({ message: 'Error fetching change logs' });
  }
});

router.get('/legacy', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      event_type,
      user_id,
      target_type,
      start_date,
      end_date,
      search
    } = req.query;

    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const includeAllWorkspaces = req.user?.systemRole === 'super_admin' || req.user?.role === 'super_admin';

    if (!tenantId && !includeAllWorkspaces) {
      return res.status(400).json({ message: 'Unable to resolve tenant context' });
    }

    const result = await getChangeLogs({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      event_type,
      user_id,
      target_type,
      start_date,
      end_date,
      search,
      workspaceId: tenantId,
      includeAllWorkspaces
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching legacy change logs:', error);
    res.status(500).json({ message: 'Error fetching legacy change logs' });
  }
});

/**
 * @route   GET /api/changelog/stats
 * @desc    Get change log statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const stats = await getChangeLogStats({ start_date, end_date });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching change log stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

/**
 * @route   GET /api/changelog/export
 * @desc    Export change logs to CSV (Admin only)
 * @access  Private (Admin)
 */
router.get('/export', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    const {
      event_type,
      user_id,
      target_type,
      start_date,
      end_date,
      search
    } = req.query;

    const query = {};

    if (event_type) query.event_type = event_type;
    if (user_id) query.user_id = user_id;
    if (target_type) query.target_type = target_type;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const logs = await exportChangeLogs(query);

    // Convert to CSV
    const csvHeader = 'Timestamp,Event Type,User,Email,Role,IP Address,Action,Target Type,Target Name,Description\n';
    const csvRows = logs.map(log => {
      return [
        new Date(log.created_at).toISOString(),
        log.event_type,
        log.user_name || 'System',
        log.user_email || 'N/A',
        log.user_role || 'N/A',
        log.user_ip || 'N/A',
        log.action,
        log.target_type || 'N/A',
        log.target_name || 'N/A',
        `"${(log.description || '').replace(/"/g, '""')}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    await logChange({
      event_type: 'report_downloaded',
      user: req.user,
      action: 'CHANGELOG_EXPORT_DOWNLOADED',
      target_type: 'report',
      target_id: 'changelog-export',
      target_name: 'Audit Changelog Export',
      description: `${req.user?.full_name || req.user?.email || 'User'} downloaded changelog CSV export`,
      workspaceId: getTenantIdFromUser(req.user),
      metadata: {
        rowsExported: logs.length,
        filters: { event_type, user_id, target_type, start_date, end_date, search }
      }
    });
    res.locals.auditLogged = true;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=changelog-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting change logs:', error);
    res.status(500).json({ message: 'Error exporting change logs' });
  }
});

/**
 * @route   GET /api/changelog/event-types
 * @desc    Get all available event types (Admin only)
 * @access  Private (Admin)
 */
router.get('/event-types', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    const eventTypes = ChangeLog.schema.path('event_type')?.enumValues || [];

    res.json(eventTypes);
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ message: 'Error fetching event types' });
  }
});

/**
 * @route   GET /api/changelog/target-types
 * @desc    Get all available target types (Admin only)
 * @access  Private (Admin)
 */
router.get('/target-types', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    const tenantId = normalizeObjectId(getTenantIdFromUser(req.user));
    const includeAllWorkspaces = req.user?.systemRole === 'super_admin' || req.user?.role === 'super_admin';

    if (!tenantId && !includeAllWorkspaces) {
      return res.json(KNOWN_TARGET_TYPES);
    }

    const query = {
      target_type: { $exists: true, $nin: [null, ''] }
    };

    if (!includeAllWorkspaces) {
      query.workspaceId = tenantId;
    }

    const distinctTargetTypes = await ChangeLog.distinct('target_type', query);
    const merged = [...new Set([
      ...KNOWN_TARGET_TYPES,
      ...distinctTargetTypes
        .map((type) => String(type || '').trim().toLowerCase())
        .filter(Boolean)
    ])].sort((a, b) => a.localeCompare(b));

    res.json(merged);
  } catch (error) {
    console.error('Error fetching target types:', error);
    res.status(500).json({ message: 'Error fetching target types' });
  }
});

/**
 * @route   DELETE /api/changelog/clear
 * @desc    Clear old change logs (Admin only)
 * @access  Private (Admin)
 */
router.delete('/clear', authenticate, checkRole(['super_admin']), async (req, res) => {
  try {
    if (String(process.env.ALLOW_AUDIT_LOG_CLEAR || 'false').toLowerCase() !== 'true') {
      return res.status(403).json({ message: 'Audit log clearing is disabled by policy' });
    }

    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await ChangeLog.deleteMany({
      created_at: { $lt: cutoffDate }
    });

    res.json({
      message: `Successfully deleted logs older than ${days} days`,
      deleted_count: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing change logs:', error);
    res.status(500).json({ message: 'Error clearing change logs' });
  }
});

export default router;
