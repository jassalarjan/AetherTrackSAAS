import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { sendCredentialEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { logChange } from '../utils/changeLogService.js';
import HrActionService from '../services/hrActionService.js';
import multer from 'multer';
import ExcelJS from 'exceljs';
import getClientIP from '../utils/getClientIP.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { validateIdParam, sanitizeBody, isValidObjectId } from '../utils/validation.js';

const router = express.Router();
const MAX_BULK_IMPORT_ROWS = 1000;
const MAX_BULK_IMPORT_COLUMNS = 20;
const MAX_CELL_LENGTH = 512;

// =============================================================================
// SECURITY: Generic Error Response Helper
// =============================================================================
// In production, we return generic error messages to prevent information leakage
// Only detailed errors are logged server-side for debugging
const handleError = (res, error, context = 'operation') => {
  // Log full error server-side for debugging
  console.error(`[ERROR] ${context}:`, error);
  
  // Return generic message in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
  
  // Return detailed errors in development
  return res.status(500).json({ message: error.message || 'Server error' });
};

const sanitizeBulkValue = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  let normalized = value;

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      normalized = value.richText.map((part) => part?.text || '').join('');
    } else if (typeof value.text === 'string') {
      normalized = value.text;
    } else if (typeof value.result !== 'undefined') {
      normalized = value.result;
    } else if (typeof value.hyperlink === 'string') {
      normalized = value.hyperlink;
    } else if (value instanceof Date) {
      normalized = value.toISOString();
    } else {
      normalized = '';
    }
  }

  const text = String(normalized).replace(/\u0000/g, '').trim();
  return text.length > MAX_CELL_LENGTH ? text.slice(0, MAX_CELL_LENGTH) : text;
};

const parseExcelUsers = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const rawHeaders = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = rawHeaders
    .map((header) => sanitizeBulkValue(header).toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_BULK_IMPORT_COLUMNS);

  if (headers.length === 0) {
    return [];
  }

  const users = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    if (users.length >= MAX_BULK_IMPORT_ROWS) {
      break;
    }

    const row = worksheet.getRow(rowNumber);
    const entry = {};
    let hasData = false;

    headers.forEach((header, index) => {
      const cellValue = sanitizeBulkValue(row.getCell(index + 1).value);
      if (cellValue) {
        hasData = true;
      }
      entry[header] = cellValue;
    });

    if (hasData) {
      users.push(entry);
    }
  }

  return users;
};

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/json'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and JSON files are allowed.'));
    }
  }
});

// Validation middleware for user creation
const validateUserCreation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').custom((value) => {
    const validation = validatePassword(value);
    if (!validation.isValid) {
      throw new Error(validation.errors.join('. '));
    }
    return true;
  }),
  body('role').isIn(['admin', 'hr', 'team_lead', 'member']).withMessage('Invalid role')
];

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id })
      .select('-password_hash')
      .populate('team_id')
      .populate('teams', 'name');
    
    res.json({ user });
  } catch (error) {
    return handleError(res, error, 'Get current user');
  }
});

// Update current user profile
router.patch('/me', authenticate, sanitizeBody(['full_name']), async (req, res) => {
  try {
    const { full_name } = req.body;
    const updates = {};

    if (full_name) updates.full_name = full_name;
    updates.updated_at = Date.now();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password_hash');

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    return handleError(res, error, 'Update profile');
  }
});

// Upload profile picture (authenticated users only)
router.post('/me/profile-picture', authenticate, async (req, res) => {
  try {
    const { profile_picture } = req.body;

    // Validate that it's a valid base64 image
    if (!profile_picture) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }

    // Check if it's a valid data URL format
    const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
    if (!dataUrlRegex.test(profile_picture)) {
      return res.status(400).json({ message: 'Invalid image format. Please upload a valid image.' });
    }

    // Check file size (limit to ~2MB base64 which is about 1.5MB actual file)
    const base64Data = profile_picture.split(',')[1];
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (sizeInBytes > maxSize) {
      return res.status(400).json({ message: 'Image too large. Maximum size is 2MB.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profile_picture, updated_at: Date.now() },
      { new: true }
    ).select('-password_hash');

    res.json({ 
      message: 'Profile picture updated successfully', 
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        team_id: user.team_id
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete profile picture (authenticated users only)
router.delete('/me/profile-picture', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profile_picture: null, updated_at: Date.now() },
      { new: true }
    ).select('-password_hash');

    res.json({ 
      message: 'Profile picture removed successfully', 
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: null,
        team_id: user.team_id
      }
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password (authenticated users only)
router.post('/me/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both old and new passwords are required' });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors 
      });
    }

    // Get user with password hash
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password_hash = newPassword;
    user.updated_at = Date.now();
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return handleError(res, error, 'Change password');
  }
});

// Get all users (Admin, HR & Community Admin)
router.get('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password_hash')
      .populate('team_id')
      .populate('teams', 'name')
      .sort({ created_at: -1 });

    res.json({ users, count: users.length });
  } catch (error) {
    return handleError(res, error, 'Get all users');
  }
});

// Get users for team lead - returns team members + the team lead themselves
router.get('/team-members', authenticate, checkRole(['team_lead']), async (req, res) => {
  try {
    // Find the team where the user is the team lead
    const team = await Team.findOne({ lead_id: req.user._id }).populate('members', '-password_hash');
    
    if (!team) {
      return res.json({ users: [], count: 0 });
    }

    // Get all team members
    let users = team.members || [];
    
    // Add the team lead to the list if not already included
    const teamLeadIncluded = users.some(member => member._id.toString() === req.user._id.toString());
    if (!teamLeadIncluded) {
      const teamLead = await User.findById(req.user._id)
        .select('-password_hash')
        .populate('team_id')
        .populate('teams', 'name');
      if (teamLead) {
        users = [teamLead, ...users];
      }
    }

    res.json({ users, count: users.length });
  } catch (error) {
    return handleError(res, error, 'Get team members');
  }
});

// Get single user by ID (Admin, HR & Community Admin)
router.get('/:id', authenticate, checkRole(['admin', 'hr']), validateIdParam(), async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id })
      .select('-password_hash')
      .populate('team_id', 'name')
      .populate('teams', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user (Admin, HR & Community Admin)
router.post('/', authenticate, checkRole(['admin', 'hr']), validateUserCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password, role, team_id } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Admin users should not be assigned to teams
    if (role === 'admin' && team_id) {
      return res.status(400).json({ 
        message: 'Admin users cannot be assigned to teams',
        hint: 'Admin users are super users and work across all teams'
      });
    }

    // Create user
    // Admin-created users are pre-verified — they receive credentials directly
    // via email from the admin, so no separate email verification step is needed.
    const user = new User({
      full_name,
      email,
      password_hash: password,
      role: role || 'member',
      team_id: (role === 'admin') ? null : (team_id || null),
      isEmailVerified: true,
    });

    await user.save();

    // Send credential email with timeout (non-blocking)
    // Don't wait more than 10 seconds for email
    const emailPromise = Promise.race([
      sendCredentialEmail(full_name, email),
      new Promise((resolve) => 
        setTimeout(() => resolve({ 
          success: false, 
          status: 'timeout', 
          error: 'Email sending timeout - will retry in background' 
        }), 10000)
      )
    ]);

    // Send email in background and respond immediately
    let emailSent = false;
    emailPromise
      .then((emailResult) => {
        // Email result handled silently
      })
      .catch((error) => {
        console.error('❌ Email error:', error.message);
      });

    // Get user response immediately
    const userResponse = await User.findById(user._id)
      .select('-password_hash')
      .populate('team_id')
      .populate('teams', 'name');

    // Log user creation
    const user_ip = getClientIP(req);
    await logChange({
      event_type: 'user_created',
      user: req.user,
      user_ip,
      target_type: 'user',
      target_id: user._id.toString(),
      target_name: full_name,
      action: 'Created user',
      description: `${req.user.full_name} created user account for ${full_name} (${email}) with role ${role}`,
      metadata: {
        email,
        role,
        team_id
      }
    });

    // Emit socket event for user creation
    if (req.app.get('io')) {
      req.app.get('io').emit('user:created', userResponse);
    }

    // Respond immediately without waiting for email
    res.status(201).json({
      message: 'User created successfully. Credentials will be sent via email.',
      user: userResponse,
      emailQueued: true
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ 
        message: 'Email already registered',
        error: 'A user with this email address already exists in the system'
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk delete users (Admin & HR) - MUST be before /:id routes
router.post('/bulk-delete', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    // Filter out the current user's ID to prevent self-deletion
    const selfFiltered = userIds.filter(id => id !== req.user._id.toString());

    if (selfFiltered.length === 0) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Protect admin (super admin) users — resolve targets and exclude admins
    const candidates = await User.find({ _id: { $in: selfFiltered } });
    const adminCandidates = candidates.filter(u => u.role === 'admin');
    const idsToDelete = selfFiltered.filter(id =>
      !adminCandidates.some(u => u._id.toString() === id)
    );

    if (idsToDelete.length === 0) {
      return res.status(403).json({ message: 'Admin users are protected and cannot be deleted.' });
    }

    const usersToDelete = candidates.filter(u => idsToDelete.includes(u._id.toString()));

    for (const user of usersToDelete) {
      if (user.teams && user.teams.length > 0) {
        await Team.updateMany(
          { _id: { $in: user.teams } },
          { $pull: { members: user._id } }
        );
      } else if (user.team_id) {
        await Team.findByIdAndUpdate(
          user.team_id,
          { $pull: { members: user._id } }
        );
      }
    }

    const result = await User.deleteMany({ _id: { $in: idsToDelete } });

    // Emit socket event for bulk user deletion
    if (req.app.get('io')) {
      req.app.get('io').emit('users:bulk-deleted', { userIds: idsToDelete, count: result.deletedCount });
    }

    res.json({ 
      message: `Successfully deleted ${result.deletedCount} user(s)`,
      deletedCount: result.deletedCount,
      attempted: idsToDelete.length
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (Admin, HR & Community Admin)
router.put('/:id', authenticate, checkRole(['admin', 'hr']), validateIdParam(), sanitizeBody(['full_name']), async (req, res) => {
  try {
    const { full_name, email, role, team_id } = req.body;
    const { id } = req.params;

    if (role && !['admin', 'hr', 'team_lead', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const currentUser = await User.findOne({ _id: id });
    
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken in this workspace
    if (email && email !== currentUser.email) {
      const existingUser = await User.findOne({ 
        email,
        _id: { $ne: id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Admin users should not be assigned to teams
    if (role === 'admin' && team_id) {
      return res.status(400).json({ 
        message: 'Admin users cannot be assigned to teams',
        hint: 'Admin users are super users and work across all teams'
      });
    }

    // If changing to admin role, remove team assignment
    let finalTeamId = team_id;
    if (role === 'admin') {
      finalTeamId = null;
    }

    const updates = {
      updated_at: Date.now()
    };

    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;
    if (role) {
      updates.role = role;
      // Automatically remove team if upgrading to admin
      if (role === 'admin') {
        updates.team_id = null;
        updates.teams = [];  // Clear teams array for admins
      }
    }
    if (finalTeamId !== undefined && role !== 'admin') {
      updates.team_id = finalTeamId;
      if (finalTeamId) {
        updates.$addToSet = { teams: finalTeamId };
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password_hash').populate('team_id', 'name').populate('teams', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Emit socket event for user update
    if (req.app.get('io')) {
      req.app.get('io').emit('user:updated', user);
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    return handleError(res, error, 'Update user');
  }
});

// Delete user (Admin & HR)
router.delete('/:id', authenticate, checkRole(['admin', 'hr']), validateIdParam(), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // WORKSPACE SUPPORT: Find and delete user only within current workspace
    const user = await User.findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect admin (super admin) users from deletion
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin users are protected and cannot be deleted.' });
    }

    if (user.teams && user.teams.length > 0) {
      await Team.updateMany(
        { _id: { $in: user.teams } },
        { $pull: { members: user._id } }
      );
    } else if (user.team_id) {
      await Team.findByIdAndUpdate(
        user.team_id,
        { $pull: { members: user._id } }
      );
    }

    await User.findByIdAndDelete(id);

    // Emit socket event for user deletion
    if (req.app.get('io')) {
      req.app.get('io').emit('user:deleted', { _id: user._id, email: user.email });
    }

    res.json({ message: 'User deleted successfully', user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset user password (Admin, HR & Community Admin)
router.patch('/:id/password', authenticate, checkRole(['admin', 'hr', 'community_admin']), validateIdParam(), async (req, res) => {
  try {
    const { password } = req.body;
    const { id } = req.params;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password_hash = password;
    user.updated_at = Date.now();
    await user.save();

    // Send password reset email (non-blocking, fire and forget)
    sendPasswordResetEmail(user.full_name, user.email)
      .then((emailResult) => {
        // Email result handled silently
      })
      .catch((error) => {
        console.error('❌ Password reset email error:', error.message);
      });

    res.json({ 
      message: 'Password reset successfully. Notify the user through a secure channel.',
      emailQueued: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role (Admin & HR only)
router.patch('/:id/role', authenticate, checkRole(['admin', 'hr']), validateIdParam(), async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!['admin', 'hr', 'team_lead', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role, updated_at: Date.now() },
      { new: true }
    ).select('-password_hash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated', user });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== BULK IMPORT ENDPOINTS ==========

// Bulk import users from JSON
router.post('/bulk-import/json', authenticate, checkRole(['admin', 'hr']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse JSON file
    let usersData;
    try {
      const jsonContent = req.file.buffer.toString('utf-8');
      usersData = JSON.parse(jsonContent);
    } catch (error) {
      return handleError(res, error, 'Parse JSON file');
    }

    // Validate that it's an array
    if (!Array.isArray(usersData)) {
      return res.status(400).json({ message: 'JSON file must contain an array of users' });
    }

    const results = await processBulkUsers(usersData, req.user);
    
    res.json({
      message: 'Bulk import completed',
      ...results
    });
  } catch (error) {
    console.error('Bulk import JSON error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk import users from Excel
router.post('/bulk-import/excel', authenticate, checkRole(['admin', 'hr']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse Excel file
    let usersData;
    try {
      usersData = await parseExcelUsers(req.file.buffer);
    } catch (error) {
      return handleError(res, error, 'Parse Excel file');
    }

    if (usersData.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    const results = await processBulkUsers(usersData, req.user);
    
    res.json({
      message: 'Bulk import completed',
      ...results
    });
  } catch (error) {
    console.error('Bulk import Excel error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to process bulk users
async function processBulkUsers(usersData, currentUser) {
  if (!Array.isArray(usersData)) {
    throw new Error('Invalid bulk payload format');
  }

  const boundedUsersData = usersData.slice(0, MAX_BULK_IMPORT_ROWS);

  const results = {
    total: boundedUsersData.length,
    successful: [],
    failed: [],
    teamsCreated: []
  };

  if (usersData.length > MAX_BULK_IMPORT_ROWS) {
    results.failed.push({
      row: 'N/A',
      email: 'N/A',
      reason: `Only the first ${MAX_BULK_IMPORT_ROWS} rows were processed.`
    });
  }

  for (let i = 0; i < boundedUsersData.length; i++) {
    const userData = boundedUsersData[i];
    const rowNumber = i + 1;

    try {
      const fullName = sanitizeBulkValue(userData.full_name);
      const email = sanitizeBulkValue(userData.email).toLowerCase();
      const password = sanitizeBulkValue(userData.password);

      // Validate required fields
      if (!fullName || !email || !password) {
        results.failed.push({
          row: rowNumber,
          email: email || 'N/A',
          reason: 'Missing required fields (full_name, email, password)'
        });
        continue;
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        results.failed.push({
          row: rowNumber,
          email,
          reason: `Password requirements not met: ${passwordValidation.errors.join(', ')}`
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.failed.push({
          row: rowNumber,
          email,
          reason: 'Invalid email format'
        });
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        results.failed.push({
          row: rowNumber,
          email,
          reason: 'User with this email already exists'
        });
        continue;
      }

      // Validate and set role
      const validRoles = ['admin', 'hr', 'team_lead', 'member'];
      const role = sanitizeBulkValue(userData.role || 'member').toLowerCase() || 'member';
      if (!validRoles.includes(role)) {
        results.failed.push({
          row: rowNumber,
          email,
          reason: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
        continue;
      }

      // Handle team assignment - support both single team and multiple teams
      let teamId = null;
      let teamIds = [];
      
      // Parse teams - can be comma-separated string or array
      let teamNames = [];
      if (userData.teams) {
        if (Array.isArray(userData.teams)) {
          teamNames = userData.teams.map((teamName) => sanitizeBulkValue(teamName)).filter(Boolean);
        } else if (typeof userData.teams === 'string') {
          // Split comma-separated string and trim
          teamNames = userData.teams.split(',').map((t) => sanitizeBulkValue(t)).filter(Boolean);
        }
      } else if (userData.team || userData.team_name) {
        // Fallback to single team field for backward compatibility
        teamNames = [sanitizeBulkValue(userData.team || userData.team_name)].filter(Boolean);
      }
      
      // Process each team
      for (const teamName of teamNames) {
        // Try to find existing team
        let team = await Team.findOne({ name: teamName });
        
        // If team doesn't exist, create it
        if (!team) {
          team = new Team({
            name: teamName,
            description: `Auto-created during bulk user import`,
            hr_id: currentUser._id,
            lead_id: currentUser._id,
            members: []
          });
          await team.save();
          
          // Track created teams
          if (!results.teamsCreated.find(t => t.name === teamName)) {
            results.teamsCreated.push({
              name: teamName,
              id: team._id
            });
          }
        }
        
        teamIds.push(team._id);
      }
      
      // Set primary team (first team or fallback to single team field)
      if (teamIds.length > 0) {
        teamId = teamIds[0];
      }
      
      // Validate employment status
      const validStatuses = ['ACTIVE', 'INACTIVE', 'ON_NOTICE', 'EXITED'];
      const employmentStatus = userData.employment_status 
        ? sanitizeBulkValue(userData.employment_status).toUpperCase() 
        : 'ACTIVE';
      
      if (!validStatuses.includes(employmentStatus)) {
        results.failed.push({
          row: rowNumber,
          email,
          reason: `Invalid employment_status. Must be one of: ${validStatuses.join(', ')}`
        });
        continue;
      }

      // Create user with teams array
      const newUser = new User({
        full_name: fullName,
        email,
        password_hash: password,
        role: role,
        team_id: teamId,
        teams: teamIds,
        employment_status: employmentStatus
      });

      await newUser.save();

      // Add user to all assigned teams' members
      for (const tId of teamIds) {
        await Team.findByIdAndUpdate(
          tId,
          { $addToSet: { members: newUser._id } },
          { new: true }
        );
      }

      // Try to send credential email (don't fail import if email fails)
      try {
        await sendCredentialEmail(fullName, email);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }

      results.successful.push({
        row: rowNumber,
        email,
        full_name: fullName,
        role: role,
        teams: teamNames.length > 0 ? teamNames.join(', ') : 'None',
        employment_status: employmentStatus
      });

    } catch (error) {
      results.failed.push({
        row: rowNumber,
        email: sanitizeBulkValue(userData.email) || 'N/A',
        reason: error.message
      });
    }
  }

  return results;
}

// Download sample Excel template
router.get('/bulk-import/template', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    // Create sample data
    const sampleData = [
      {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'ChangeMe@2024!',
        role: 'member',
        team: 'Development',
        teams: 'Development, QA',
        employment_status: 'ACTIVE'
      },
      {
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'ChangeMe@2024!',
        role: 'team_lead',
        team: 'Design',
        teams: 'Design, Marketing',
        employment_status: 'ACTIVE'
      },
      {
        full_name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        password: 'ChangeMe@2024!',
        role: 'hr',
        team: 'Human Resources',
        teams: 'Human Resources',
        employment_status: 'ACTIVE'
      }
    ];

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    worksheet.columns = [
      { header: 'full_name', key: 'full_name', width: 20 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'password', key: 'password', width: 15 },
      { header: 'role', key: 'role', width: 12 },
      { header: 'team', key: 'team', width: 20 },
      { header: 'teams', key: 'teams', width: 30 },
      { header: 'employment_status', key: 'employment_status', width: 18 }
    ];

    sampleData.forEach((row) => {
      worksheet.addRow(row);
    });

    worksheet.getRow(1).font = { bold: true };

    // Generate buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=user_import_template.xlsx');
    res.send(Buffer.from(excelBuffer));
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download sample JSON template
router.get('/bulk-import/template-json', authenticate, checkRole(['admin', 'hr']), (req, res) => {
  try {
    const sampleData = [
      {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'ChangeMe@2024!',
        role: 'member',
        team: 'Development',
        teams: ['Development', 'QA'],
        employment_status: 'ACTIVE'
      },
      {
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'ChangeMe@2024!',
        role: 'team_lead',
        team: 'Design',
        teams: ['Design', 'Marketing'],
        employment_status: 'ACTIVE'
      },
      {
        full_name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        password: 'ChangeMe@2024!',
        role: 'hr',
        team: 'Human Resources',
        teams: ['Human Resources'],
        employment_status: 'ACTIVE'
      }
    ];

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=user_import_template.json');
    res.json(sampleData);
  } catch (error) {
    console.error('JSON template download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Activate employee (HR, Admin, Community Admin)
router.patch('/:id/activate', authenticate, checkRole(['hr', 'admin']), validateIdParam(), async (req, res) => {
 try {
   const { id } = req.params;
   const ipAddress = getClientIP(req);

   const result = await HrActionService.activateEmployee(
     req.user,
     id,
     null,
     ipAddress
   );

   res.json({
     message: 'Employee activated successfully',
     employee: {
       id: result.data.employeeId,
       name: result.data.employeeName,
       email: result.data.employeeEmail
     }
   });
 } catch (error) {
   console.error('Employee activation error:', error);
   res.status(400).json({ message: error.message });
 }
});

// Deactivate employee (HR, Admin, Community Admin)
router.patch('/:id/deactivate', authenticate, checkRole(['hr', 'admin']), validateIdParam(), async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = getClientIP(req);

    const targetUser = await User.findOne({ _id: id });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await HrActionService.deactivateEmployee(
      req.user,
      id,
      null,
      ipAddress
    );

   res.json({
     message: 'Employee deactivated successfully',
     employee: {
       id: result.data.employeeId,
       name: result.data.employeeName,
       email: result.data.employeeEmail
     }
   });
 } catch (error) {
   console.error('Employee deactivation error:', error);
   res.status(400).json({ message: error.message });
 }
});

export default router;

