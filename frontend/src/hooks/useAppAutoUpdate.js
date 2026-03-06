import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

function normalizeApiBase(url) {
  return String(url || '').replace(/\/+$/, '');
}

function clearRuntimeCaches() {
  if (!('caches' in window)) return Promise.resolve();
  return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
}

// Session-scoped flag: prevent a reload loop if the new bundle still doesn't
// match (e.g. dev build vs server version mismatch). One reload per tab is
// enough — after the reload the fresh bundle should carry the correct version.
const RELOAD_FLAG = 'aet_update_reload';

export function useAppAutoUpdate() {
  const { socket } = useAuth();
  const currentVersionRef = useRef(import.meta.env.VITE_APP_VERSION || '1.0.0');
  const reloadingRef = useRef(false);

  const reloadApp = useCallback(async () => {
    if (reloadingRef.current) return;
    // Guard: if we already reloaded this session, stop — avoids infinite loop.
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    reloadingRef.current = true;
    sessionStorage.setItem(RELOAD_FLAG, '1');
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.update()));
      }
      await clearRuntimeCaches();
    } catch {}
    window.location.reload();
  }, []);

  const checkVersion = useCallback(async () => {
    // Skip version polling in development — dev builds use a different version
    // string (e.g. '1.0.0-dev') that will never match the server default,
    // which would trigger an infinite reload loop.
    if (import.meta.env.DEV) return;
    try {
      const apiBase = normalizeApiBase(import.meta.env.VITE_API_URL);
      if (!apiBase) return;
      const res = await fetch(`${apiBase}/app-version`, { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      if (!payload?.version) return;
      if (payload.version !== currentVersionRef.current) {
        currentVersionRef.current = payload.version;
        await reloadApp();
      }
    } catch {}
  }, [reloadApp]);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, 120000);
    const onVisible = () => { if (document.visibilityState === 'visible') checkVersion(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkVersion]);

  useEffect(() => {
    if (!socket) return;
    const onVersion = async (payload) => {
      if (!payload?.version) return;
      if (payload.version !== currentVersionRef.current) {
        currentVersionRef.current = payload.version;
        await reloadApp();
      }
    };
    socket.on('new_app_version', onVersion);
    return () => socket.off('new_app_version', onVersion);
  }, [socket, reloadApp]);
}
