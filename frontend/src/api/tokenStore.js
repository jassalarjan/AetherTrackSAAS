/**
 * In-memory access-token store.
 *
 * Keeping the access token here (instead of localStorage) means it cannot
 * be read by injected scripts (XSS).  The long-lived refresh token lives in
 * an httpOnly cookie that is managed entirely by the server.
 */
let _accessToken = null;

export const setAccessToken  = (token)  => { _accessToken = token; };
export const getAccessToken  = ()       => _accessToken;
export const clearAccessToken = ()      => { _accessToken = null; };
