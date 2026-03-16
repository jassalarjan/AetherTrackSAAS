/**
 * Verification Routes
 * 
 * API routes for geofence management and location verification.
 * These routes handle geofence CRUD operations and location validation
 * for attendance verification purposes.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import GeofenceService from '../services/geofenceService.js';
import VerificationService from '../services/verificationService.js';
import getClientIP from '../utils/getClientIP.js';
import { logChange } from '../utils/changeLogService.js';

const router = express.Router();

// ==================== Geofence Routes ====================

/**
 * GET /api/geofences
 * Get all geofences (with optional active filter)
 * @route GET /api/geofences
 * @access Private (Admin/HR only)
 */
router.get('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { active } = req.query;
    
    const activeOnly = active === 'true';
    const geofences = await GeofenceService.getGeofences(workspaceId, activeOnly);
    
    res.json({ success: true, geofences });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({ message: 'Failed to fetch geofences' });
  }
});

/**
 * POST /api/geofences
 * Create a new geofence
 * @route POST /api/geofences
 * @access Private (Admin only)
 */
router.post('/', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { name, description, latitude, longitude, radiusMeters, isActive } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Geofence name is required' });
    }
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const geofence = await GeofenceService.createGeofence(
      workspaceId,
      { name, description, latitude, longitude, radiusMeters, isActive },
      req.user._id
    );
    
    await logChange({
      userId: req.user._id,
      action: 'create',
      entity: 'geofence',
      entityId: geofence._id,
      details: { action: 'create-geofence', name, latitude, longitude, radiusMeters },
      ipAddress: getClientIP(req)
    });
    
    res.json({ success: true, geofence });
  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(500).json({ message: error.message || 'Failed to create geofence' });
  }
});

/**
 * GET /api/geofences/:id
 * Get single geofence by ID
 * @route GET /api/geofences/:id
 * @access Private (Admin/HR only)
 */
router.get('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  // Guard: only match valid MongoDB ObjectIds — static paths (validate, status, nearby)
  // must be declared after this catch-all but registered before it in Express order.
  // This prevents routing conflicts when static paths are requested.
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
    return res.status(404).json({ message: 'Not found' });
  }
  try {
    const geofence = await GeofenceService.getGeofenceById(req.params.id);
    
    // Verify workspace access
    if (geofence.workspaceId.toString() !== req.user.workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ success: true, geofence });
  } catch (error) {
    console.error('Get geofence error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch geofence' });
  }
});

/**
 * PUT /api/geofences/:id
 * Update an existing geofence
 * @route PUT /api/geofences/:id
 * @access Private (Admin only)
 */
router.put('/:id', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { name, description, latitude, longitude, radiusMeters, isActive } = req.body;
    
    // First check if geofence exists and belongs to workspace
    const existingGeofence = await GeofenceService.getGeofenceById(req.params.id);
    if (existingGeofence.workspaceId.toString() !== workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const geofence = await GeofenceService.updateGeofence(
      req.params.id,
      { name, description, latitude, longitude, radiusMeters, isActive },
      req.user._id
    );
    
    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'geofence',
      entityId: req.params.id,
      details: { action: 'update-geofence', name, latitude, longitude, radiusMeters },
      ipAddress: getClientIP(req)
    });
    
    res.json({ success: true, geofence });
  } catch (error) {
    console.error('Update geofence error:', error);
    res.status(500).json({ message: error.message || 'Failed to update geofence' });
  }
});

/**
 * DELETE /api/geofences/:id
 * Delete a geofence
 * @route DELETE /api/geofences/:id
 * @access Private (Admin only)
 */
router.delete('/:id', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    
    // First check if geofence exists and belongs to workspace
    const existingGeofence = await GeofenceService.getGeofenceById(req.params.id);
    if (existingGeofence.workspaceId.toString() !== workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await GeofenceService.deleteGeofence(req.params.id);
    
    await logChange({
      userId: req.user._id,
      action: 'delete',
      entity: 'geofence',
      entityId: req.params.id,
      details: { action: 'delete-geofence', name: existingGeofence.name },
      ipAddress: getClientIP(req)
    });
    
    res.json({ success: true, message: 'Geofence deleted successfully' });
  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete geofence' });
  }
});

/**
 * GET /api/geofences/validate
 * Validate a location against geofences
 * @route GET /api/geofences/validate
 * @access Private
 */
router.get('/validate', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { latitude, longitude, required } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    
    const isRequired = required === 'true';
    const result = await GeofenceService.validateLocation(lat, lon, workspaceId, isRequired);
    
    res.json({ 
      success: true, 
      valid: result.valid,
      message: result.valid ? result.message : result.error,
      matchedGeofence: result.matchedGeofence,
      nearestGeofence: result.nearestGeofence
    });
  } catch (error) {
    console.error('Validate location error:', error);
    res.status(500).json({ message: 'Failed to validate location' });
  }
});

/**
 * POST /api/geofences/validate
 * Validate a location against geofences (POST version)
 * @route POST /api/geofences/validate
 * @access Private
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { latitude, longitude, required } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const isRequired = required === true;
    const result = await GeofenceService.validateLocation(latitude, longitude, workspaceId, isRequired);
    
    res.json({ 
      success: true, 
      valid: result.valid,
      message: result.valid ? result.message : result.error,
      matchedGeofence: result.matchedGeofence,
      nearestGeofence: result.nearestGeofence
    });
  } catch (error) {
    console.error('Validate location error:', error);
    res.status(500).json({ message: 'Failed to validate location' });
  }
});

// ==================== Geofence Status Routes ====================

/**
 * GET /api/geofences/status
 * Get geofence status for a location
 * @route GET /api/geofences/status
 * @access Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const result = await GeofenceService.getGeofenceStatus(
      parseFloat(latitude),
      parseFloat(longitude),
      workspaceId
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get geofence status error:', error);
    res.status(500).json({ message: 'Failed to get geofence status' });
  }
});

/**
 * POST /api/geofences/status
 * Get geofence status for a location (POST version)
 * @route POST /api/geofences/status
 * @access Private
 */
router.post('/status', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const result = await GeofenceService.getGeofenceStatus(latitude, longitude, workspaceId);
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get geofence status error:', error);
    res.status(500).json({ message: 'Failed to get geofence status' });
  }
});

/**
 * GET /api/geofences/nearby
 * Find geofences near a given location
 * @route GET /api/geofences/nearby
 * @access Private (Admin/HR only)
 */
router.get('/nearby', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { latitude, longitude, maxDistance = 1000 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    const nearbyGeofences = await GeofenceService.findNearbyGeofences(
      parseFloat(latitude),
      parseFloat(longitude),
      workspaceId,
      parseInt(maxDistance)
    );
    
    res.json({ success: true, geofences: nearbyGeofences });
  } catch (error) {
    console.error('Find nearby geofences error:', error);
    res.status(500).json({ message: 'Failed to find nearby geofences' });
  }
});

/**
 * POST /api/geofences/:id/toggle
 * Toggle geofence active status
 * @route POST /api/geofences/:id/toggle
 * @access Private (Admin only)
 */
router.post('/:id/toggle', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    
    // First check if geofence exists and belongs to workspace
    const existingGeofence = await GeofenceService.getGeofenceById(req.params.id);
    if (existingGeofence.workspaceId.toString() !== workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const geofence = await GeofenceService.toggleGeofenceStatus(req.params.id);
    
    await logChange({
      userId: req.user._id,
      action: 'update',
      entity: 'geofence',
      entityId: req.params.id,
      details: { action: 'toggle-geofence', isActive: geofence.isActive },
      ipAddress: getClientIP(req)
    });
    
    res.json({ success: true, geofence });
  } catch (error) {
    console.error('Toggle geofence status error:', error);
    res.status(500).json({ message: error.message || 'Failed to toggle geofence status' });
  }
});

/**
 * POST /api/geofences/bulk
 * Bulk create geofences
 * @route POST /api/geofences/bulk
 * @access Private (Admin only)
 */
router.post('/bulk', authenticate, checkRole(['admin']), async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { geofences } = req.body;
    
    if (!geofences || !Array.isArray(geofences) || geofences.length === 0) {
      return res.status(400).json({ message: 'Geofences array is required' });
    }
    
    const result = await GeofenceService.bulkCreateGeofences(workspaceId, geofences, req.user._id);
    
    await logChange({
      userId: req.user._id,
      action: 'bulk_create',
      entity: 'geofence',
      entityId: null,
      details: { action: 'bulk-create-geofences', count: result.created.length },
      ipAddress: getClientIP(req)
    });
    
    res.json({ 
      success: result.success, 
      created: result.created,
      errors: result.errors,
      message: `Created ${result.created.length} geofences, ${result.errors.length} failed`
    });
  } catch (error) {
    console.error('Bulk create geofences error:', error);
    res.status(500).json({ message: 'Failed to create geofences' });
  }
});

export default router;
