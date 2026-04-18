import SystemAuditLog from '../models/SystemAuditLog.js';
import { getTenantIdFromUser, normalizeObjectId } from '../utils/tenantScope.js';

const MAX_TEXT = 8000;

const safeString = (value, fallback = '') => {
  const text = String(value ?? fallback).trim();
  if (!text) return fallback;
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;
};

export const logSystemAuditIssue = async ({
  source = 'backend',
  level = 'error',
  category = 'runtime_error',
  message,
  request,
  error,
  metadata,
  user,
  workspaceId
} = {}) => {
  try {
    const resolvedWorkspaceId = normalizeObjectId(
      workspaceId || getTenantIdFromUser(user) || user?._id || null
    ) || null;

    const doc = new SystemAuditLog({
      workspaceId: resolvedWorkspaceId,
      user_id: user?._id || null,
      user_email: safeString(user?.email || ''),
      user_name: safeString(user?.full_name || ''),
      user_role: safeString(user?.role || ''),
      source: source === 'frontend' ? 'frontend' : 'backend',
      level: ['error', 'warn', 'critical'].includes(String(level)) ? String(level) : 'error',
      category: safeString(category || 'runtime_error'),
      message: safeString(message || 'Unknown system issue', 'Unknown system issue'),
      request: {
        method: safeString(request?.method || ''),
        path: safeString(request?.path || ''),
        status_code: Number.isFinite(request?.status_code) ? Number(request.status_code) : null,
        ip: safeString(request?.ip || '')
      },
      error: {
        name: safeString(error?.name || ''),
        stack: safeString(error?.stack || '')
      },
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    });

    await doc.save();
    return doc;
  } catch (saveError) {
    console.error('Error writing system audit issue:', saveError?.message || saveError);
    return null;
  }
};
