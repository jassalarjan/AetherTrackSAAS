/**
 * usePushNotifications.js
 *
 * Registers for FCM push notifications on native builds.
 * Handles token registration, foreground notifications, and tap actions.
 *
 * Usage:
 *   Call usePushNotifications() inside a component that renders after auth.
 *   The hook sends the FCM token to your backend automatically.
 */
import { useEffect, useRef } from 'react';
import { Capacitor }         from '@capacitor/core';
import { useNavigate }       from 'react-router-dom';
import { saveFCMToken }      from '../utils/secureTokenStorage';

const isNative = Capacitor.isNativePlatform();

export function usePushNotifications({ userId, authToken } = {}) {
  const navigate     = useNavigate();
  const cleanups     = useRef([]);

  useEffect(() => {
    if (!isNative || !userId || !authToken) return;

    (async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // 1. Check / request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Push] Permission not granted');
        return;
      }

      // 2. Register with FCM
      await PushNotifications.register();

      // 3. Receive token
      const regListener = await PushNotifications.addListener('registration', async ({ value: token }) => {
        console.log('[Push] FCM token:', token);
        await saveFCMToken(token);
        await registerTokenWithBackend(token, userId, authToken);
      });

      // 4. Registration error
      const regErrListener = await PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err);
      });

      // 5. Foreground notification received
      const rxListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Foreground notification:', notification);
        // Dispatch to app-level notification handler
        window.dispatchEvent(new CustomEvent('aether:notification', {
          detail: {
            id:    notification.id,
            title: notification.title,
            body:  notification.body,
            data:  notification.data,
          },
        }));
      });

      // 6. User tapped notification
      const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const { data } = action.notification;
        console.log('[Push] Tapped notification, data:', data);
        if (data?.deepLink) {
          handleDeepLinkNavigate(data.deepLink, navigate);
        } else if (data?.route) {
          navigate(data.route);
        }
      });

      cleanups.current = [
        () => regListener.remove(),
        () => regErrListener.remove(),
        () => rxListener.remove(),
        () => actionListener.remove(),
      ];
    })();

    return () => {
      cleanups.current.forEach(fn => fn());
      cleanups.current = [];
    };
  }, [userId, authToken, navigate]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function registerTokenWithBackend(token, userId, authToken) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL;
    await fetch(`${apiUrl}/notifications/register-device`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId,
        fcmToken:  token,
        platform:  'android',
        deviceId:  await getDeviceId(),
      }),
    });
  } catch (err) {
    console.error('[Push] Failed to register token with backend:', err);
  }
}

async function getDeviceId() {
  try {
    const { Device } = await import('@capacitor/device');
    const id = await Device.getId();
    return id.identifier;
  } catch {
    return 'unknown';
  }
}

function handleDeepLinkNavigate(url, navigate) {
  try {
    const parsed = new URL(url);
    const path   = parsed.hostname === (import.meta.env.VITE_APP_HOST||'aethertrack.arjansinghjassal.xyz')
      ? parsed.pathname
      : '/' + parsed.hostname + parsed.pathname;
    navigate(path + parsed.search);
  } catch {
    console.warn('[Push] Invalid deep link:', url);
  }
}
