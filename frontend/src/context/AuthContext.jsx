import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import { io } from 'socket.io-client';
import notificationService from '../utils/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      initializeSocket(JSON.parse(storedUser).id);
    }
    setLoading(false);
  }, []);

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
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);
      initializeSocket(user.id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
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
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const value = {
    user,
    loading,
    socket,
    login,
    register,
    logout,
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