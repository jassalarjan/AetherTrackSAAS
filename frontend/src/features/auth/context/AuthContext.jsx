import { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '@/shared/services/axios';
import { setAccessToken, getAccessToken, clearAccessToken } from '@/features/auth/services/tokenStore';
import { io } from 'socket.io-client';
import notificationService from '@/features/notifications/services/notificationService';

const AuthContext = createContext(null);

let refreshBootstrapPromise = null;
let refreshBlockedUntil = 0;

const normalizeAuthUser = (rawUser) => {
  if (!rawUser) return rawUser;
  const isSuper = rawUser.role === 'super_admin';
  return {
    ...rawUser,
    systemRole: rawUser.systemRole || rawUser.role,
    role: isSuper ? 'admin' : rawUser.role,
    isSystemAdmin: Boolean(rawUser.isSystemAdmin || isSuper || (!rawUser.workspaceId && rawUser.role === 'admin')),
  };
};

const requestBootstrapRefresh = async () => {
  if (Date.now() < refreshBlockedUntil) {
    const error = new Error('Refresh temporarily rate limited');
    error.isRateLimit = true;
    throw error;
  }

  if (!refreshBootstrapPromise) {
    refreshBootstrapPromise = api.post('/auth/refresh', {}).catch((error) => {
      if (error?.isRateLimit || error?.response?.status === 429) {
        const retryAfter = Number(error?.retryAfter || error?.response?.headers?.['retry-after'] || 60);
        refreshBlockedUntil = Date.now() + (Number.isFinite(retryAfter) ? retryAfter : 60) * 1000;
      }
      throw error;
    }).finally(() => {
      refreshBootstrapPromise = null;
    });
  }

  return refreshBootstrapPromise;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Restore session using the httpOnly refresh-token cookie.
    // On page load there is no access token in memory yet, so we ask the
    // server to issue a fresh one.  If the cookie is absent/expired the
    // call will 401 and we stay logged-out.
    const initAuth = async () => {
      try {
        const response = await requestBootstrapRefresh();
        const { accessToken, user: refreshedUser } = response.data;

        setAccessToken(accessToken);

        // Prefer the user payload that comes with the refresh response;
        // fall back to whatever is cached in localStorage.
        const storedUser = localStorage.getItem('user');
          const baseUser = normalizeAuthUser(refreshedUser) ||
          (storedUser ? JSON.parse(storedUser) : null);

        if (baseUser) {
          // Fetch latest profile so UI always shows up-to-date data.
          try {
            const verifyResponse = await api.get('/auth/verify');
            const validatedUser = verifyResponse.data.user;
            const userWithWorkspace = normalizeAuthUser({ ...validatedUser, workspace: validatedUser.workspace });
            localStorage.setItem('user', JSON.stringify(userWithWorkspace));
            setUser(userWithWorkspace);
            initializeSocket(validatedUser.id);
          } catch {
            const normalizedBaseUser = normalizeAuthUser(baseUser);
            localStorage.setItem('user', JSON.stringify(normalizedBaseUser));
            setUser(normalizedBaseUser);
            initializeSocket(normalizedBaseUser.id);
          }
        }
      } catch (error) {
        if (error?.isRateLimit || error?.response?.status === 429) {
          // Avoid clearing local auth state on temporary server throttling.
          setLoading(false);
          return;
        }

        // No valid refresh-token cookie — user is not logged in.
        clearAccessToken();
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivityTime');
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    // Listen for logout events from axios interceptor
    const handleAuthLogout = () => {
      setUser(null);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  // Activity tracking
  useEffect(() => {
    if (!user) return;

    const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const updateActivity = () => {
      localStorage.setItem('lastActivityTime', Date.now().toString());
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity periodically
    const checkInactivity = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivityTime');
      const token = getAccessToken();
      
      if (lastActivity && token) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
        
        if (timeSinceActivity > ACTIVITY_TIMEOUT) {
          logout();
          window.location.href = '/login';
        }
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(checkInactivity);
    };
  }, [user]);

  const initializeSocket = (userId) => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const accessToken = getAccessToken();

    if (!accessToken || !userId) return;

    // Ensure we never keep multiple active sockets.
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    const newSocket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['polling', 'websocket']
    });

    let attemptedSocketRefresh = false;

    newSocket.io.on('reconnect_attempt', () => {
      const latestToken = getAccessToken();
      if (latestToken) {
        newSocket.auth = { token: latestToken };
      }
    });
    
    newSocket.on('connect', () => {
      newSocket.emit('join', userId);
    });

    newSocket.on('connect_error', async (error) => {
      const message = error?.message || 'Socket connection failed';
      const isTransportError = /websocket error|xhr poll error|transport error/i.test(message);

      if (!isTransportError) {
        console.error('Socket connection error:', message);
      }

      const isAuthError = /Authentication error/i.test(message);
      if (!isAuthError) {
        return;
      }

      // Token might have expired while socket auto-reconnected with stale auth.
      if (!attemptedSocketRefresh) {
        attemptedSocketRefresh = true;
        try {
          const response = await requestBootstrapRefresh();
          const refreshedAccessToken = response?.data?.accessToken;
          if (refreshedAccessToken) {
            setAccessToken(refreshedAccessToken);
            newSocket.auth = { token: refreshedAccessToken };
            newSocket.connect();
            return;
          }
        } catch {
          // Fall through to logout flow below.
        }
      }

      clearAccessToken();
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivityTime');
      setUser(null);
      newSocket.disconnect();
      setSocket(null);
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'socket-auth-failed' } }));
    });

    newSocket.on('disconnect', () => {
      // Socket disconnected
    });

    // Note: Actual notification listeners are set up in useNotifications hook
    // to avoid duplicate event handlers
    
    setSocket(newSocket);
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, workspace, accessToken } = response.data;

      // Include workspace info in user object for easy access
      const userWithWorkspace = normalizeAuthUser({
        ...user,
        workspace: workspace
      });

      localStorage.setItem('user', JSON.stringify(userWithWorkspace));
      localStorage.setItem('lastActivityTime', Date.now().toString());
      setAccessToken(accessToken);

      setUser(userWithWorkspace);
      initializeSocket(user.id);

      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      return {
        success: false,
        message: errorData?.message || 'Login failed',
        requiresVerification: errorData?.requiresVerification || false,
        accountDeactivated: errorData?.accountDeactivated || false,
      };
    }
  };

  const register = async (full_name, email, password, role = 'member') => {
    try {
      const response = await api.post('/auth/register', {
        full_name,
        email,
        password,
        role,
      });
      const { user, accessToken } = response.data;

      const normalizedUser = normalizeAuthUser(user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('lastActivityTime', Date.now().toString());
      setAccessToken(accessToken);

      setUser(normalizedUser);
      initializeSocket(normalizedUser.id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* best-effort */ }
    clearAccessToken();
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivityTime');
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Update user data (e.g., after profile picture change)
  const updateUser = (updatedUserData) => {
    const newUser = normalizeAuthUser({ ...user, ...updatedUserData });
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const value = {
    user,
    loading,
    socket,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};