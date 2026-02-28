/**
 * In-memory token blacklist for invalidated JWT access tokens.
 * Stores a SHA-256 hash of each token alongside its expiry timestamp so
 * the Set never grows unbounded – entries are pruned once they would have
 * expired naturally anyway.
 *
 * For horizontal scaling (multiple server instances) swap this module for a
 * Redis-backed implementation without changing any call sites.
 */

import crypto from 'crypto';

// Map<tokenHash, expiryTimestampMs>
const blacklist = new Map();

/** Hash a raw token so we never store the secret value in memory. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Add a token to the blacklist.
 * @param {string} token      - Raw JWT string
 * @param {number} expiresAt  - Unix timestamp (ms) when the token naturally expires
 */
export const addToBlacklist = (token, expiresAt) => {
  const hash = hashToken(token);
  blacklist.set(hash, expiresAt);
};

/**
 * Check whether a token has been blacklisted.
 * @param {string} token - Raw JWT string
 * @returns {boolean}
 */
export const isBlacklisted = (token) => {
  const hash = hashToken(token);
  if (!blacklist.has(hash)) return false;

  // Remove stale entry lazily
  if (Date.now() > blacklist.get(hash)) {
    blacklist.delete(hash);
    return false;
  }
  return true;
};

/**
 * Purge all entries whose natural expiry has already passed.
 * Called on an interval so the Map doesn't grow indefinitely.
 */
export const purgeExpired = () => {
  const now = Date.now();
  for (const [hash, expiry] of blacklist.entries()) {
    if (now > expiry) blacklist.delete(hash);
  }
};

// Auto-purge every 15 minutes (matches access-token lifetime)
setInterval(purgeExpired, 15 * 60 * 1000);
