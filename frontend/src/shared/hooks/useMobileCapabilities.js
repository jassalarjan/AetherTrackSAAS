/**
 * useMobileCapabilities.js
 *
 * Central hook that initialises and exposes all Capacitor capabilities.
 * Import this once in App.jsx and pass values via context or props.
 *
 * Usage:
 *   const mobile = useMobileCapabilities();
 *   if (mobile.isNative) { ... }
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor }          from '@capacitor/core';
import { App }                from '@capacitor/app';
import { Network }            from '@capacitor/network';
import { Device }             from '@capacitor/device';
import { StatusBar, Style }   from '@capacitor/status-bar';
import { SplashScreen }       from '@capacitor/splash-screen';
import { Keyboard }           from '@capacitor/keyboard';
import { useNavigate }        from 'react-router-dom';

const isNative = Capacitor.isNativePlatform();

export function useMobileCapabilities() {
  const navigate = useNavigate();

  const [networkStatus, setNetworkStatus]   = useState({ connected: true, connectionType: 'unknown' });
  const [deviceInfo,    setDeviceInfo]      = useState(null);
  const [keyboardOpen,  setKeyboardOpen]    = useState(false);
  const [appState,      setAppState]        = useState({ isActive: true });

  // ─── Initialise ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;

    let cleanups = [];

    (async () => {
      // 1. Get device info
      const info = await Device.getInfo();
      setDeviceInfo(info);

      // 2. Status bar — dark style to match sidebar (#120E08)
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#120E08' });

      // 3. Hide splash screen after React has painted
      await SplashScreen.hide({ fadeOutDuration: 400 });

      // 4. Network status
      const status = await Network.getStatus();
      setNetworkStatus(status);

      const netListener = await Network.addListener('networkStatusChange', s => {
        setNetworkStatus(s);
        if (!s.connected) {
          // Show in-app offline banner (dispatched to global event bus)
          window.dispatchEvent(new CustomEvent('aether:offline'));
        } else {
          window.dispatchEvent(new CustomEvent('aether:online'));
        }
      });
      cleanups.push(() => netListener.remove());

      // 5. App lifecycle
      const appListener = await App.addListener('appStateChange', state => {
        setAppState(state);
        if (state.isActive) {
          window.dispatchEvent(new CustomEvent('aether:foreground'));
        } else {
          window.dispatchEvent(new CustomEvent('aether:background'));
        }
      });
      cleanups.push(() => appListener.remove());

      // 6. Back button (Android)
      const backListener = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          // Confirm exit
          App.minimizeApp();
        }
      });
      cleanups.push(() => backListener.remove());

      // 7. Deep links
      const urlListener = await App.addListener('appUrlOpen', ({ url }) => {
        handleDeepLink(url);
      });
      cleanups.push(() => urlListener.remove());

      // Also catch deep links bridged from MainActivity.java
      const deepLinkHandler = (e) => handleDeepLink(e.detail.url);
      window.addEventListener('capacitorDeepLink', deepLinkHandler);
      cleanups.push(() => window.removeEventListener('capacitorDeepLink', deepLinkHandler));

      // 8. Keyboard
      const kbShowListener = await Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
      const kbHideListener = await Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
      cleanups.push(() => kbShowListener.remove(), () => kbHideListener.remove());
    })();

    return () => cleanups.forEach(fn => fn());
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Deep link router ─────────────────────────────────────────────────────
  const handleDeepLink = useCallback((url) => {
    try {
      // Support both: aethertrack://dashboard  AND  https://aethertrack.app/dashboard
      const parsed = new URL(url);
      const path   = parsed.hostname === (import.meta.env.VITE_APP_HOST||'aethertrack.arjansinghjassal.xyz')
        ? parsed.pathname                  // HTTPS App Link
        : '/' + parsed.hostname + parsed.pathname; // custom scheme
      navigate(path + parsed.search);
    } catch (err) {
      console.warn('[DeepLink] Invalid URL:', url, err);
    }
  }, [navigate]);

  // ─── Haptic feedback helpers ──────────────────────────────────────────────
  const hapticLight = useCallback(async () => {
    if (!isNative) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  const hapticMedium = useCallback(async () => {
    if (!isNative) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  }, []);

  return {
    isNative,
    networkStatus,
    deviceInfo,
    keyboardOpen,
    appState,
    isOnline:  networkStatus.connected,
    hapticLight,
    hapticMedium,
  };
}

export { isNative };
