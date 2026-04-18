import crypto from 'crypto';
import RevokedToken from '../models/RevokedToken.js';

/** Hash a raw token so we never store the secret value in memory. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const normalizeExpiry = (expiresAt) => {
  const parsedExpiry = Number(expiresAt);
  if (Number.isFinite(parsedExpiry) && parsedExpiry > Date.now()) {
    return new Date(parsedExpiry);
  }

  return new Date(Date.now() + 15 * 60 * 1000);
};

/**
 * Add a token to the persistent blacklist.
 * @param {string} token      - Raw JWT string
 * @param {number} expiresAt  - Unix timestamp (ms) when the token naturally expires
 */
export const addToBlacklist = async (token, expiresAt) => {
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);
  const expiryDate = normalizeExpiry(expiresAt);

  await RevokedToken.updateOne(
    { tokenHash },
    {
      $set: {
        tokenHash,
        expiresAt: expiryDate
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
};

/**
 * Check whether a token has been blacklisted.
 * @param {string} token - Raw JWT string
 * @returns {Promise<boolean>}
 */
export const isBlacklisted = async (token) => {
  if (!token) {
    return false;
  }

  const tokenHash = hashToken(token);
  const revoked = await RevokedToken.findOne({ tokenHash })
    .select('expiresAt')
    .lean();

  if (!revoked) {
    return false;
  }

  const expiryMs = new Date(revoked.expiresAt).getTime();
  if (Number.isFinite(expiryMs) && expiryMs <= Date.now()) {
    await RevokedToken.deleteOne({ tokenHash }).catch(() => {});
    return false;
  }

  return true;
};
