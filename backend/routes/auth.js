import express from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { logChange } from '../utils/changeLogService.js';
import { authenticate } from '../middleware/auth.js';
import getClientIP from '../utils/getClientIP.js';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

// WORKSPACE SUPPORT: Community workspace registration
// Creates a new COMMUNITY workspace with an admin user
router.post('/register-community', [
  body('workspace_name').trim().notEmpty().withMessage('Workspace name is required'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { workspace_name, full_name, email, password } = req.body;

    // Check if user with this email already exists (across all workspaces)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }

    // Create temporary user ID for workspace creation
    const tempUserId = new mongoose.Types.ObjectId();

    // Create COMMUNITY workspace
    const workspace = new Workspace({
      name: workspace_name,
      type: 'COMMUNITY',
      owner: tempUserId,
      isActive: true,
      // Default COMMUNITY settings and limits are set by pre-save hook
    });

    await workspace.save();

    // Create community admin user for this workspace
    const user = new User({
      _id: tempUserId,
      full_name,
      email,
      password_hash: password, // Will be hashed by pre-save hook
      role: 'community_admin',
      workspaceId: workspace._id,
      team_id: null,
    });

    await user.save();

    // Update workspace usage
    workspace.usage.userCount = 1;
    await workspace.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Log workspace creation
    await logChange({
      event_type: 'system_event',
      user: user,
      user_ip: getClientIP(req),
      action: 'Community workspace created',
      description: `New COMMUNITY workspace "${workspace_name}" created by ${full_name}`,
      metadata: {
        workspaceId: workspace._id,
        workspaceType: 'COMMUNITY',
        workspaceName: workspace_name,
      },
      workspaceId: workspace._id,
    });

    res.status(201).json({
      message: 'Community workspace created successfully',
      workspace: {
        id: workspace._id,
        name: workspace.name,
        type: workspace.type,
      },
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Community registration error:', error);
    res.status(500).json({ 
      message: 'Failed to create community workspace', 
      error: error.message 
    });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with team and workspace populated
    const user = await User.findOne({ email })
      .populate('team_id', 'name description')
      .populate('workspaceId', 'name type settings');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // SYSTEM ADMIN: Admins and community_admins can have special handling
    // Regular users must have workspace
    if (!user.workspaceId) {
      if (user.role !== 'admin' && user.role !== 'community_admin') {
        return res.status(403).json({ 
          message: 'Your account is not associated with any workspace. Please contact support.' 
        });
      }
      // Admin without workspace = system admin, continue login
      // Community admin without workspace = edge case, allow login
    } else {
      // Check if workspace is active (default to true if not set)
      if (user.workspaceId.isActive === false) {
        return res.status(403).json({ 
          message: 'Your workspace has been deactivated. Please contact support.',
          workspaceId: user.workspaceId._id,
          workspaceName: user.workspaceId.name
        });
      }
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
      action: 'User logged in',
      description: `${user.full_name} (${user.email}) logged in successfully`,
      metadata: {
        role: user.role,
        team_id: user.team_id,
        workspaceId: user.workspaceId?._id || null,
        workspaceType: user.workspaceId?.type || 'SYSTEM',
        isSystemAdmin: !user.workspaceId && user.role === 'admin'
      },
      workspaceId: user.workspaceId?._id || null,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture || null,
        team_id: user.team_id,
        workspaceId: user.workspaceId?._id || null,
        isSystemAdmin: !user.workspaceId && user.role === 'admin'
      },
      workspace: user.workspaceId ? {
        id: user.workspaceId._id,
        name: user.workspaceId.name,
        type: user.workspaceId.type,
        features: user.workspaceId.settings?.features || {},
      } : null,  // null for system admins
      isSystemAdmin: !user.workspaceId && user.role === 'admin',
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Get user with team and workspace populated
    const user = await User.findById(decoded.userId)
      .populate('team_id', 'name description')
      .populate('workspaceId', 'name type settings');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // SYSTEM ADMIN: Check workspace status only for non-admin users
    if (user.workspaceId) {
      if (!user.workspaceId.isActive) {
        return res.status(403).json({ 
          message: 'Workspace is not available' 
        });
      }
    } else if (user.role !== 'admin') {
      // Non-admin without workspace should not be allowed
      return res.status(403).json({ 
        message: 'Workspace is not available' 
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        workspaceId: user.workspaceId?._id || null
      },
      workspace: user.workspaceId ? {
        id: user.workspaceId._id,
        name: user.workspaceId.name,
        type: user.workspaceId.type,
        features: user.workspaceId.settings?.features || {},
      } : null,
      isSystemAdmin: !user.workspaceId && user.role === 'admin',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  // Log logout event
  const user_ip = getClientIP(req);
  await logChange({
    event_type: 'user_logout',
    user: req.user,
    user_ip,
    action: 'User logged out',
    description: `${req.user.full_name} (${req.user.email}) logged out`
  });

  // In a production app, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

export default router;