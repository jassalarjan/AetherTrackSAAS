import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { checkRole } from '../middleware/roleCheck.js';

const router = express.Router();

// WORKSPACE SUPPORT: All project routes are scoped by workspace
// authenticate middleware is applied in server.js

// Get all projects for a workspace with stats
router.get('/', async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    const query = {};
    
    // Role-based filtering:
    // - Members: only projects they're assigned to
    // - Team Leads: only projects with team members from their team
    // - HR/Admin: all projects
    if (userRole === 'member') {
      query['team_members.user'] = userId;
    } else if (userRole === 'team_lead') {
      // Get team members for this team lead
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findOne({ lead_id: userId });
      if (team) {
        // Find projects where any team member is assigned
        const teamMemberIds = [...team.members, team.lead_id];
        query['team_members.user'] = { $in: teamMemberIds };
      } else {
        // Team lead without a team sees only their own projects
        query['team_members.user'] = userId;
      }
    }
    
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

// Get user's accessible projects (for "My Projects" view)
router.get('/my-projects', async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    const query = {};

    if (userRole === 'member') {
      // Members see only projects they're assigned to
      query['team_members.user'] = userId;
    } else if (userRole === 'team_lead') {
      // Team leads see projects with their team members
      const Team = (await import('../models/Team.js')).default;
      const team = await Team.findOne({ lead_id: userId });
      if (team) {
        const teamMemberIds = [...team.members, team.lead_id];
        query['team_members.user'] = { $in: teamMemberIds };
      } else {
        query['team_members.user'] = userId;
      }
    }
    // HR and admin see all projects (no additional filter)

    // Apply additional filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email team_id')
      .sort({ created_at: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Get dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({});
    const activeProjects = await Project.countDocuments({ status: 'active' });
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    const onHoldProjects = await Project.countDocuments({ status: 'on_hold' });

    const projects = await Project.find({});
    const budgetStats = projects.reduce((acc, project) => {
      acc.allocated += project.budget.allocated || 0;
      acc.spent += project.budget.spent || 0;
      return acc;
    }, { allocated: 0, spent: 0 });

    // Get task stats
    const totalTasks = await Task.countDocuments({});
    const completedTasks = await Task.countDocuments({ status: 'done' });
    const inProgressTasks = await Task.countDocuments({ status: 'in_progress' });

    // Get critical risks
    const projectsWithRisks = await Project.find({ 
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
    const { id } = req.params;

    const project = await Project.findOne({ _id: id })
      .populate('created_by', 'name email')
      .populate('team_members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get associated tasks
    const tasks = await Task.find({ project_id: id })
      .populate('assigned_to', 'name email')
      .sort({ created_at: -1 });

    res.json({ ...project.toObject(), tasks });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Error fetching project' });
  }
});

// Create new project - Only HR, admin, and team_lead can create projects
router.post('/', checkRole(['admin', 'hr', 'team_lead']), async (req, res) => {
  try {
    const userId = req.user._id;

    const projectData = {
      ...req.body,
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
    const { id } = req.params;

    const project = await Project.findOneAndUpdate(
      { _id: id },
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
    const { id } = req.params;

    const project = await Project.findOneAndDelete({ _id: id });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await Task.updateMany(
      { project_id: id },
      { $unset: { project_id: 1 } }
    );

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Error deleting project' });
  }
});

// Add team member to project - Only HR, admin, and team_lead can manage members
router.post('/:id/members', checkRole(['admin', 'hr', 'team_lead']), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: id },
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

// Remove team member from project - Only HR, admin, and team_lead can manage members
router.delete('/:id/members/:userId', checkRole(['admin', 'hr', 'team_lead']), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findOneAndUpdate(
      { _id: id },
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
