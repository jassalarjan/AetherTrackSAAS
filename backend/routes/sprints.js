import express from 'express';
import Sprint from '../models/Sprint.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Get all sprints for workspace
router.get('/', async (req, res) => {
  try {
    const { status, project } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (project) query.project = project;

    const sprints = await Sprint.find(query)
      .populate('project', 'name')
      .sort({ startDate: -1 });
    
    res.json(sprints);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ 
      message: 'Error fetching sprints', 
      error: error.message 
    });
  }
});

// Get active sprint
router.get('/active', async (req, res) => {
  try {
    const activeSprint = await Sprint.findOne({ status: 'active' }).populate('project', 'name');

    res.json(activeSprint);
  } catch (error) {
    console.error('Error fetching active sprint:', error);
    res.status(500).json({ 
      message: 'Error fetching active sprint', 
      error: error.message 
    });
  }
});

// Get sprint by ID
router.get('/:id', async (req, res) => {
  try {
    const sprint = await Sprint.findOne({ _id: req.params.id }).populate('project', 'name');

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    res.json(sprint);
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ 
      message: 'Error fetching sprint', 
      error: error.message 
    });
  }
});

// Create new sprint
router.post('/', async (req, res) => {
  try {
    const { name, startDate, endDate, goal, capacity, teamSize, project } = req.body;

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ 
        message: 'End date must be after start date' 
      });
    }

    const sprint = new Sprint({
      project,
      name,
      startDate,
      endDate,
      goal,
      capacity,
      teamSize
    });

    await sprint.save();
    await sprint.populate('project', 'name');

    res.status(201).json(sprint);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ 
      message: 'Error creating sprint', 
      error: error.message 
    });
  }
});

// Update sprint
router.put('/:id', async (req, res) => {
  try {
    const { name, startDate, endDate, goal, capacity, teamSize, status } = req.body;

    const sprint = await Sprint.findOne({ _id: req.params.id });

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    // Validate dates if provided
    const newStartDate = startDate || sprint.startDate;
    const newEndDate = endDate || sprint.endDate;
    
    if (new Date(newEndDate) <= new Date(newStartDate)) {
      return res.status(400).json({ 
        message: 'End date must be after start date' 
      });
    }

    // Update fields
    if (name !== undefined) sprint.name = name;
    if (startDate !== undefined) sprint.startDate = startDate;
    if (endDate !== undefined) sprint.endDate = endDate;
    if (goal !== undefined) sprint.goal = goal;
    if (capacity !== undefined) sprint.capacity = capacity;
    if (teamSize !== undefined) sprint.teamSize = teamSize;
    if (status !== undefined) sprint.status = status;

    await sprint.save();
    await sprint.populate('project', 'name');

    res.json(sprint);
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ 
      message: 'Error updating sprint', 
      error: error.message 
    });
  }
});

// Delete sprint
router.delete('/:id', async (req, res) => {
  try {
    const sprint = await Sprint.findOneAndDelete({ _id: req.params.id });

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    res.json({ message: 'Sprint deleted successfully' });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({ 
      message: 'Error deleting sprint', 
      error: error.message 
    });
  }
});

// Update sprint velocity/progress
router.patch('/:id/progress', async (req, res) => {
  try {
    const { velocity, completedPoints } = req.body;

    const sprint = await Sprint.findOne({ _id: req.params.id });

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    if (velocity !== undefined) sprint.velocity = velocity;
    if (completedPoints !== undefined) sprint.completedPoints = completedPoints;

    await sprint.save();
    res.json(sprint);
  } catch (error) {
    console.error('Error updating sprint progress:', error);
    res.status(500).json({ 
      message: 'Error updating sprint progress', 
      error: error.message 
    });
  }
});

export default router;
