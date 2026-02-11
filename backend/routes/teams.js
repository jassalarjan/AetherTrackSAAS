import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

const router = express.Router();

// Create team (HR, Admin & Community Admin)
router.post('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, hr_id, lead_id, members } = req.body;

    // Special validation for "Admin" team - only admins allowed
    const isAdminTeam = name && name.toLowerCase() === 'admin';
    
    if (isAdminTeam) {
      // Admin team should not have HR assigned
      return res.status(400).json({ 
        message: 'Admin team is reserved for super users only. Please use a different team name or create teams without HR designation for admin users.',
        hint: 'Admin users do not need to be part of a team structure'
      });
    }

    let hr = null;
    let lead = null;
    
    if (hr_id) {
      hr = await User.findOne({ _id: hr_id });
      if (!hr) {
        return res.status(400).json({ message: 'HR user not found' });
      }
      if (hr.role !== 'hr' && hr.role !== 'admin') {
        return res.status(400).json({ message: 'Selected HR user must have HR or Admin role' });
      }
    }
    
    if (lead_id) {
      lead = await User.findOne({ _id: lead_id });
      if (!lead) {
        return res.status(400).json({ message: 'Team Lead not found' });
      }
      if (!['team_lead', 'admin'].includes(lead.role)) {
        return res.status(400).json({ message: 'Selected team lead must have Team Lead or Admin role' });
      }
    }

    const finalHrId = hr_id;
    const finalLeadId = lead_id;

    if (!finalHrId || !finalLeadId) {
      return res.status(400).json({ message: 'HR and Team Lead are required' });
    }

    const team = new Team({
      name,
      hr_id: finalHrId,
      lead_id: finalLeadId,
      members: members || []
    });

    await team.save();

    if (finalLeadId) {
      await User.findByIdAndUpdate(finalLeadId, { team_id: team._id, $addToSet: { teams: team._id } });
    }

    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { team_id: team._id, $addToSet: { teams: team._id } }
      );
    }

    const populatedTeam = await Team.findById(team._id)
      .populate('hr_id', 'full_name email')
      .populate('lead_id', 'full_name email')
      .populate('members', 'full_name email role');

    // Emit socket event for team creation
    if (req.app.get('io')) {
      req.app.get('io').emit('team:created', populatedTeam);
    }

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
    
    if (req.user.role === 'team_lead') {
      query.lead_id = req.user._id;
    }

    const teams = await Team.find(query)
      .populate('hr_id', 'full_name email')
      .populate('lead_id', 'full_name email')
      .populate('members', 'full_name email role')
      .sort({ pinned: -1, priority: -1, created_at: -1 }); // Pinned first, then by priority, then by creation date

    res.json({ teams, count: teams.length });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single team
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.id })
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

// Update team (HR, Admin & Community Admin)
router.patch('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, lead_id } = req.body;
    const updates = {};

    if (name && name.toLowerCase() === 'admin') {
      return res.status(400).json({ 
        message: 'Admin team name is reserved for super users only',
        hint: 'Please choose a different team name'
      });
    }

    if (name) updates.name = name;
    if (lead_id) {
      const lead = await User.findOne({ _id: lead_id });
      if (!lead) {
        return res.status(400).json({ message: 'Team lead not found' });
      }
      
      if (!['team_lead', 'admin'].includes(lead.role)) {
        return res.status(400).json({ message: 'Selected user must have Team Lead or Admin role' });
      }
      
      updates.lead_id = lead_id;
    }

    const team = await Team.findOneAndUpdate(
      { _id: req.params.id },
      updates,
      { new: true }
    ).populate('hr_id lead_id members');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Emit socket event for team update
    if (req.app.get('io')) {
      req.app.get('io').emit('team:updated', team);
    }

    res.json({ message: 'Team updated', team });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle team pin status (Admin, HR & Community Admin)
router.patch('/:id/pin', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({ _id: id });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Toggle pinned status
    team.pinned = !team.pinned;
    
    if (team.pinned) {
      const maxPriority = await Team.findOne({}).sort({ priority: -1 }).select('priority');
      team.priority = maxPriority ? maxPriority.priority + 1 : 1;
    }

    await team.save();

    const updatedTeam = await Team.findOne({ _id: id })
      .populate('hr_id', 'full_name email')
      .populate('lead_id', 'full_name email')
      .populate('members', 'full_name email role');

    res.json({ 
      message: team.pinned ? 'Team pinned' : 'Team unpinned', 
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update team priority (Admin, HR & Community Admin)
router.patch('/:id/priority', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (typeof priority !== 'number') {
      return res.status(400).json({ message: 'Priority must be a number' });
    }

    const team = await Team.findOneAndUpdate(
      { _id: id },
      { priority },
      { new: true }
    ).populate('hr_id lead_id members');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team priority updated', team });
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reorder teams (Admin, HR & Community Admin)
router.post('/reorder', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { teamOrder } = req.body;

    if (!Array.isArray(teamOrder)) {
      return res.status(400).json({ message: 'teamOrder must be an array' });
    }

    const bulkOps = teamOrder.map((item, index) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { priority: teamOrder.length - index }
      }
    }));

    await Team.bulkWrite(bulkOps);

    res.json({ message: 'Teams reordered successfully' });
  } catch (error) {
    console.error('Reorder teams error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add member to team (Admin, HR & Community Admin)
router.post('/:id/members', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { userId } = req.body;
    const teamId = req.params.id;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const team = await Team.findOne({ _id: teamId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.members.includes(userId)) {
      return res.status(400).json({ message: 'User already in team' });
    }

    team.members.push(userId);
    await team.save();
    
    await User.findOneAndUpdate(
      { _id: userId },
      { team_id: teamId, $addToSet: { teams: teamId } }
    );

    const updatedTeam = await Team.findOne({ _id: teamId })
      .populate('hr_id lead_id members');

    res.json({ message: 'Member added to team', team: updatedTeam });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add multiple members to team (Admin, HR & Community Admin)
router.post('/:id/members/bulk', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { userIds } = req.body;
    const teamId = req.params.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    const team = await Team.findOne({ _id: teamId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const results = {
      added: [],
      skipped: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const user = await User.findOne({ _id: userId });
        if (!user) {
          results.failed.push({ userId, reason: 'User not found' });
          continue;
        }

        if (team.members.includes(userId)) {
          results.skipped.push({ userId, name: user.full_name, reason: 'Already a member' });
          continue;
        }

        team.members.push(userId);
        
        await User.findOneAndUpdate(
          { _id: userId },
          { team_id: teamId, $addToSet: { teams: teamId } }
        );

        results.added.push({ userId, name: user.full_name });
      } catch (error) {
        results.failed.push({ userId, reason: error.message });
      }
    }

    await team.save();

    const updatedTeam = await Team.findOne({ _id: teamId })
      .populate('hr_id lead_id members');

    res.json({ 
      message: `Added ${results.added.length} member(s) to team`,
      results,
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Bulk add members error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove member from team (Admin, HR & Community Admin)
// This route MUST come before DELETE /:id to avoid route conflict
router.delete('/:id/members/:userId', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const team = await Team.findOne({ _id: id });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    team.members = team.members.filter(m => m.toString() !== userId);
    await team.save();

    const user = await User.findOne({ _id: userId });
    
    if (user) {
      await User.findOneAndUpdate(
        { _id: userId },
        { $pull: { teams: id } }
      );
      
      const updatedUser = await User.findOne({ _id: userId });
      const newTeamId = updatedUser.teams && updatedUser.teams.length > 0 
        ? updatedUser.teams[0] 
        : null;
      
      await User.findOneAndUpdate(
        { _id: userId },
        { team_id: newTeamId }
      );
    }

    const updatedTeam = await Team.findOne({ _id: id })
      .populate('hr_id lead_id members');

    res.json({ message: 'Member removed from team', team: updatedTeam });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete team (Admin, HR & Community Admin)
// This route MUST come after DELETE /:id/members/:userId to avoid route conflict
router.delete('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({ _id: id });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const teamName = team.name;

    const usersInTeam = await User.find({ teams: id });
    
    for (const user of usersInTeam) {
      await User.findByIdAndUpdate(user._id, {
        $pull: { teams: id },
        updated_at: new Date()
      });
      
      const updatedUser = await User.findById(user._id);
      if (updatedUser.team_id && updatedUser.team_id.toString() === id.toString()) {
        const newTeamId = updatedUser.teams && updatedUser.teams.length > 0
          ? updatedUser.teams[0]
          : null;
        await User.findByIdAndUpdate(user._id, { team_id: newTeamId });
      }
    }

    await Team.findOneAndDelete({ _id: id });

    // Emit socket event for team deletion
    if (req.app.get('io')) {
      req.app.get('io').emit('team:deleted', { _id: id, name: teamName });
    }

    res.json({ 
      message: 'Team deleted successfully',
      team: { 
        id: id, 
        name: teamName,
        usersAffected: team.members.length + 1 // members + lead
      }
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk delete all teams (Admin, HR & Community Admin)
router.delete('/bulk/all', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const teams = await Team.find({});
    
    if (teams.length === 0) {
      return res.status(404).json({ message: 'No teams found to delete' });
    }

    const teamIds = teams.map(t => t._id);
    const teamCount = teams.length;

    await User.updateMany(
      {},
      { 
        $set: { team_id: null, teams: [], updated_at: new Date() }
      }
    );

    await Team.deleteMany({});

    // Emit socket event for bulk deletion
    if (req.app.get('io')) {
      req.app.get('io').emit('team:bulk-deleted', {
        count: teamCount
      });
    }

    res.json({ 
      message: `Successfully deleted ${teamCount} team(s)`,
      count: teamCount
    });
  } catch (error) {
    console.error('Bulk delete teams error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

