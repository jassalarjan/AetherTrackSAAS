/**
 * autoUpdate.js
 *
 * Over-the-air (OTA) web updates using @capgo/capacitor-updater.
 *
 * How it works:
 *   1. On every app foreground, the updater checks your update server.
 *   2. If a new bundle is available it downloads it in the background.
 *   3. On the next app restart the new bundle is active.
 *   4. Native code (Capacitor/Android) never changes — only the React bundle.
 *
 * This means you can deploy frontend changes WITHOUT pushing a new APK.
 *
 * Update server:
 *   - You can self-host (see backend/routes/updates.js scaffold below)
 *   - Or use Capgo cloud: https://capgo.app
 *
 * Usage:
 *   Call initAutoUpdate() once, early in App.jsx.
 */
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export async function initAutoUpdate() {
  if (!isNative) return;    // No-op on web

  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

  // Tell the updater the current bundle loaded successfully
  // (prevents rollback to a previous bundle on crash)
  await CapacitorUpdater.notifyAppReady();

  // ─── Check for updates on foreground ────────────────────────────────
  window.addEventListener('aether:foreground', async () => {
    try {
      await checkAndDownloadUpdate(CapacitorUpdater);
    } catch (err) {
      console.warn('[AutoUpdate] Check failed (non-fatal):', err.message);
    }
  });

  // ─── Listen to download progress ────────────────────────────────────
  await CapacitorUpdater.addListener('download', (event) => {
    console.log(`[AutoUpdate] Download progress: ${event.percent}%`);
    window.dispatchEvent(new CustomEvent('aether:updateProgress', {
      detail: { percent: event.percent },
    }));
  });

  // ─── Update available ────────────────────────────────────────────────
  await CapacitorUpdater.addListener('updateAvailable', (event) => {
    console.log('[AutoUpdate] Update available:', event.bundle.version);
    window.dispatchEvent(new CustomEvent('aether:updateAvailable', {
      detail: { version: event.bundle.version },
    }));
  });

  // ─── Initial check ───────────────────────────────────────────────────
  await checkAndDownloadUpdate(CapacitorUpdater);
}

async function checkAndDownloadUpdate(CapacitorUpdater) {
  const updateUrl = import.meta.env.VITE_UPDATE_URL;
  if (!updateUrl) return;

  // List available bundles from your server
  const response = await fetch(`${updateUrl}/api/mobile/latest-bundle`, {
    headers: { 'X-App-Version': import.meta.env.VITE_APP_VERSION || '1.0.0' },
  });

  if (!response.ok) return;

  const { version, url, checksum } = await response.json();

  if (!version || !url) return;

  // Download in background
  const bundle = await CapacitorUpdater.download({ url, version, checksum });

  // Apply on next restart (not immediately — avoids jarring mid-session jumps)
  await CapacitorUpdater.next(bundle);
  console.log('[AutoUpdate] Bundle ready for next restart:', version);
}

/**
 * Force the update to apply immediately (call after user confirms).
 */
export async function applyUpdateNow() {
  if (!isNative) return;
  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  await CapacitorUpdater.reload();
}
