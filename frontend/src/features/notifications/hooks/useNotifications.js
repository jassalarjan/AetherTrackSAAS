import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/shared/services/axios';

const NotificationsContext = createContext(undefined);

const UNREAD_STORAGE_PREFIX = 'aethertrack:notifications:unread';
const MAX_VISIBLE_TOASTS = 4;
const TOAST_DURATION_MS = 4000;
const TOAST_EXIT_MS = 220;

const TYPE_TO_LABEL = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

const toReadableTitle = (type = 'info') => {
  if (TYPE_TO_LABEL[type]) return TYPE_TO_LABEL[type];
  return String(type)
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizeNotification = (input = {}) => {
  const notificationId = input._id || input.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const type = input.type || 'info';
  const message = input.message || input.body || input.payload?.message || '';
  const title = input.title || input.payload?.title || toReadableTitle(type);
  const read = typeof input.read === 'boolean' ? input.read : Boolean(input.read_at);
  const createdAt = toIsoDate(input.createdAt || input.created_at);
  const link = input.link || input.payload?.link || null;

  return {
    _id: String(notificationId),
    userId: input.userId || input.user_id || null,
    type,
    title,
    message,
    body: message,
    link,
    read,
    read_at: read ? input.read_at || createdAt : null,
    createdAt,
    created_at: createdAt,
    payload: input.payload || {},
    action: input.action || null,
    avatar: input.avatar || null,
  };
};

const buildUnreadStorageKey = (userId) => `${UNREAD_STORAGE_PREFIX}:${userId}`;

const safeReadStoredUnread = (userId) => {
  if (!userId) return 0;
  try {
    const raw = localStorage.getItem(buildUnreadStorageKey(userId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const safeWriteStoredUnread = (userId, unreadCount) => {
  if (!userId) return;
  try {
    localStorage.setItem(buildUnreadStorageKey(userId), String(Math.max(0, unreadCount)));
  } catch {
    // Ignore localStorage write failures.
  }
};

export const NotificationsProvider = ({ children }) => {
  const { user, socket, loading: authLoading } = useAuth();
  const userId = user?.id || user?._id || null;
  const toastTimersRef = useRef(new Map());

  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const clearToastTimer = useCallback((toastId) => {
    const timer = toastTimersRef.current.get(toastId);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(toastId);
    }
  }, []);

  const removeToastNow = useCallback((toastId) => {
    clearToastTimer(toastId);
    setToasts((prev) => prev.filter((toast) => toast.toastId !== toastId));
  }, [clearToastTimer]);

  const dismissToast = useCallback((toastId) => {
    clearToastTimer(toastId);
    setToasts((prev) => prev.map((toast) => (
      toast.toastId === toastId ? { ...toast, isExiting: true } : toast
    )));

    window.setTimeout(() => {
      removeToastNow(toastId);
    }, TOAST_EXIT_MS);
  }, [clearToastTimer, removeToastNow]);

  const pushToast = useCallback((notificationLike) => {
    const normalized = normalizeNotification(notificationLike);
    const toastId = `${normalized._id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toastItem = {
      ...normalized,
      toastId,
      isExiting: false,
      duration: TOAST_DURATION_MS,
    };

    setToasts((prev) => {
      const next = [toastItem, ...prev];
      const overflow = next.slice(MAX_VISIBLE_TOASTS);
      overflow.forEach((toast) => clearToastTimer(toast.toastId));
      return next.slice(0, MAX_VISIBLE_TOASTS);
    });

    const timer = window.setTimeout(() => dismissToast(toastId), TOAST_DURATION_MS);
    toastTimersRef.current.set(toastId, timer);
  }, [clearToastTimer, dismissToast]);

  const upsertNotification = useCallback((incoming, { showToast = true } = {}) => {
    const normalized = normalizeNotification(incoming);

    setNotifications((prev) => {
      const withoutDuplicate = prev.filter((item) => item._id !== normalized._id);
      const next = [normalized, ...withoutDuplicate].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setUnreadCount(next.filter((item) => !item.read).length);
      return next;
    });

    if (showToast) {
      pushToast(normalized);
    }

    return normalized;
  }, [pushToast]);

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    setNotifications((prev) => {
      const next = prev.map((item) => {
        if (item._id !== notificationId || item.read) return item;
        const readAt = new Date().toISOString();
        return { ...item, read: true, read_at: readAt };
      });
      setUnreadCount(next.filter((item) => !item.read).length);
      return next;
    });

    try {
      await api.patch('/notifications/mark-read', { notificationIds: [notificationId] }, { suppressAuthRedirect: true });
    } catch {
      // Ignore API failures; the next fetch resyncs state.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString();

    setNotifications((prev) => prev.map((item) => (
      item.read ? item : { ...item, read: true, read_at: readAt }
    )));
    setUnreadCount(0);

    try {
      await api.patch('/notifications/mark-read', {}, { suppressAuthRedirect: true });
    } catch {
      // Ignore API failures; the next fetch resyncs state.
    }
  }, []);

  const clearAll = useCallback(() => {
    toastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    toastTimersRef.current.clear();
    setToasts([]);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/notifications', { suppressAuthRedirect: true });
      const normalized = (response.data?.notifications || []).map(normalizeNotification);
      normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(normalized);
      setUnreadCount(normalized.filter((item) => !item.read).length);
    } catch {
      // Ignore fetch failures and keep local optimistic state.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      clearAll();
      return;
    }

    setUnreadCount(safeReadStoredUnread(userId));
  }, [clearAll, userId]);

  useEffect(() => {
    if (!userId || authLoading) return;
    fetchNotifications();
  }, [authLoading, fetchNotifications, userId]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleRealtimeNotification = (payload) => {
      const incoming = normalizeNotification(payload);
      if (!incoming.userId || String(incoming.userId) === String(userId)) {
        upsertNotification(incoming, { showToast: true });
      }
    };

    socket.on('notification', handleRealtimeNotification);
    socket.on('notification:new', handleRealtimeNotification);

    return () => {
      socket.off('notification', handleRealtimeNotification);
      socket.off('notification:new', handleRealtimeNotification);
    };
  }, [socket, upsertNotification, userId]);

  useEffect(() => {
    if (!userId) return;

    const handleNativePush = (event) => {
      const detail = event.detail || {};
      upsertNotification(
        {
          type: 'info',
          title: detail.title || 'Notification',
          message: detail.body || detail.message || 'You have a new update.',
          link: detail.data?.deepLink || detail.data?.route || null,
          payload: detail.data || {},
        },
        { showToast: true }
      );
    };

    window.addEventListener('aether:notification', handleNativePush);
    return () => window.removeEventListener('aether:notification', handleNativePush);
  }, [upsertNotification, userId]);

  useEffect(() => {
    safeWriteStoredUnread(userId, unreadCount);
  }, [unreadCount, userId]);

  useEffect(() => () => {
    toastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    toastTimersRef.current.clear();
  }, []);

  const value = useMemo(() => ({
    notifications,
    toasts,
    unreadCount,
    loading,
    add: upsertNotification,
    addToast: pushToast,
    dismissToast,
    removeToast: dismissToast,
    markRead,
    markAllRead,
    clearAll,
    refresh: fetchNotifications,
  }), [
    clearAll,
    dismissToast,
    fetchNotifications,
    loading,
    markAllRead,
    markRead,
    notifications,
    pushToast,
    toasts,
    unreadCount,
    upsertNotification,
  ]);

  return createElement(NotificationsContext.Provider, { value }, children);
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export default useNotifications;
