import { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../api/axios';
import { setAccessToken, getAccessToken, clearAccessToken } from '../api/tokenStore';
import { io } from 'socket.io-client';
import notificationService from '../utils/notificationService';

const AuthContext = createContext(null);

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
        const response = await api.post('/auth/refresh', {});
        const { accessToken, user: refreshedUser } = response.data;

        setAccessToken(accessToken);

        // Prefer the user payload that comes with the refresh response;
        // fall back to whatever is cached in localStorage.
        const storedUser = localStorage.getItem('user');
        const baseUser = refreshedUser ||
          (storedUser ? JSON.parse(storedUser) : null);

        if (baseUser) {
          // Fetch latest profile so UI always shows up-to-date data.
          try {
            const verifyResponse = await api.get('/auth/verify');
            const validatedUser = verifyResponse.data.user;
            const userWithWorkspace = { ...validatedUser, workspace: validatedUser.workspace };
            localStorage.setItem('user', JSON.stringify(userWithWorkspace));
            setUser(userWithWorkspace);
            initializeSocket(validatedUser.id);
          } catch {
            localStorage.setItem('user', JSON.stringify(baseUser));
            setUser(baseUser);
            initializeSocket(baseUser.id);
          }
        }
      } catch {
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

    if (!accessToken) return;
    
    const newSocket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      newSocket.emit('join', userId);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
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
      const userWithWorkspace = {
        ...user,
        workspace: workspace
      };

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

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastActivityTime', Date.now().toString());
      setAccessToken(accessToken);

      setUser(user);
      initializeSocket(user.id);

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
    const newUser = { ...user, ...updatedUserData };
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