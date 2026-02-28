import jwt from 'jsonwebtoken';

/**
 * Derive distinct signing secrets for access and refresh tokens.
 *
 * Priority order:
 *  1. Dedicated env vars  JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
 *  2. Derived from JWT_SECRET with a fixed suffix so the two secrets are
 *     always different even when only one master secret is configured.
 *
 * This prevents a refresh token from being accepted as an access token
 * (and vice-versa) when both would otherwise share the same key.
 */
const getAccessSecret = () =>
  process.env.JWT_ACCESS_SECRET ||
  (process.env.JWT_SECRET ? process.env.JWT_SECRET + ':access' : null);

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET ||
  process.env.REFRESH_SECRET ||
  (process.env.JWT_SECRET ? process.env.JWT_SECRET + ':refresh' : null);

export const generateAccessToken = (userId, role) => {
  const secret = getAccessSecret();
  if (!secret) throw new Error('JWT_ACCESS_SECRET or JWT_SECRET must be set');
  return jwt.sign({ userId, role }, secret, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId) => {
  const secret = getRefreshSecret();
  if (!secret) throw new Error('JWT_REFRESH_SECRET or JWT_SECRET must be set');
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  try {
    const secret = getAccessSecret();
    if (!secret) return null;
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const secret = getRefreshSecret();
    if (!secret) return null;
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};

/**
 * Decode a JWT without verifying it (to read expiry for blacklisting).
 * NEVER use this for authentication.
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};