import { useEffect } from 'react';
import { getAccessToken } from '@/features/auth/services/tokenStore';

const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useActivityTracker = () => {
  useEffect(() => {
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
          // Clear user data from localStorage
          localStorage.removeItem('user');
          localStorage.removeItem('lastActivityTime');
          // Dispatch logout event
          window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'inactivity' } }));
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
  }, []);
};
