import { useEffect } from 'react';

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
      const token = localStorage.getItem('accessToken');
      
      if (lastActivity && token) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
        
        if (timeSinceActivity > ACTIVITY_TIMEOUT) {
          console.log('Session expired due to inactivity');
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('lastActivityTime');
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
