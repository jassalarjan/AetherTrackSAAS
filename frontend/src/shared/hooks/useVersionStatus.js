/**
 * useVersionStatus
 * ─────────────────────────────────────────────────────────────────────────────
 * Polls the backend /app-version endpoint (every 2 min, + on visibility change)
 * and exposes reactive state so any component can render an update indicator.
 *
 * Unlike useAppAutoUpdate (which hard-reloads silently), this hook:
 *  - Never auto-reloads
 *  - Exposes `status` so the UI can tell the user
 *  - Provides `checkNow()` for manual on-demand checks
 *  - Provides `reloadToUpdate()` which clears caches then hard-reloads
 *
 * Statuses:
 *   'idle'      – initial, not yet polled
 *   'checking'  – fetch in-flight
 *   'current'   – running version === server version
 *   'outdated'  – server has a newer version
 *   'error'     – fetch failed (network/server down)
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const POLL_INTERVAL   = 2 * 60 * 1000; // 2 minutes

function normalizeBase(url) {
  return String(url || '').replace(/\/+$/, '');
}

async function clearRuntimeCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}

export function useVersionStatus() {
  const [status,        setStatus]        = useState('idle');
  const [latestVersion, setLatestVersion] = useState(null);
  const [lastChecked,   setLastChecked]   = useState(null);
  const inFlightRef = useRef(false);

  const checkNow = useCallback(async () => {
    // In dev, show a static "dev build" check so we don't confuse things
    if (import.meta.env.DEV) {
      setStatus('current');
      setLatestVersion(CURRENT_VERSION);
      setLastChecked(new Date());
      return;
    }

    const apiBase = normalizeBase(import.meta.env.VITE_API_URL);
    if (!apiBase) {
      setStatus('error');
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus('checking');

    try {
      const res = await fetch(`${apiBase}/app-version`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const server  = payload?.version ?? null;
      setLatestVersion(server);
      setLastChecked(new Date());
      if (server && server !== CURRENT_VERSION) {
        setStatus('outdated');
      } else {
        setStatus('current');
      }
    } catch {
      setStatus('error');
      setLastChecked(new Date());
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const reloadToUpdate = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
      await clearRuntimeCaches();
    } catch { /* ignore */ }
    window.location.reload();
  }, []);

  // Initial check + periodic poll
  useEffect(() => {
    checkNow();
    const id = setInterval(checkNow, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkNow]);

  return {
    currentVersion: CURRENT_VERSION,
    latestVersion,
    status,           // 'idle' | 'checking' | 'current' | 'outdated' | 'error'
    lastChecked,
    isOutdated:  status === 'outdated',
    isChecking:  status === 'checking',
    checkNow,
    reloadToUpdate,
  };
}
