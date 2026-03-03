import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      localStorage.setItem('lastActivityTime', Date.now().toString());
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
        localStorage.setItem('lastActivityTime', Date.now().toString());

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivityTime');

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