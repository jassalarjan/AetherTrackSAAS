import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/features/auth/services/tokenStore';
import { sendApiRequestLog, sendAuditError } from '@/shared/services/telemetry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LAST_ACTIVITY_KEY = 'lastActivityTime';

const setLastActivityTime = () => {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
};

const clearLastActivityTime = () => {
  try {
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// -- Request interceptor ------------------------------------------------------
// Attach the in-memory access token as a Bearer header.  The refresh token
// travels as an httpOnly cookie; we never touch it from JS.
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    const method = String(config.method || 'GET').toUpperCase();
    const requestPath = String(config.url || '');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      setLastActivityTime();

      if (!requestPath.includes('/api-logs/client-event') && !requestPath.includes('/audit/errors')) {
        void sendApiRequestLog({
          method,
          path: requestPath,
          outcome: 'success',
          status_code: 200,
          target_type: 'api_request',
          target_id: `${method} ${requestPath}`,
          target_name: requestPath,
          metadata: {
            source: 'frontend_axios_interceptor',
            method,
            path: requestPath,
            phase: 'request'
          }
        });
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -- Response interceptor -----------------------------------------------------
// On 401: attempt a silent token refresh using the httpOnly refresh-token
// cookie, then replay the original request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const suppressAuthRedirect = Boolean(originalRequest?.suppressAuthRedirect);

    if (!String(originalRequest?.url || '').includes('/audit/errors')) {
      void sendAuditError({
        level: 'error',
        category: 'frontend_api_error',
        message: error?.response?.data?.message || error?.message || 'Frontend API request failed',
        request: {
          method: String(originalRequest?.method || 'GET').toUpperCase(),
          path: String(originalRequest?.url || ''),
          status_code: error?.response?.status || null,
          ip: ''
        },
        error: {
          name: error?.name || 'AxiosError',
          stack: error?.stack || ''
        },
        metadata: {
          source: 'frontend_axios_interceptor',
          status_text: error?.response?.statusText || '',
          response_data: error?.response?.data || null
        }
      });
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = data;
        setAccessToken(accessToken);
        setLastActivityTime();

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (suppressAuthRedirect) {
          return Promise.reject(refreshError);
        }

        clearAccessToken();
        localStorage.removeItem('user');
        clearLastActivityTime();

        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'refresh-failed' } }));

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;

      const rateLimitError = new Error(
        `Too many requests. Please wait ${retrySeconds} seconds before trying again.`
      );
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      rateLimitError.retryAfter = retrySeconds;
      rateLimitError.isRateLimit = true;

      return Promise.reject(rateLimitError);
    }

    return Promise.reject(error);
  }
);

export default api;