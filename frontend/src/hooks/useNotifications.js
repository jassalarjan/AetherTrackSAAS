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
      return;
    }

    // Get current permission status
    const permission = notificationService.getPermissionStatus();

    // Set up socket listeners for real-time notifications
    if (socket) {
      const handleTaskCreated = (task) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"taskCreated":true}');
        if (settings.taskCreated !== false && notificationService.getPermissionStatus() === 'granted') {
          notificationService.showTaskNotification('created', task);
        }
      };

      const handleTaskUpdated = (task) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"taskUpdated":true}');
        
        // Check if current user is involved in this task
        const isAssigned = task.assigned_to?.some(u => u._id === user.id || u === user.id);
        const isCreator = task.created_by?._id === user.id || task.created_by === user.id;
        
        if ((isAssigned || isCreator) && settings.taskUpdated !== false && notificationService.getPermissionStatus() === 'granted') {
          notificationService.showTaskNotification('updated', task);
        }
      };

      const handleTaskAssigned = (data) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"taskAssigned":true}');
        
        // Check if task is assigned to current user
        const task = data.task || data;
        const assignedTo = task.assigned_to || [];
        const isAssignedToMe = assignedTo.some(u => {
          const userId = u._id || u;
          return userId === user.id || userId.toString() === user.id.toString();
        });
        
        if (isAssignedToMe && settings.taskAssigned !== false && notificationService.getPermissionStatus() === 'granted') {
          notificationService.showTaskNotification('assigned', task);
        }
      };

      const handleCommentAdded = (data) => {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"newComment":true}');
        
        const task = data.task || data;
        // Check if current user is involved in this task
        const isAssigned = task.assigned_to?.some(u => u._id === user.id || u === user.id);
        const isCreator = task.created_by?._id === user.id || task.created_by === user.id;
        
        if ((isAssigned || isCreator) && settings.newComment !== false && notificationService.getPermissionStatus() === 'granted') {
          notificationService.showTaskNotification('comment', task);
        }
      };

      socket.on('task:created', handleTaskCreated);
      socket.on('task:updated', handleTaskUpdated);
      socket.on('task:assigned', handleTaskAssigned);
      socket.on('comment:added', handleCommentAdded);

      // Cleanup
      return () => {
        socket.off('task:created', handleTaskCreated);
        socket.off('task:updated', handleTaskUpdated);
        socket.off('task:assigned', handleTaskAssigned);
        socket.off('comment:added', handleCommentAdded);
      };
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
