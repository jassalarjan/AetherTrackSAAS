import { verifyAccessToken } from '../utils/jwt.js';
import { isBlacklisted } from '../utils/tokenBlacklist.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    // Accept token from: 1) Authorization header, 2) httpOnly cookie (preferred)
    let token = null;

    if (req.cookies && req.cookies.access_token) {
      // httpOnly cookie (set after login – most secure path)
      token = req.cookies.access_token;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Reject tokens that have been explicitly invalidated (logout)
    if (isBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    // Verify signature and expiry
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user from database with team populated
    const user = await User.findById(decoded.userId)
      .select('-password_hash')
      .populate('team_id', 'name description');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user and raw token to request (raw token needed for blacklisting on logout)
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};