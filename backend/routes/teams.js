import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

const router = express.Router();

// Create team (HR & Admin only)
router.post('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, hr_id, lead_id, members } = req.body;

    // Verify HR and Lead exist
    const hr = await User.findById(hr_id);
    const lead = await User.findById(lead_id);

    if (!hr || !lead) {
      return res.status(400).json({ message: 'HR or Team Lead not found' });
    }

    const team = new Team({
      name,
      hr_id,
      lead_id,
      members: members || []
    });

    await team.save();

    // Update team lead's team_id
    await User.findByIdAndUpdate(lead_id, { team_id: team._id });

    // Update members' team_id
    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { team_id: team._id }
      );
    }

    const populatedTeam = await Team.findById(team._id)
      .populate('hr_id', 'full_name email')
      .populate('lead_id', 'full_name email')
      .populate('members', 'full_name email role');

    res.status(201).json({ message: 'Team created', team: populatedTeam });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all teams (HR & Admin)
router.get('/', authenticate, checkRole(['admin', 'hr', 'team_lead']), async (req, res) => {
  try {
    let query = {};
    
    // Team leads can only see their own team
    if (req.user.role === 'team_lead') {
      query = { lead_id: req.user._id };
    }

    const teams = await Team.find(query)
      .populate('hr_id', 'full_name email')
      .populate('lead_id', 'full_name email')
      .populate('members', 'full_name email role')
      .sort({ created_at: -1 });

    res.json({ teams, count: teams.length });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single team
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('hr_id', 'full_name email')
      .populate('lead_id', 'full_name email')
      .populate('members', 'full_name email role');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update team (HR & Admin only)
router.patch('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, lead_id } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (lead_id) {
      const lead = await User.findById(lead_id);
      if (!lead) {
        return res.status(400).json({ message: 'Team lead not found' });
      }
      updates.lead_id = lead_id;
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('hr_id lead_id members');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team updated', team });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add member to team (HR only)
router.post('/:id/members', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { userId } = req.body;
    const teamId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if already a member
    if (team.members.includes(userId)) {
      return res.status(400).json({ message: 'User already in team' });
    }

    // Add to team
    team.members.push(userId);
    await team.save();

    // Update user's team_id
    await User.findByIdAndUpdate(userId, { team_id: teamId });

    const updatedTeam = await Team.findById(teamId)
      .populate('hr_id lead_id members');

    res.json({ message: 'Member added to team', team: updatedTeam });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove member from team (HR only)
router.delete('/:id/members/:userId', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Remove from team
    team.members = team.members.filter(m => m.toString() !== userId);
    await team.save();

    // Update user's team_id
    await User.findByIdAndUpdate(userId, { team_id: null });

    const updatedTeam = await Team.findById(id)
      .populate('hr_id lead_id members');

    res.json({ message: 'Member removed from team', team: updatedTeam });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;