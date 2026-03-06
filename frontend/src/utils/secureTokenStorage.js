/**
 * secureTokenStorage.js
 *
 * Replaces localStorage/sessionStorage for auth tokens on native builds.
 * Falls back to sessionStorage on web so the same API works everywhere.
 *
 * Keys stored:
 *   - access_token
 *   - refresh_token
 *   - user_profile   (JSON string)
 *   - fcm_token
 */
import { Capacitor }  from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// ─── Lazy-load SecureStorage only on native ───────────────────────────────
async function getPlugin() {
  if (!isNative) return null;
  const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
  return SecureStoragePlugin;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Persist a value securely.
 * On Android this uses EncryptedSharedPreferences (AES-256).
 */
export async function secureSet(key, value) {
  const plugin = await getPlugin();
  if (plugin) {
    await plugin.set({ key, value: String(value) });
  } else {
    sessionStorage.setItem(key, value);
  }
}

/**
 * Retrieve a securely stored value.
 * Returns null if the key does not exist.
 */
export async function secureGet(key) {
  const plugin = await getPlugin();
  if (plugin) {
    try {
      const result = await plugin.get({ key });
      return result.value ?? null;
    } catch {
      return null;
    }
  } else {
    return sessionStorage.getItem(key);
  }
}

/**
 * Remove a single key.
 */
export async function secureRemove(key) {
  const plugin = await getPlugin();
  if (plugin) {
    try { await plugin.remove({ key }); } catch { /* key may not exist */ }
  } else {
    sessionStorage.removeItem(key);
  }
}

/**
 * Clear all auth-related keys.
 */
export async function secureClearAll() {
  const keys = ['access_token', 'refresh_token', 'user_profile', 'fcm_token'];
  await Promise.all(keys.map(k => secureRemove(k)));
}

// ─── Token helpers ────────────────────────────────────────────────────────

export async function saveTokens({ accessToken, refreshToken }) {
  await Promise.all([
    secureSet('access_token',  accessToken),
    secureSet('refresh_token', refreshToken),
  ]);
}

export async function getAccessToken()  { return secureGet('access_token'); }
export async function getRefreshToken() { return secureGet('refresh_token'); }

export async function saveUserProfile(profile) {
  await secureSet('user_profile', JSON.stringify(profile));
}

export async function getUserProfile() {
  const raw = await secureGet('user_profile');
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export async function saveFCMToken(token) {
  await secureSet('fcm_token', token);
}

export async function getFCMToken() {
  return secureGet('fcm_token');
}

// ─── Sync helpers (for contexts that need a synchronous read) ─────────────
// These only work on web (sessionStorage) — on native they return null.
export function getAccessTokenSync()  { return sessionStorage.getItem('access_token'); }
export function getRefreshTokenSync() { return sessionStorage.getItem('refresh_token'); }
