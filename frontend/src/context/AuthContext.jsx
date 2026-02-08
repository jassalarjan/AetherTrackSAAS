import { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../api/axios';
import { io } from 'socket.io-client';
import notificationService from '../utils/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Check if user is logged in and validate token
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (storedUser && token) {
        try {
          // Validate token by making a request to verify user
          const response = await api.get('/auth/verify');
          const validatedUser = response.data.user;
          
          // Update stored user with latest data from server
          const userWithWorkspace = {
            ...validatedUser,
            workspace: validatedUser.workspace
          };
          
          localStorage.setItem('user', JSON.stringify(userWithWorkspace));
          setUser(userWithWorkspace);
          initializeSocket(validatedUser.id);
        } catch (error) {
          // Token is invalid or expired, clear everything
          console.error('Token validation failed:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('lastActivityTime');
          setUser(null);
        }
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
      const token = localStorage.getItem('accessToken');
      
      if (lastActivity && token) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
        
        if (timeSinceActivity > ACTIVITY_TIMEOUT) {
          console.log('Session expired due to inactivity');
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
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      newSocket.emit('join', userId);
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
      const { user, workspace, accessToken, refreshToken } = response.data;

      // Include workspace info in user object for easy access
      const userWithWorkspace = {
        ...user,
        workspace: workspace
      };

      localStorage.setItem('user', JSON.stringify(userWithWorkspace));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('lastActivityTime', Date.now().toString());

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
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('lastActivityTime', Date.now().toString());

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

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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