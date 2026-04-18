import ApiRequestLog from '../models/ApiRequestLog.js';
import getClientIP from '../utils/getClientIP.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';
import { logSystemAuditIssue } from '../services/systemAuditService.js';

const METHOD_TO_OPERATION = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete'
};

const TARGET_TYPE_BY_MODULE = {
  users: 'user',
  teams: 'team',
  tasks: 'task',
  comments: 'comment',
  notifications: 'notification',
  projects: 'project',
  sprints: 'sprint',
  automations: 'automation',
  'report-automations': 'automation',
  attendance: 'attendance',
  leaves: 'leave_request',
  'leave-types': 'leave_type',
  holidays: 'holiday',
  'email-templates': 'email_template',
  'email-hub': 'email',
  meetings: 'meeting',
  shifts: 'shift',
  reallocation: 'reallocation',
  verification: 'verification',
  geofences: 'verification',
  settings: 'settings'
};

const toModuleName = (baseUrl = '') => {
  const raw = String(baseUrl || '').replace(/^\/api\/?/, '');
  const segments = raw.split('/').filter(Boolean);
  if (segments.length === 0) return 'system';
  if (segments[0] === 'hr') return segments[1] || 'hr';
  return segments[0];
};

const safeKeys = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value).slice(0, 30);
};

const readResponseObject = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  if (Array.isArray(payload)) return null;
  if (payload.item && typeof payload.item === 'object') return payload.item;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  return payload;
};

const extractTargetId = (req, payload) => {
  if (req.params?.id) return String(req.params.id);
  const obj = readResponseObject(payload);
  if (!obj) return undefined;
  return String(obj._id || obj.id || payload?.insertedId || '').trim() || undefined;
};

const extractTargetName = (payload) => {
  const obj = readResponseObject(payload);
  if (!obj) return undefined;
  return obj.full_name || obj.name || obj.title || obj.email || undefined;
};

export const apiAuditLogger = ({ includeReads = true } = {}) => (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  const operation = METHOD_TO_OPERATION[method];

  if (!operation) {
    return next();
  }

  if (!includeReads && operation === 'read') {
    return next();
  }

  let responsePayload;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function patchedJson(body) {
    responsePayload = body;
    return originalJson(body);
  };

  res.send = function patchedSend(body) {
    if (responsePayload === undefined) {
      responsePayload = body;
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    if (res.locals?.auditLogged) return;
    if (!req.user) return;

    const moduleName = toModuleName(req.baseUrl || req.originalUrl);
    const requestFailed = res.statusCode >= 400;
    const target_type = TARGET_TYPE_BY_MODULE[moduleName] || moduleName || 'system';
    const target_id = extractTargetId(req, responsePayload);
    const target_name = extractTargetName(responsePayload);
    const workspaceId = normalizeObjectId(getTenantIdFromUser(req.user));
    const userId = normalizeObjectId(req.user?._id);
    const ip = getClientIP(req);

    void ApiRequestLog.create({
      workspaceId,
      user_id: userId,
      user_email: req.user?.email || '',
      user_name: req.user?.full_name || req.user?.name || '',
      user_role: req.user?.role || '',
      method,
      path: req.originalUrl,
      module: moduleName,
      operation,
      outcome: requestFailed ? 'failed' : 'success',
      status_code: res.statusCode,
      target_type,
      target_id,
      target_name,
      ip,
      query: req.query || {},
      params: req.params || {},
      body_keys: safeKeys(req.body),
      response_keys: safeKeys(readResponseObject(responsePayload)),
      metadata: {
        source: 'api_audit_logger'
      }
    });

    if (requestFailed) {
      void logSystemAuditIssue({
        source: 'backend',
        level: res.statusCode >= 500 ? 'critical' : 'error',
        category: 'api_request_failure',
        message: `${method} ${req.originalUrl} failed with status ${res.statusCode}`,
        request: {
          method,
          path: req.originalUrl,
          status_code: res.statusCode,
          ip
        },
        metadata: {
          module: moduleName,
          operation,
          query: req.query,
          params: req.params,
          body_keys: safeKeys(req.body)
        },
        user: req.user,
        workspaceId
      });
    }
  });

  next();
};
