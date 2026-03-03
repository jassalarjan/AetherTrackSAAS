/**
 * AetherTrack 2030 Real-time Presence Hook
 * Reference: System_UI_Shift.md Section 6 - Real-time & Collaboration
 * 
 * Features:
 * - Live cursors on shared Kanban/Gantt boards
 * - Presence avatars in page header ("3 people viewing")
 * - Live field sync with 300ms debounce broadcast
 * - Conflict resolution UI on simultaneous edits
 * - Activity feed drawer per project (live event stream)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Presence User
 */
const createPresenceUser = (user, cursor = null, field = null) => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  color: user.color || getRandomColor(),
  cursor,
  field,
  lastActive: Date.now(),
  isTyping: false,
});

/**
 * Generate random color for user cursor
 */
const getRandomColor = () => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
    '#f97316', '#eab308', '#22c55e', '#14b8a6', 
    '#06b6d4', '#3b82f6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Use Real-time Presence Hook
 */
export const useRealtimePresence = ({
  roomId,
  enabled = true,
  onUserJoin,
  onUserLeave,
  onCursorMove,
  onFieldEdit,
  onActivity,
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [activities, setActivities] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const heartbeatRef = useRef(null);

  // Connect to presence service
  useEffect(() => {
    if (!enabled || !roomId || !user) return;

    // Simulate WebSocket connection
    // In production, replace with actual WebSocket/Socket.io
    const connect = () => {
      setIsConnected(true);
      
      // Add current user to presence
      const currentUser = createPresenceUser(user);
      setUsers(prev => {
        const filtered = prev.filter(u => u.id !== user.id);
        return [...filtered, currentUser];
      });

      // Broadcast join
      if (onUserJoin) {
        onUserJoin(currentUser);
      }

      // Add activity
      addActivity({
        type: 'join',
        user: user.name,
        message: `${user.name} joined`,
      });
    };

    connect();

    // Heartbeat to keep presence alive
    heartbeatRef.current = setInterval(() => {
      // Send heartbeat in production
    }, 30000);

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      setIsConnected(false);
    };
  }, [enabled, roomId, user, onUserJoin]);

  // Update cursor position
  const updateCursor = useCallback((x, y, containerId) => {
    if (!enabled || !isConnected || !user) return;

    const cursorData = { x, y, containerId, userId: user.id };
    
    // Update local cursor state
    setCursors(prev => ({
      ...prev,
      [user.id]: cursorData,
    }));

    // Debounce broadcast
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (onCursorMove) {
        onCursorMove(cursorData);
      }
    }, 50); // 50ms throttle for cursor updates
  }, [enabled, isConnected, user, onCursorMove]);

  // Start field editing (for conflict detection)
  const startFieldEdit = useCallback((fieldId, fieldName, initialValue) => {
    if (!enabled || !isConnected || !user) return null;

    const editData = {
      fieldId,
      fieldName,
      initialValue,
      userId: user.id,
      userName: user.name,
      startedAt: Date.now(),
    };

    // Broadcast field edit start
    if (onFieldEdit) {
      onFieldEdit({ type: 'start', ...editData });
    }

    return editData;
  }, [enabled, isConnected, user, onFieldEdit]);

  // End field editing
  const endFieldEdit = useCallback((fieldId, finalValue) => {
    if (!enabled || !isConnected || !user) return;

    if (onFieldEdit) {
      onFieldEdit({ 
        type: 'end', 
        fieldId, 
        finalValue,
        userId: user.id,
      });
    }
  }, [enabled, isConnected, user, onFieldEdit]);

  // Add activity to feed
  const addActivity = useCallback((activity) => {
    const newActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...activity,
    };

    setActivities(prev => [newActivity, ...prev].slice(0, 100)); // Keep last 100

    if (onActivity) {
      onActivity(newActivity);
    }
  }, [onActivity]);

  // Clear activities
  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return {
    // State
    users,
    cursors,
    activities,
    isConnected,
    currentUser: user,
    
    // Actions
    updateCursor,
    startFieldEdit,
    endFieldEdit,
    addActivity,
    clearActivities,
  };
};

/**
 * Use Live Field Sync Hook
 * For collaborative editing with conflict resolution
 */
export const useLiveFieldSync = ({
  fieldId,
  value,
  onSave,
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictingValue, setConflictingValue] = useState(null);
  const [lastSavedBy, setLastSavedBy] = useState(null);
  
  const debounceRef = useRef(null);
  const presence = useRealtimePresence({});

  // Sync with external value
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Start editing
  const startEditing = useCallback(() => {
    setIsEditing(true);
    const editData = presence.startFieldEdit(fieldId, 'field', value);
    return editData;
  }, [fieldId, value, presence]);

  // Update local value
  const updateValue = useCallback((newValue) => {
    setLocalValue(newValue);
    
    // Debounced save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        await onSave(newValue);
        presence.endFieldEdit(fieldId, newValue);
        setLastSavedBy('me');
      } catch (err) {
        console.error('Save failed:', err);
      }
    }, debounceMs);
  }, [fieldId, onSave, debounceMs, presence]);

  // Resolve conflict
  const resolveConflict = useCallback((keepMine) => {
    if (keepMine) {
      setLocalValue(localValue);
    } else {
      setLocalValue(conflictingValue);
    }
    setHasConflict(false);
    setConflictingValue(null);
  }, [localValue, conflictingValue]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setLocalValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, [value]);

  return {
    localValue,
    isEditing,
    hasConflict,
    conflictingValue,
    lastSavedBy,
    startEditing,
    updateValue,
    cancelEditing,
    resolveConflict,
  };
};

/**
 * Use Activity Feed Hook
 */
export const useActivityFeed = ({
  activities = [],
  maxItems = 50,
  autoRefresh = false,
  refreshInterval = 5000,
}) => {
  const [feed, setFeed] = useState(activities);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const intervalRef = useRef(null);

  // Add new activity
  const addActivity = useCallback((activity) => {
    const newActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...activity,
    };

    setFeed(prev => [newActivity, ...prev].slice(0, maxItems));
  }, [maxItems]);

  // Clear feed
  const clearFeed = useCallback(() => {
    setFeed([]);
  }, []);

  // Filter activities
  const filteredActivities = feed.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  // Toggle drawer
  const toggleFeed = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    activities: filteredActivities,
    isOpen,
    filter,
    setFilter,
    addActivity,
    clearFeed,
    toggleFeed,
  };
};

export default useRealtimePresence;
