import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import LeaveType from '../models/LeaveType.js';
import LeaveBalance from '../models/LeaveBalance.js';
import User from '../models/User.js';
import { logChange } from '../utils/changeLogService.js';
import getClientIP from '../utils/getClientIP.js';

const router = express.Router();

// Get all leave types
router.get('/', authenticate, async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({ 
      isActive: true 
    }).sort({ name: 1 });

    res.json({ success: true, leaveTypes });
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({ message: 'Failed to fetch leave types' });
  }
});

// Create leave type (Admin/HR only)
router.post('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, code, annualQuota, carryForward, maxCarryForward, color, description } = req.body;

    const leaveType = new LeaveType({
      name,
      code: code.toUpperCase(),
      annualQuota,
      carryForward: carryForward || false,
      maxCarryForward: maxCarryForward || 0,
      color: color || '#3b82f6',
      description: description || ''
    });

    await leaveType.save();

    // Initialize balances for all users
    const users = await User.find({}).select('_id');
    const currentYear = new Date().getFullYear();

    const balancePromises = users.map(user =>
      LeaveBalance.create({
        userId: user._id,
        leaveTypeId: leaveType._id,
        year: currentYear,
        totalQuota: annualQuota
      })
    );

    await Promise.all(balancePromises);

    await logChange({
      userId: req.user._id,
      action: 'create',
      entity: 'leave_type',
      entityId: leaveType._id,
      details: { name, code, annualQuota },
      ipAddress: getClientIP(req)
    });

    res.status(201).json({ success: true, leaveType });
  } catch (error) {
    console.error('Create leave type error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Leave type code already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create leave type' });
    }
  }
});

// Update leave type
router.put('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, annualQuota, carryForward, maxCarryForward, color, description, isActive } = req.body;

    const leaveType = await LeaveType.findOne({ _id: req.params.id });

    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    leaveType.name = name || leaveType.name;
    leaveType.annualQuota = annualQuota !== undefined ? annualQuota : leaveType.annualQuota;
    leaveType.carryForward = carryForward !== undefined ? carryForward : leaveType.carryForward;
    leaveType.maxCarryForward = maxCarryForward !== undefined ? maxCarryForward : leaveType.maxCarryForward;
    leaveType.color = color || leaveType.color;
    leaveType.description = description !== undefined ? description : leaveType.description;
    leaveType.isActive = isActive !== undefined ? isActive : leaveType.isActive;

    await leaveType.save();

    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'leave_type',
      entityId: leaveType._id,
      details: req.body,
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, leaveType });
  } catch (error) {
    console.error('Update leave type error:', error);
    res.status(500).json({ message: 'Failed to update leave type' });
  }
});

// Delete leave type (soft delete)
router.delete('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const leaveType = await LeaveType.findOne({ _id: req.params.id });

    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    leaveType.isActive = false;
    await leaveType.save();

    await logChange({
      userId: req.user._id,
      action: 'delete',
      entity: 'leave_type',
      entityId: leaveType._id,
      details: { name: leaveType.name },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, message: 'Leave type deactivated' });
  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({ message: 'Failed to delete leave type' });
  }
});

export default router;
