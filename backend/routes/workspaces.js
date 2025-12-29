import express from 'express';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import { authenticate } from '../middleware/auth.js';
import workspaceContext from '../middleware/workspaceContext.js';
import { logChange } from '../utils/changeLogService.js';

const router = express.Router();

// System admin guard middleware
const requireSystemAdmin = (req, res, next) => {
  if (!req.context.isSystemAdmin) {
    return res.status(403).json({ 
      message: 'Access denied. System administrator privileges required.' 
    });
  }
  next();
};

// Apply authentication and workspace context to all routes
router.use(authenticate);
router.use(workspaceContext);

// Get all workspaces (System Admin only)
router.get('/', requireSystemAdmin, async (req, res) => {
  try {
    const workspaces = await Workspace.find().sort({ createdAt: -1 });
    
    // Fetch statistics for each workspace
    const workspacesWithStats = await Promise.all(
      workspaces.map(async (workspace) => {
        const [userCount, taskCount, teamCount] = await Promise.all([
          User.countDocuments({ workspaceId: workspace._id }),
          Task.countDocuments({ workspaceId: workspace._id }),
          Team.countDocuments({ workspaceId: workspace._id })
        ]);

        return {
          ...workspace.toObject(),
          stats: {
            userCount,
            taskCount,
            teamCount,
            usage: {
              users: workspace.type === 'COMMUNITY' 
                ? `${userCount}/${workspace.limits.maxUsers}` 
                : `${userCount}/Unlimited`,
              tasks: workspace.type === 'COMMUNITY' 
                ? `${taskCount}/${workspace.limits.maxTasks}` 
                : `${taskCount}/Unlimited`,
              teams: workspace.type === 'COMMUNITY' 
                ? `${teamCount}/${workspace.limits.maxTeams}` 
                : `${teamCount}/Unlimited`
            }
          }
        };
      })
    );

    res.json(workspacesWithStats);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Failed to fetch workspaces' });
  }
});

// Get single workspace details (System Admin only)
router.get('/:id', requireSystemAdmin, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Fetch detailed statistics
    const [userCount, taskCount, teamCount, adminCount, users] = await Promise.all([
      User.countDocuments({ workspaceId: workspace._id }),
      Task.countDocuments({ workspaceId: workspace._id }),
      Team.countDocuments({ workspaceId: workspace._id }),
      User.countDocuments({ workspaceId: workspace._id, role: 'admin' }),
      User.find({ workspaceId: workspace._id }).select('fullName email role createdAt')
    ]);

    const completedTasks = await Task.countDocuments({ 
      workspaceId: workspace._id, 
      status: 'Done' 
    });

    res.json({
      ...workspace.toObject(),
      stats: {
        userCount,
        taskCount,
        teamCount,
        adminCount,
        completedTasks,
        completionRate: taskCount > 0 ? ((completedTasks / taskCount) * 100).toFixed(1) : 0,
        usage: {
          users: workspace.type === 'COMMUNITY' 
            ? `${userCount}/${workspace.limits.maxUsers}` 
            : `${userCount}/Unlimited`,
          tasks: workspace.type === 'COMMUNITY' 
            ? `${taskCount}/${workspace.limits.maxTasks}` 
            : `${taskCount}/Unlimited`,
          teams: workspace.type === 'COMMUNITY' 
            ? `${teamCount}/${workspace.limits.maxTeams}` 
            : `${teamCount}/Unlimited`
        }
      },
      users
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Failed to fetch workspace details' });
  }
});

// Create new workspace (System Admin only)
router.post('/', requireSystemAdmin, async (req, res) => {
  try {
    const { name, type, ownerEmail } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({ 
        message: 'Workspace name and type are required' 
      });
    }

    if (!['CORE', 'COMMUNITY'].includes(type)) {
      return res.status(400).json({ 
        message: 'Workspace type must be CORE or COMMUNITY' 
      });
    }

    // Check if workspace name already exists
    const existingWorkspace = await Workspace.findOne({ name });
    if (existingWorkspace) {
      return res.status(400).json({ 
        message: 'A workspace with this name already exists' 
      });
    }

    // Create workspace
    const workspace = new Workspace({
      name,
      type,
      settings: {
        features: type === 'CORE' 
          ? ['analytics', 'reports', 'changelog', 'automation', 'teams']
          : ['teams']
      },
      limits: type === 'COMMUNITY' 
        ? { maxUsers: 10, maxTasks: 100, maxTeams: 3 }
        : { maxUsers: -1, maxTasks: -1, maxTeams: -1 }
    });

    await workspace.save();

    // If owner email provided, create workspace admin
    if (ownerEmail) {
      const owner = await User.findOne({ email: ownerEmail });
      if (owner) {
        owner.workspaceId = workspace._id;
        if (owner.role === 'member') {
          owner.role = 'admin';
        }
        await owner.save();
      }
    }

    // Log workspace creation
    await logChange({
      event_type: 'workspace_action',
      user: req.user,
      target_type: 'Workspace',
      target_id: workspace._id,
      target_name: workspace.name,
      action: 'create',
      description: `Created ${workspace.type} workspace: ${workspace.name}`,
      metadata: { workspaceType: workspace.type },
      changes: { after: workspace.toObject() },
      workspaceId: null // System-level action, no workspace
    });

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Failed to create workspace' });
  }
});

// Update workspace (System Admin only)
router.put('/:id', requireSystemAdmin, async (req, res) => {
  try {
    const { name, type, settings, limits } = req.body;

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const oldWorkspace = workspace.toObject();

    // Update fields
    if (name) workspace.name = name;
    if (type && ['CORE', 'COMMUNITY'].includes(type)) {
      workspace.type = type;
      
      // Update default limits and features based on type
      if (type === 'COMMUNITY') {
        workspace.limits = limits || { maxUsers: 10, maxTasks: 100, maxTeams: 3 };
        workspace.settings.features = ['teams'];
      } else {
        workspace.limits = { maxUsers: -1, maxTasks: -1, maxTeams: -1 };
        workspace.settings.features = ['analytics', 'reports', 'changelog', 'automation', 'teams'];
      }
    }

    if (settings) {
      workspace.settings = { ...workspace.settings, ...settings };
    }

    if (limits && workspace.type === 'COMMUNITY') {
      workspace.limits = { ...workspace.limits, ...limits };
    }

    await workspace.save();

    // Log workspace update
    await logChange({
      event_type: 'workspace_action',
      user: req.user,
      target_type: 'Workspace',
      target_id: workspace._id,
      target_name: workspace.name,
      action: 'update',
      description: `Updated workspace: ${workspace.name}`,
      changes: { before: oldWorkspace, after: workspace.toObject() },
      workspaceId: null // System-level action
    });

    res.json({
      message: 'Workspace updated successfully',
      workspace
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({ message: 'Failed to update workspace' });
  }
});

// Delete workspace (System Admin only)
router.delete('/:id', requireSystemAdmin, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Get counts for logging
    const [userCount, taskCount, teamCount] = await Promise.all([
      User.countDocuments({ workspaceId: workspace._id }),
      Task.countDocuments({ workspaceId: workspace._id }),
      Team.countDocuments({ workspaceId: workspace._id })
    ]);

    console.log(`🗑️  Deleting workspace "${workspace.name}" with ${userCount} users, ${taskCount} tasks, ${teamCount} teams`);

    // CASCADE DELETE: Delete all workspace data including users
    await Promise.all([
      User.deleteMany({ workspaceId: workspace._id }),
      Task.deleteMany({ workspaceId: workspace._id }),
      Team.deleteMany({ workspaceId: workspace._id })
    ]);

    console.log(`✅ Deleted ${userCount} users, ${taskCount} tasks, ${teamCount} teams`);

    const oldWorkspace = workspace.toObject();
    await workspace.deleteOne();

    // Log workspace deletion
    await logChange({
      event_type: 'workspace_action',
      user: req.user,
      target_type: 'Workspace',
      target_id: oldWorkspace._id,
      target_name: oldWorkspace.name,
      action: 'delete',
      description: `Deleted workspace: ${oldWorkspace.name} (${userCount} users, ${taskCount} tasks, ${teamCount} teams)`,
      changes: { before: oldWorkspace },
      metadata: { userCount, taskCount, teamCount },
      workspaceId: null // System-level action
    });

    res.json({ 
      message: 'Workspace and all associated data deleted successfully',
      deleted: {
        users: userCount,
        tasks: taskCount,
        teams: teamCount
      }
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ message: 'Failed to delete workspace' });
  }
});

// Toggle workspace activation status (System Admin only)
router.patch('/:id/toggle-status', requireSystemAdmin, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const oldStatus = workspace.isActive;
    workspace.isActive = !workspace.isActive;
    await workspace.save();

    console.log(`✓ Workspace "${workspace.name}" status changed from ${oldStatus} to ${workspace.isActive}`);

    // Log status change
    await logChange({
      event_type: 'workspace_action',
      user: req.user,
      target_type: 'Workspace',
      target_id: workspace._id,
      target_name: workspace.name,
      action: 'status_change',
      description: `${workspace.isActive ? 'Activated' : 'Deactivated'} workspace: ${workspace.name}`,
      changes: { 
        before: { isActive: oldStatus }, 
        after: { isActive: workspace.isActive } 
      },
      workspaceId: null // System-level action
    });

    res.json({
      message: `Workspace ${workspace.isActive ? 'activated' : 'deactivated'} successfully. Users must log out and log back in for changes to take effect.`,
      workspace,
      note: 'Existing user sessions must be refreshed (logout/login) to see this change.'
    });
  } catch (error) {
    console.error('Error toggling workspace status:', error);
    res.status(500).json({ message: 'Failed to toggle workspace status' });
  }
});

// Get workspace statistics summary (System Admin only)
router.get('/stats/summary', requireSystemAdmin, async (req, res) => {
  try {
    const [
      totalWorkspaces,
      activeWorkspaces,
      coreWorkspaces,
      communityWorkspaces,
      totalUsers,
      totalTasks,
      totalTeams
    ] = await Promise.all([
      Workspace.countDocuments(),
      Workspace.countDocuments({ isActive: true }),
      Workspace.countDocuments({ type: 'CORE' }),
      Workspace.countDocuments({ type: 'COMMUNITY' }),
      User.countDocuments({ workspaceId: { $ne: null } }),
      Task.countDocuments(),
      Team.countDocuments()
    ]);

    res.json({
      totalWorkspaces,
      activeWorkspaces,
      inactiveWorkspaces: totalWorkspaces - activeWorkspaces,
      coreWorkspaces,
      communityWorkspaces,
      totalUsers,
      totalTasks,
      totalTeams
    });
  } catch (error) {
    console.error('Error fetching workspace stats:', error);
    res.status(500).json({ message: 'Failed to fetch workspace statistics' });
  }
});


// Get users of a specific workspace (System Admin only)
router.get('/:id/users', requireSystemAdmin, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const users = await User.find({ workspaceId: workspace._id }).select('-password_hash').populate('team_id', 'name').sort({ created_at: -1 });
    res.json({ workspace: { id: workspace._id, name: workspace.name, type: workspace.type }, users, count: users.length });
  } catch (error) {
    console.error('Error fetching workspace users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get tasks of a specific workspace (System Admin only)
router.get('/:id/tasks', requireSystemAdmin, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const tasks = await Task.find({ workspaceId: workspace._id }).populate('created_by', 'full_name email').populate('assigned_to', 'full_name email').populate('team_id', 'name').sort({ created_at: -1 }).limit(100);
    res.json({ workspace: { id: workspace._id, name: workspace.name, type: workspace.type }, tasks, count: tasks.length, total: await Task.countDocuments({ workspaceId: workspace._id }) });
  } catch (error) {
    console.error('Error fetching workspace tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get teams of a specific workspace (System Admin only)
router.get('/:id/teams', requireSystemAdmin, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const teams = await Team.find({ workspaceId: workspace._id }).populate('hr_id', 'full_name email').populate('lead_id', 'full_name email').populate('members', 'full_name email role').sort({ created_at: -1 });
    res.json({ workspace: { id: workspace._id, name: workspace.name, type: workspace.type }, teams, count: teams.length });
  } catch (error) {
    console.error('Error fetching workspace teams:', error);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

export default router;
