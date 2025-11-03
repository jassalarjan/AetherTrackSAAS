import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationService from '../utils/notificationService';

/**
 * Hook to initialize and manage notifications
 * Call this hook in your main App component
 */
export const useNotifications = () => {
  const { user, socket } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check if notifications are supported
    if (!notificationService.isNotificationSupported()) {
      console.log('Notifications not supported in this browser');
      return;
    }

    // Get current permission status
    const permission = notificationService.getPermissionStatus();
    console.log('Current notification permission:', permission);

    // If permission is granted, set up socket listeners
    if (permission === 'granted') {
      console.log('✅ Notifications enabled and ready');
    }

    // Set up socket listeners for real-time notifications
    if (socket) {
      const handleTaskCreated = (task) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"taskCreated":true}');
        console.log('📝 Task created event received:', task);
        console.log('Settings:', settings);
        if (settings.taskCreated !== false && notificationService.getPermissionStatus() === 'granted') {
          console.log('✅ Showing task created notification');
          notificationService.showTaskNotification('created', task);
        } else {
          console.log('⏭️ Skipped: taskCreated disabled or permission not granted');
        }
      };

      const handleTaskUpdated = (task) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"taskUpdated":true}');
        console.log('🔄 Task updated event received:', task);
        console.log('Settings:', settings);
        
        // Check if current user is involved in this task
        const isAssigned = task.assigned_to?.some(u => u._id === user.id || u === user.id);
        const isCreator = task.created_by?._id === user.id || task.created_by === user.id;
        
        if ((isAssigned || isCreator) && settings.taskUpdated !== false && notificationService.getPermissionStatus() === 'granted') {
          console.log('✅ Showing task updated notification');
          notificationService.showTaskNotification('updated', task);
        } else {
          console.log('⏭️ Skipped: not involved, disabled, or permission not granted');
        }
      };

      const handleTaskAssigned = (data) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"taskAssigned":true}');
        console.log('👤 Task assigned event received:', data);
        console.log('Settings:', settings);
        console.log('Current user ID:', user.id);
        
        // Check if task is assigned to current user
        const task = data.task || data;
        const assignedTo = task.assigned_to || [];
        const isAssignedToMe = assignedTo.some(u => {
          const userId = u._id || u;
          return userId === user.id || userId.toString() === user.id.toString();
        });
        
        console.log('Assigned to:', assignedTo);
        console.log('Is assigned to me:', isAssignedToMe);
        
        if (isAssignedToMe && settings.taskAssigned !== false && notificationService.getPermissionStatus() === 'granted') {
          console.log('✅ Showing task assigned notification');
          notificationService.showTaskNotification('assigned', task);
        } else {
          console.log('⏭️ Skipped: not assigned to me, disabled, or permission not granted');
        }
      };

      const handleCommentAdded = (data) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"newComment":true}');
        console.log('💬 Comment added event received:', data);
        console.log('Settings:', settings);
        
        const task = data.task || data;
        // Check if current user is involved in this task
        const isAssigned = task.assigned_to?.some(u => u._id === user.id || u === user.id);
        const isCreator = task.created_by?._id === user.id || task.created_by === user.id;
        
        if ((isAssigned || isCreator) && settings.newComment !== false && notificationService.getPermissionStatus() === 'granted') {
          console.log('✅ Showing new comment notification');
          notificationService.showTaskNotification('comment', task);
        } else {
          console.log('⏭️ Skipped: not involved, disabled, or permission not granted');
        }
      };

      console.log('🔌 Setting up socket event listeners...');
      socket.on('task:created', handleTaskCreated);
      socket.on('task:updated', handleTaskUpdated);
      socket.on('task:assigned', handleTaskAssigned);
      socket.on('comment:added', handleCommentAdded);
      console.log('✅ Socket event listeners registered');

      // Cleanup
      return () => {
        console.log('🧹 Cleaning up socket event listeners');
        socket.off('task:created', handleTaskCreated);
        socket.off('task:updated', handleTaskUpdated);
        socket.off('task:assigned', handleTaskAssigned);
        socket.off('comment:added', handleCommentAdded);
      };
    } else {
      console.log('⚠️ Socket not available yet');
    }
  }, [user, socket]);

  // Function to manually trigger a test notification
  const testNotification = () => {
    notificationService.showNotification('Test Notification', {
      body: 'This is a test notification from TaskFlow!',
      icon: '/icons/pwa-192x192.png',
      tag: 'test',
      requireInteraction: false,
    });
  };

  return {
    testNotification,
    isSupported: notificationService.isNotificationSupported(),
    permission: notificationService.getPermissionStatus(),
  };
};

export default useNotifications;
