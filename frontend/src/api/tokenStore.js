/*
 * In-memory plus sessionStorage access-token store.
 * Persists across WebView reloads while keeping API synchronous.
 */
const ACCESS_TOKEN_KEY = 'aether_access_token';
let _accessToken = null;
try { _accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY); } catch {}

export function setAccessToken(token) {
  _accessToken = token || null;
  try {
    if (_accessToken) sessionStorage.setItem(ACCESS_TOKEN_KEY, _accessToken);
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {}
}

export function getAccessToken() {
  if (_accessToken) return _accessToken;
  try { _accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY); } catch { _accessToken = null; }
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
  try { sessionStorage.removeItem(ACCESS_TOKEN_KEY); } catch {}
}
