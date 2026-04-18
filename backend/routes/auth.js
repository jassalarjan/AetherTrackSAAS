import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, decodeToken } from '../utils/jwt.js';
import { addToBlacklist } from '../utils/tokenBlacklist.js';
import { logChange } from '../utils/changeLogService.js';
import { authenticate } from '../middleware/auth.js';
import getClientIP from '../utils/getClientIP.js';
import { sendVerificationEmail, sendPasswordResetLink } from '../utils/emailService.js';
import { validatePassword } from '../utils/passwordValidator.js';

const router = express.Router();

// ============================================================================
// SECURITY: Rate Limiting Configuration
// ============================================================================
// Protect authentication endpoints from brute force and token farming attacks

/**
 * Login Rate Limiter (Stricter)
 * - 5 attempts per 15 minutes per IP
 * - Prevents brute force password attacks
 * - Uses express-rate-limit's built-in IP detection (handles IPv6 properly)
 * - Note: IP-based limiting only (email tracking removed for IPv6 compatibility)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Use built-in IP detection (trust proxy is enabled in server.js)
  // Removed custom keyGenerator to fix IPv6 validation issues
  // The built-in handler properly normalizes IPv6 addresses
  validate: {
    xForwardedForHeader: false
  },
  // Skip successful requests (don't count them against the limit)
  skipSuccessfulRequests: false,
  // Handler for when limit is exceeded
  handler: (req, res) => {
    console.warn(`[SECURITY] Login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts, please try again later',
      retryAfter: Math.ceil(15 * 60 / 60) // minutes
    });
  }
});

/**
 * Refresh Token Rate Limiter
 * - 20 refresh requests per hour per IP
 * - Prevents token farming attacks
 * - Uses built-in IP detection (handles IPv6 properly)
 */
const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 refresh requests per hour per IP
  message: { error: 'Too many token refresh requests' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false
  },
  handler: (req, res) => {
    console.warn(`[SECURITY] Refresh token rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many token refresh requests',
      retryAfter: 60 // minutes
    });
  }
});

/**
 * Forgot Password Rate Limiter
 * - 3 requests per 15 minutes per IP
 * - Prevents email enumeration and spam attacks
 * - Uses built-in IP detection (handles IPv6 properly)
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: { error: 'Too many password reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false
  },
  handler: (req, res) => {
    console.warn(`[SECURITY] Forgot password rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many password reset requests, please try again later',
      retryAfter: 15 // minutes
    });
  }
});

/**
 * Reset Password Rate Limiter
 * - 5 attempts per 15 minutes per IP
 * - A 6-digit OTP has only 1 000 000 possibilities; without this limit
 *   an attacker can brute-force valid OTPs while the token is still live.
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    console.warn(`[SECURITY] Reset password rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many password reset attempts, please try again later',
      retryAfter: 15
    });
  }
});

/** Cookie options for httpOnly auth tokens – sent alongside the JSON body
 *  so existing localStorage-based clients still work while the migration
 *  to cookie-only auth is being rolled out.
 *
 *  sameSite notes:
 *  - Production: frontend (arjansinghjassal.xyz) and backend (onrender.com) are on
 *    different eTLD+1 domains, so we need sameSite:'none' + secure:true to allow
 *    the refresh-token cookie to be sent on cross-site XHR/fetch requests.
 *  - Development: both are on localhost (same site), so 'lax' is safe and avoids
 *    the browser requirement that sameSite:'none' always needs secure:true. */
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,          // HTTPS only in production
  sameSite: isProd ? 'none' : 'lax',  // 'none' required for cross-domain prod cookies
  path: '/'
};

// Validation middleware
const validateRegistration = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').custom((value) => {
    const validation = validatePassword(value);
    if (!validation.isValid) {
      throw new Error(validation.errors.join('. '));
    }
    return true;
  })
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public registration is disabled
// Users can only be created by Admin or HR through the user management system
router.post('/register', (req, res) => {
  res.status(403).json({ 
    message: 'Public registration is disabled. Please contact your administrator to create an account.' 
  });
});

// Community registration is no longer supported (single workspace SAAS)
router.post('/register-community', (req, res) => {
  res.status(403).json({ 
    message: 'Community registration is no longer available. Please contact your administrator.' 
  });
});

// Login - Protected by rate limiter to prevent brute force attacks
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with team populated
    const user = await User.findOne({ email })
      .populate('team_id', 'name description')
      .populate('teams', 'name');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is deactivated
    if (user.employmentStatus === 'INACTIVE') {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact your administrator for assistance.',
        accountDeactivated: true
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Log login event
    const user_ip = getClientIP(req);
    await logChange({
      event_type: 'user_login',
      user: user,
      user_ip,
      target_type: 'auth',
      target_id: user._id,
      target_name: user.full_name,
      action: 'login',
      description: `${user.full_name} (${user.email}) logged in successfully`,
      workspaceId: user.workspaceId || null,
      metadata: {
        role: user.role,
        team_id: user.team_id
      }
    });

    // Set httpOnly cookies so tokens are inaccessible to JavaScript (XSS mitigation)
    res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, path: '/api/auth/refresh', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture || null,
        team_id: user.team_id,
        workspaceId: user.workspaceId || null,
        isSystemAdmin: user.role === 'super_admin' || (user.role === 'admin' && !user.workspaceId),
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Refresh token - Protected by rate limiter to prevent token farming
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    // Accept refresh token from httpOnly cookie (preferred) or request body (legacy).
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Get user with team populated
    const user = await User.findById(decoded.userId)
      .populate('team_id', 'name description')
      .populate('teams', 'name');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Refresh cookies - tokens are only sent via httpOnly cookies
    res.cookie('access_token', newAccessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', newRefreshToken, { ...COOKIE_OPTS, path: '/api/auth/refresh', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        workspaceId: user.workspaceId || null,
        isSystemAdmin: user.role === 'super_admin' || (user.role === 'admin' && !user.workspaceId),
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify email with code
router.post('/verify-email', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').trim().notEmpty().withMessage('Verification code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;

    // Find user – return generic 200 for non-existent emails to prevent enumeration
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If that email is registered and unverified, a code has been sent.' });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified. You can now login.' });
    }

    // Check if verification code matches
    if (user.verificationToken !== code) {
      return res.status(400).json({ message: 'Invalid verification code. Please check your email and try again.' });
    }

    // Check if code has expired
    if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
      return res.status(400).json({ 
        message: 'Verification code has expired. Please request a new one.',
        codeExpired: true 
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    // Log verification event
    await logChange({
      event_type: 'system_event',
      user: user,
      user_ip: getClientIP(req),
      action: 'Email verified',
      description: `${user.full_name} (${user.email}) verified their email address`,
      metadata: {
        role: user.role
      }
    });

    res.status(200).json({
      message: 'Email verified successfully! You can now login.',
      verified: true,
      user: {
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user – return generic 200 to prevent email enumeration
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If that email is registered and unverified, a verification email has been sent.' });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified. You can now login.' });
    }

    // Generate new verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.verificationToken = verificationCode;
    user.verificationTokenExpiry = verificationExpiry;
    await user.save();

    // Get temporary password from request or use placeholder
    const tempPassword = req.body.password || '******';

    // Send new verification email
    await sendVerificationEmail(
      user.full_name, 
      user.email, 
      verificationCode, 
      tempPassword, 
      'AetherTrack'
    );

    res.status(200).json({
      message: 'Verification email resent successfully. Please check your inbox.',
      email: user.email
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  // Blacklist the current access token so it cannot be reused even before it expires
  const token = req.token; // set by authenticate middleware
  if (token) {
    const decoded = decodeToken(token);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;
    await addToBlacklist(token, expiresAt);
  }

  // Clear httpOnly cookies
  res.clearCookie('access_token', { ...COOKIE_OPTS });
  res.clearCookie('refresh_token', { ...COOKIE_OPTS, path: '/api/auth/refresh' });

  // Log logout event
  try {
    const user_ip = getClientIP(req);
    await logChange({
      event_type: 'user_logout',
      user: req.user,
      user_ip,
      target_type: 'auth',
      target_id: req.user._id,
      target_name: req.user.full_name,
      action: 'logout',
      description: `${req.user.full_name} (${req.user.email}) logged out`,
      workspaceId: req.user.workspaceId || null
    });
  } catch (logErr) {
    console.error('Logout audit log error:', logErr);
  }

  res.json({ message: 'Logged out successfully' });
});

// Forgot Password - Send reset link (rate limited to prevent abuse)
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        message: 'If an account exists with that email, a password reset code has been sent.' 
      });
    }

    // Generate 6-digit reset token
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user (updates existing token if any)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetExpiry;
    await user.save();

    // Send reset email
    await sendPasswordResetLink(user.full_name, user.email, resetToken);

    // Log password reset request
    const user_ip = getClientIP(req);
    await logChange({
      event_type: 'password_reset_request',
      user: user,
      user_ip,
      action: 'Password reset requested',
      description: `Password reset requested for ${user.email}`
    });

    res.json({ 
      message: 'If an account exists with that email, a password reset code has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Reset Password - Verify token and set new password
// Rate-limited: a 6-digit OTP has 1 000 000 possibilities; without this limit
// an attacker can brute-force the token before it expires.
router.post('/reset-password', resetPasswordLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').custom((value) => {
    const validation = validatePassword(value);
    if (!validation.isValid) {
      throw new Error(validation.errors.join('. '));
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, token, newPassword } = req.body;

    // Find user with valid token and email
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset code. Please request a new password reset.' 
      });
    }

    // Update password
    user.password_hash = newPassword; // Will be hashed by pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    // Log password reset
    const user_ip = getClientIP(req);
    await logChange({
      event_type: 'password_reset',
      user: user,
      user_ip,
      action: 'Password reset completed',
      description: `Password successfully reset for ${user.email}`
    });

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Verify token and get current user
router.get('/verify', authenticate, async (req, res) => {
  try {
    // User is already authenticated via middleware
    // Fetch fresh user data from database
    const user = await User.findById(req.user.id)
      .select('-password_hash')
      .populate('team_id', 'name lead_id members');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is deactivated
    if (user.deactivatedAt) {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact your administrator.',
        accountDeactivated: true 
      });
    }

    // Return user data
    res.json({ 
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        isEmailVerified: user.isEmailVerified,
        profile_picture: user.profile_picture,
        workspaceId: user.workspaceId || null,
        isSystemAdmin: user.role === 'super_admin' || (user.role === 'admin' && !user.workspaceId),
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;