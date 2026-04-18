import ChangeLog from '../models/ChangeLog.js';
import ChangelogEntry from '../models/ChangelogEntry.js';
import { getTenantIdFromUser, normalizeObjectId } from './tenantScope.js';

const ALLOWED_EVENT_TYPES = new Set(ChangeLog.schema.path('event_type')?.enumValues || []);

const normalizeEventType = (eventType) => {
  const value = String(eventType || '').trim().toLowerCase();
  if (ALLOWED_EVENT_TYPES.has(value)) return value;
  return 'system_event';
};

const normalizeEntityType = (entityType) => {
  const value = String(entityType || '').trim().toLowerCase();
  const map = {
    leave_request: 'leave',
    leave_type: 'leave',
    email_template: 'email',
    user: 'member',
    user_login: 'auth',
    user_logout: 'auth',
    report_automation: 'report',
    settings: 'system',
    report_download: 'report'
  };
  return map[value] || value || 'system';
};

const normalizeAction = (action) => {
  const value = String(action || '').trim().toLowerCase().replace(/\s+/g, '_');
  const map = {
    create: 'created',
    add: 'created',
    invite: 'created',
    update: 'updated',
    edit: 'updated',
    delete: 'deleted',
    remove: 'deleted',
    approve: 'approved',
    reject: 'rejected',
    checkin: 'check_in',
    checkout: 'check_out',
    login: 'login',
    logout: 'logout',
    logged_in: 'login',
    logged_out: 'logout',
    user_logged_in: 'login',
    user_logged_out: 'logout'
  };
  return map[value] || value || 'updated';
};

const queueAutomationChangelogBridge = (logData) => {
  Promise.resolve()
    .then(async () => {
      const tenantCandidate = logData.workspaceId || logData.tenantId || logData.user_id || null;
      const tenantId = normalizeObjectId(tenantCandidate);
      if (!tenantId) return;

      const entityId = normalizeObjectId(logData.target_id)
        || normalizeObjectId(logData.user_id)
        || tenantId;

      const entityType = normalizeEntityType(logData.target_type || logData.event_type || 'system');
      const action = normalizeAction(logData.action);

      const entry = await ChangelogEntry.create({
        tenantId,
        entityType,
        action,
        entityId,
        entityName: logData.target_name || '',
        changedBy: logData.user_id || null,
        diff: logData.changes || logData.metadata || {}
      });

      const { handleChangelogAutomation } = await import('../services/automationRunner.js');
      await handleChangelogAutomation(entry);
    })
    .catch((error) => {
      console.error('Automation changelog bridge error:', error?.message || error);
    });
};

/**
 * Create a change log entry
 * WORKSPACE SUPPORT: Now accepts workspaceId parameter
 */
export const logChange = async (params) => {
  try {
    // Handle both parameter patterns
    let logData = {};

    if (params.event_type) {
      // Direct event_type pattern (used in auth.js, users.js, etc.)
      const rawEventType = String(params.event_type || '').trim();
      const normalizedEventType = normalizeEventType(rawEventType);
      const baseMetadata = params.metadata || {};

      logData = {
        event_type: normalizedEventType,
        user_id: params.user?._id || params.user_id,
        user_email: params.user?.email,
        user_name: params.user?.full_name,
        user_role: params.user?.role,
        user_ip: params.user_ip,
        target_type: params.target_type,
        target_id: params.target_id,
        target_name: params.target_name,
        action: params.action || rawEventType || 'SYSTEM_EVENT',
        description: params.description || params.action || rawEventType || 'System event logged',
        metadata: {
          ...baseMetadata,
          ...(rawEventType && normalizedEventType !== rawEventType.toLowerCase()
            ? { original_event_type: rawEventType }
            : {})
        },
        changes: params.changes || {},
        workspaceId: params.workspaceId || getTenantIdFromUser(params.user) || params.user_id || null
      };
    } else {
      // Alternative pattern (used in attendance.js, leaves.js, etc.)
      const { userId, workspaceId, action, entity, entityId, details, ipAddress } = params;

      // Map entity to event_type
      const eventTypeMap = {
        attendance: 'user_action',
        leave_request: 'leave_action',
        leave_type: 'leave_type_action',
        holiday: 'holiday_action',
        email_template: 'email_action',
        user: 'user_action',
        task: 'task_updated'
      };

      logData = {
        event_type: eventTypeMap[entity] || 'system_event',
        user_id: userId,
        user_ip: ipAddress,
        target_type: entity,
        target_id: entityId,
        action: action,
        description: `${action} ${entity}: ${JSON.stringify(details || {})}`,
        metadata: details || {},
        workspaceId: workspaceId
      };
    }

    logData.workspaceId = normalizeObjectId(logData.workspaceId) || null;

    const logEntry = new ChangeLog(logData);

    await logEntry.save();
    queueAutomationChangelogBridge(logData);
    return logEntry;
  } catch (error) {
    console.error('Error creating change log:', error);
    // Don't throw error to prevent disrupting main operations
    return null;
  }
};

/**
 * Get change logs with filters and pagination
 * WORKSPACE SUPPORT: Now requires workspaceId parameter (or includeAllWorkspaces for system admins)
 */
export const getChangeLogs = async ({
  page = 1,
  limit = 50,
  event_type,
  user_id,
  target_type,
  start_date,
  end_date,
  search,
  workspaceId,
  includeAllWorkspaces = false  // For system admins to view all logs
}) => {
  try {
    // WORKSPACE SUPPORT: Start with workspace filter (unless viewing all)
    const query = {};
    const normalizedWorkspaceId = normalizeObjectId(workspaceId);
    
    if (!includeAllWorkspaces) {
      if (!normalizedWorkspaceId) {
        return {
          logs: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }
      query.workspaceId = normalizedWorkspaceId;
    }

    if (event_type) {
      query.event_type = event_type;
    }

    if (user_id) {
      query.user_id = user_id;
    }

    if (target_type) {
      query.target_type = target_type;
    }

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) {
        query.created_at.$gte = new Date(start_date);
      }
      if (end_date) {
        query.created_at.$lte = new Date(end_date);
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { user_email: { $regex: search, $options: 'i' } },
        { user_name: { $regex: search, $options: 'i' } },
        { target_name: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ChangeLog.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user_id', 'full_name email role')
        .lean(),
      ChangeLog.countDocuments(query)
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error fetching change logs:', error);
    throw error;
  }
};

/**
 * Get change log statistics
 */
export const getChangeLogStats = async ({ start_date, end_date }) => {
  try {
    const query = {};
    
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) {
        query.created_at.$gte = new Date(start_date);
      }
      if (end_date) {
        query.created_at.$lte = new Date(end_date);
      }
    }

    const stats = await ChangeLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const userActivity = await ChangeLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$user_id',
          user_name: { $first: '$user_name' },
          user_email: { $first: '$user_email' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const total = await ChangeLog.countDocuments(query);

    return {
      total,
      by_event_type: stats,
      top_users: userActivity
    };
  } catch (error) {
    console.error('Error fetching change log stats:', error);
    throw error;
  }
};

/**
 * Export change logs to CSV format
 */
export const exportChangeLogs = async (query) => {
  try {
    const logs = await ChangeLog.find(query)
      .sort({ created_at: -1 })
      .populate('user_id', 'full_name email role')
      .lean();

    return logs;
  } catch (error) {
    console.error('Error exporting change logs:', error);
    throw error;
  }
};
