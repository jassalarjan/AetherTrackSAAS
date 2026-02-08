import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

const router = express.Router();

// WORKSPACE SUPPORT: All project routes are scoped by workspace
// authenticate and workspaceContext middleware are applied in server.js

// Get all projects for a workspace with stats
router.get('/', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const { status, priority, search } = req.query;

    // Build query
    const query = { workspaceId };
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email')
      .sort({ created_at: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Get dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;

    // Get project counts by status
    const totalProjects = await Project.countDocuments({ workspaceId });
    const activeProjects = await Project.countDocuments({ workspaceId, status: 'active' });
    const completedProjects = await Project.countDocuments({ workspaceId, status: 'completed' });
    const onHoldProjects = await Project.countDocuments({ workspaceId, status: 'on_hold' });

    // Get budget stats
    const projects = await Project.find({ workspaceId });
    const budgetStats = projects.reduce((acc, project) => {
      acc.allocated += project.budget.allocated || 0;
      acc.spent += project.budget.spent || 0;
      return acc;
    }, { allocated: 0, spent: 0 });

    // Get task stats
    const totalTasks = await Task.countDocuments({ workspaceId });
    const completedTasks = await Task.countDocuments({ workspaceId, status: 'done' });
    const inProgressTasks = await Task.countDocuments({ workspaceId, status: 'in_progress' });

    // Get critical risks
    const projectsWithRisks = await Project.find({ 
      workspaceId,
      'risks.severity': { $in: ['high', 'critical'] },
      'risks.status': 'active'
    });
    
    const criticalRisks = projectsWithRisks.reduce((acc, project) => {
      const activeRisks = project.risks.filter(
        r => r.status === 'active' && (r.severity === 'high' || r.severity === 'critical')
      );
      return acc + activeRisks.length;
    }, 0);

    // Calculate team capacity (placeholder - can be enhanced with actual workload data)
    const teamCapacity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
        change: totalProjects > 0 ? Math.round(((activeProjects / totalProjects) * 100) - 50) : 0
      },
      budget: {
        allocated: budgetStats.allocated,
        spent: budgetStats.spent,
        utilization: budgetStats.allocated > 0 
          ? Math.round((budgetStats.spent / budgetStats.allocated) * 100) 
          : 0,
        change: -4 // This can be calculated based on historical data
      },
      capacity: {
        percentage: teamCapacity,
        status: teamCapacity > 85 ? 'optimal' : teamCapacity > 60 ? 'good' : 'low'
      },
      risks: {
        critical: criticalRisks,
        status: criticalRisks > 0 ? 'urgent' : 'normal'
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

// Get single project by ID
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, workspaceId })
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get associated tasks
    const tasks = await Task.find({ project_id: id, workspaceId })
      .populate('assigned_to', 'name email')
      .sort({ created_at: -1 });

    res.json({ ...project.toObject(), tasks });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Error fetching project' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const userId = req.user._id;

    const projectData = {
      ...req.body,
      workspaceId,
      created_by: userId
    };

    const project = new Project(projectData);
    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email');

    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Error creating project' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const { id } = req.params;

    const project = await Project.findOneAndUpdate(
      { _id: id, workspaceId },
      { ...req.body, updated_at: Date.now() },
      { new: true, runValidators: true }
    )
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Error updating project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const { id } = req.params;

    const project = await Project.findOneAndDelete({ _id: id, workspaceId });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Optionally: Remove project_id from associated tasks
    await Task.updateMany(
      { project_id: id, workspaceId },
      { $unset: { project_id: 1 } }
    );

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Error deleting project' });
  }
});

// Add team member to project
router.post('/:id/members', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const { id } = req.params;
    const { userId, role } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: id, workspaceId },
      { 
        $addToSet: { team_members: { user: userId, role: role || 'member' } },
        updated_at: Date.now()
      },
      { new: true }
    )
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ message: 'Error adding team member' });
  }
});

// Remove team member from project
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user?.workspaceId || null;
    const { id, userId } = req.params;

    const project = await Project.findOneAndUpdate(
      { _id: id, workspaceId },
      { 
        $pull: { team_members: { user: userId } },
        updated_at: Date.now()
      },
      { new: true }
    )
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Error removing team member' });
  }
});

export default router;
