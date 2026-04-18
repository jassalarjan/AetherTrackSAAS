import { getAccessToken } from '@/features/auth/services/tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MAX_TEXT_LEN = 240;
const ERROR_DEDUPE_WINDOW_MS = 5000;
const recentlySentErrors = new Map();

const sanitizeText = (value, fallback = '') => {
  const text = String(value ?? fallback).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > MAX_TEXT_LEN ? text.slice(0, MAX_TEXT_LEN) : text;
};

const shouldSkipUrl = (url = '') => {
  const lower = String(url).toLowerCase();
  return lower.includes('/changelog/client-event') || lower.includes('/audit/errors') || lower.includes('/api-logs/client-event');
};

const postJson = async (path, payload, { requireAuth = true } = {}) => {
  if (typeof window === 'undefined') return;

  const token = getAccessToken();
  if (requireAuth && !token) return;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify(payload)
    });
  } catch {
    // Intentionally ignore telemetry transport failures.
  }
};

export const sendChangelogEvent = (payload = {}) => {
  const event_type = sanitizeText(payload.event_type || 'user_action', 'user_action');
  const action = sanitizeText(payload.action || 'FRONTEND_ACTION', 'FRONTEND_ACTION');

  return postJson('/changelog/client-event', {
    event_type,
    action,
    target_type: sanitizeText(payload.target_type || 'ui', 'ui'),
    target_id: sanitizeText(payload.target_id || '', ''),
    target_name: sanitizeText(payload.target_name || '', ''),
    description: sanitizeText(payload.description || `Frontend event: ${action}`),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  });
};

export const sendApiRequestLog = (payload = {}) => {
  const method = sanitizeText(payload.method || 'GET', 'GET').toUpperCase();
  const path = sanitizeText(payload.path || '/', '/');
  const status_code = Number.isFinite(Number(payload.status_code)) ? Number(payload.status_code) : 200;
  const outcome = String(payload.outcome || (status_code >= 400 ? 'failed' : 'success')).toLowerCase() === 'failed'
    ? 'failed'
    : 'success';

  return postJson('/api-logs/client-event', {
    method,
    path,
    status_code,
    outcome,
    target_type: sanitizeText(payload.target_type || 'api_request', 'api_request'),
    target_id: sanitizeText(payload.target_id || `${method} ${path}`),
    target_name: sanitizeText(payload.target_name || path),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  });
};

export const sendAuditError = (payload = {}) => {
  const message = sanitizeText(payload.message || 'Frontend error captured', 'Frontend error captured');
  const category = sanitizeText(payload.category || 'frontend_runtime_error', 'frontend_runtime_error').toLowerCase();
  const level = sanitizeText(payload.level || 'error', 'error').toLowerCase();

  const fingerprint = `${category}|${message}|${sanitizeText(payload.request?.path || '')}`;
  const now = Date.now();
  const previous = recentlySentErrors.get(fingerprint) || 0;
  if (now - previous < ERROR_DEDUPE_WINDOW_MS) {
    return;
  }
  recentlySentErrors.set(fingerprint, now);

  return postJson('/audit/errors', {
    level,
    category,
    message,
    request: payload.request,
    error: payload.error,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  });
};

const findTrackableTarget = (element) => {
  if (!element || typeof element.closest !== 'function') return null;
  return element.closest('button,a,input,select,textarea,[role="button"],[data-track]');
};

const describeElement = (element) => {
  if (!element) return { target_id: '', target_name: '' };

  const id = sanitizeText(element.id || element.getAttribute?.('name') || '');
  const className = sanitizeText(element.className || '');
  const text = sanitizeText(element.innerText || element.textContent || '');
  const tag = sanitizeText(element.tagName || '').toLowerCase();

  const target_name = [tag, id ? `#${id}` : '', className ? `.${className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : '']
    .filter(Boolean)
    .join('');

  return {
    target_id: id || target_name,
    target_name: target_name || tag || 'element',
    text
  };
};

export const installFrontendTelemetry = () => {
  if (typeof window === 'undefined' || window.__AETHER_TELEMETRY_INSTALLED__) return;

  window.__AETHER_TELEMETRY_INSTALLED__ = true;

  document.addEventListener('click', (event) => {
    const trackTarget = findTrackableTarget(event.target);
    if (!trackTarget) return;

    const info = describeElement(trackTarget);
    void sendChangelogEvent({
      event_type: 'user_action',
      action: 'FRONTEND_CLICK',
      target_type: 'ui_click',
      target_id: info.target_id,
      target_name: info.target_name,
      description: `Frontend click on ${info.target_name || 'element'}`,
      metadata: {
        source: 'frontend_click_listener',
        page: window.location.pathname,
        text: info.text
      }
    });
  }, true);

  window.addEventListener('error', (event) => {
    void sendAuditError({
      level: 'error',
      category: 'frontend_runtime_error',
      message: event.message || 'Unhandled window error',
      request: {
        method: 'BROWSER',
        path: window.location.pathname,
        status_code: null,
        ip: ''
      },
      error: {
        name: event.error?.name || 'Error',
        stack: event.error?.stack || ''
      },
      metadata: {
        source: 'window.onerror',
        file: event.filename,
        line: event.lineno,
        column: event.colno
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = typeof reason === 'string'
      ? reason
      : reason?.message || 'Unhandled promise rejection';

    void sendAuditError({
      level: 'error',
      category: 'frontend_unhandled_rejection',
      message,
      request: {
        method: 'BROWSER',
        path: window.location.pathname,
        status_code: null,
        ip: ''
      },
      error: {
        name: reason?.name || 'UnhandledRejection',
        stack: reason?.stack || ''
      },
      metadata: {
        source: 'window.unhandledrejection'
      }
    });
  });
};
