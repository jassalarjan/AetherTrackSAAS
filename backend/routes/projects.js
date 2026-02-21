import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { checkRole } from '../middleware/roleCheck.js';
import { upload, uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../config/cloudinary.js';

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

    // Validate documents array if present
    const updateData = { ...req.body, updated_at: Date.now() };
    
    if (updateData.documents) {
      // Ensure documents is an array
      if (!Array.isArray(updateData.documents)) {
        return res.status(400).json({ 
          message: 'Documents must be an array' 
        });
      }
      
      // Validate each document has required structure
      updateData.documents = updateData.documents.map(doc => {
        // If doc is a string (legacy format), skip it or convert
        if (typeof doc === 'string') {
          return {
            name: doc,
            url: doc,
            type: '',
            size: 0,
            uploadedAt: new Date()
          };
        }
        
        // Ensure document object has required fields
        return {
          name: doc.name || '',
          url: doc.url || '',
          type: doc.type || '',
          size: doc.size || 0,
          uploadedAt: doc.uploadedAt || new Date(),
          uploadedBy: doc.uploadedBy || req.user._id
        };
      });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id },
      updateData,
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
    
    // Provide more detailed error messages
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: `Invalid data type for field: ${error.path}`,
        details: error.message 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed',
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    
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

// Upload document to project
router.post('/:id/upload-document', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Add document to project
    const project = await Project.findById(id);
    if (!project) {
      // Clean up uploaded file if project not found
      const publicId = extractPublicId(result.secure_url);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
      return res.status(404).json({ message: 'Project not found' });
    }

    const newDocument = {
      name: name || req.file.originalname,
      url: result.secure_url,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };

    project.documents.push(newDocument);
    await project.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: newDocument,
      cloudinary: {
        public_id: result.public_id,
        url: result.secure_url
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    if (error.message.includes('File type')) {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.message.includes('File size')) {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }
    
    res.status(500).json({ 
      message: 'Error uploading document',
      error: error.message 
    });
  }
});

// Delete document from project
router.delete('/:id/documents/:docIndex', async (req, res) => {
  try {
    const { id, docIndex } = req.params;
    const index = parseInt(docIndex);

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (index < 0 || index >= project.documents.length) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = project.documents[index];
    
    // Delete from Cloudinary
    if (document.url) {
      const publicId = extractPublicId(document.url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId, 'raw');
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
          // Continue with database deletion even if Cloudinary fails
        }
      }
    }

    // Remove from database
    project.documents.splice(index, 1);
    await project.save();

    res.json({ 
      success: true,
      message: 'Document deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      message: 'Error deleting document',
      error: error.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE ENDPOINT
// GET  /api/projects/:id/schedule          - run (or return cached) schedule
// POST /api/projects/:id/schedule/refresh  - force re-compute + persist
// PATCH /api/projects/:id/tasks/:taskId/dates - update a single task's dates
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { pixelsPerDay = 8, forceRefresh = 'false' } = req.query;

    const project = await Project.findById(id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const tasks = await Task.find({ project_id: id })
      .populate('assigned_to', 'name email avatar')
      .lean();

    // Lazy import — avoids loading the engine unless this route is called
    const { default: runScheduler } = await import('../services/scheduleEngine.js');

    const schedule = runScheduler(tasks, {
      pixelsPerDay:    Number(pixelsPerDay),
      projectStart:    project.start_date  ? new Date(project.start_date)  : undefined,
      projectDeadline: project.end_date    ? new Date(project.end_date)    : undefined,
      throwOnError:    false
    });

    // Persist computed fields back to DB if all went cleanly (background — don't await)
    if (!schedule.metadata.hasErrors && forceRefresh !== 'false') {
      const bulkOps = schedule.scheduledTasks.map(t => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              scheduled_start: t.early_start,
              scheduled_end:   t.early_end,
              total_float:     t.total_float ?? null,
              free_float:      t.free_float  ?? null,
              is_critical:     t.is_critical ?? false
            }
          }
        }
      }));
      Task.bulkWrite(bulkOps).catch(e => console.error('[schedule] bulkWrite error:', e));
    }

    res.json({
      project:   { _id: project._id, name: project.name },
      schedule,
      meta: {
        generatedAt: new Date().toISOString(),
        pixelsPerDay: Number(pixelsPerDay)
      }
    });
  } catch (error) {
    console.error('Error computing schedule:', error);
    if (error.message === 'CIRCULAR_DEPENDENCY_DETECTED') {
      return res.status(422).json({ message: 'Circular dependency in task graph', cycleIds: error.cycleIds });
    }
    res.status(500).json({ message: 'Error computing schedule' });
  }
});

// Force refresh + persist
router.post('/:id/schedule/refresh', async (req, res) => {
  req.query.forceRefresh = 'true';
  // Re-use the GET handler logic by forwarding
  const { id } = req.params;
  const { pixelsPerDay = 8 } = req.body;

  try {
    const project = await Project.findById(id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const tasks = await Task.find({ project_id: id })
      .populate('assigned_to', 'name email avatar')
      .lean();

    const { default: runScheduler } = await import('../services/scheduleEngine.js');

    const schedule = runScheduler(tasks, {
      pixelsPerDay:    Number(pixelsPerDay),
      projectStart:    project.start_date  ? new Date(project.start_date)  : undefined,
      projectDeadline: project.end_date    ? new Date(project.end_date)    : undefined,
      throwOnError:    false
    });

    // Persist computed fields
    if (schedule.scheduledTasks.length > 0) {
      const bulkOps = schedule.scheduledTasks.map(t => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              scheduled_start: t.early_start,
              scheduled_end:   t.early_end,
              total_float:     t.total_float ?? null,
              free_float:      t.free_float  ?? null,
              is_critical:     t.is_critical ?? false
            }
          }
        }
      }));
      await Task.bulkWrite(bulkOps);
    }

    res.json({
      message: `Schedule refreshed: ${schedule.scheduledTasks.length} tasks updated`,
      metadata: schedule.metadata
    });
  } catch (error) {
    console.error('Error refreshing schedule:', error);
    res.status(500).json({ message: 'Error refreshing schedule' });
  }
});

// Update a single task's date fields and return updated schedule
router.patch('/:id/tasks/:taskId/dates', async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { start_date, due_date, scheduling_mode, constraint_type, constraint_date } = req.body;

    const allowedFields = {};
    if (start_date      !== undefined) allowedFields.start_date      = start_date ? new Date(start_date) : null;
    if (due_date        !== undefined) allowedFields.due_date        = due_date   ? new Date(due_date)   : null;
    if (scheduling_mode !== undefined) allowedFields.scheduling_mode = scheduling_mode;
    if (constraint_type !== undefined) allowedFields.constraint_type = constraint_type;
    if (constraint_date !== undefined) allowedFields.constraint_date = constraint_date ? new Date(constraint_date) : null;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, project_id: id },
      { $set: { ...allowedFields, updated_at: new Date() } },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task dates updated', task });
  } catch (error) {
    console.error('Error updating task dates:', error);
    res.status(500).json({ message: 'Error updating task dates' });
  }
});

export default router;

