let _accessToken = null;
/*
 * In-memory access-token store.
 * Intentionally not persisted to Web Storage to reduce XSS exfiltration risk.
 */

export function setAccessToken(token) {
  _accessToken = token || null;
}

export function getAccessToken() {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
}
