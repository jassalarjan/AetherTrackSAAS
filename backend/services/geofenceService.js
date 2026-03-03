/**
 * Geofence Service
 * 
 * Service for managing geofenced locations for attendance verification.
 * Handles CRUD operations for geofences and location validation.
 */

import GeofenceLocation from '../models/GeofenceLocation.js';

class GeofenceService {
  /**
   * Create a new geofence location
   * @param {string} workspaceId - Workspace ID
   * @param {Object} data - Geofence data
   * @param {string} userId - User creating the geofence
   * @returns {Promise<Object>} Created geofence
   */
  static async createGeofence(workspaceId, data, userId) {
    const { name, description, latitude, longitude, radiusMeters, isActive = true } = data;
    
    // Validate required fields
    if (!name) {
      throw new Error('Geofence name is required');
    }
    
    if (latitude === undefined || longitude === undefined) {
      throw new Error('Latitude and longitude are required');
    }
    
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    
    // Create geofence with GeoJSON format
    const geofence = await GeofenceLocation.create({
      workspaceId,
      name,
      description: description || '',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // GeoJSON uses [longitude, latitude]
      },
      radiusMeters: radiusMeters || 100,
      isActive,
      createdBy: userId
    });
    
    return geofence;
  }

  /**
   * Update an existing geofence
   * @param {string} geofenceId - Geofence ID
   * @param {Object} data - Updated geofence data
   * @param {string} userId - User updating the geofence
   * @returns {Promise<Object>} Updated geofence
   */
  static async updateGeofence(geofenceId, data, userId) {
    const geofence = await GeofenceLocation.findById(geofenceId);
    
    if (!geofence) {
      throw new Error('Geofence not found');
    }
    
    // Update fields
    if (data.name !== undefined) {
      geofence.name = data.name;
    }
    
    if (data.description !== undefined) {
      geofence.description = data.description;
    }
    
    if (data.latitude !== undefined || data.longitude !== undefined) {
      const latitude = data.latitude !== undefined ? data.latitude : geofence.location.coordinates[1];
      const longitude = data.longitude !== undefined ? data.longitude : geofence.location.coordinates[0];
      
      // Validate coordinates
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      
      geofence.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }
    
    if (data.radiusMeters !== undefined) {
      geofence.radiusMeters = data.radiusMeters;
    }
    
    if (data.isActive !== undefined) {
      geofence.isActive = data.isActive;
    }
    
    await geofence.save();
    
    return geofence;
  }

  /**
   * Delete a geofence
   * @param {string} geofenceId - Geofence ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteGeofence(geofenceId) {
    const geofence = await GeofenceLocation.findById(geofenceId);
    
    if (!geofence) {
      throw new Error('Geofence not found');
    }
    
    await GeofenceLocation.findByIdAndDelete(geofenceId);
    
    return { success: true, message: 'Geofence deleted successfully' };
  }

  /**
   * Get all geofences for a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {boolean} activeOnly - Filter by active geofences only
   * @returns {Promise<Array>} List of geofences
   */
  static async getGeofences(workspaceId, activeOnly = false) {
    const query = { workspaceId };
    
    if (activeOnly) {
      query.isActive = true;
    }
    
    const geofences = await GeofenceLocation.find(query)
      .sort({ createdAt: -1 });
    
    // Transform GeoJSON coordinates to readable format
    return geofences.map(g => ({
      id: g._id,
      workspaceId: g.workspaceId,
      name: g.name,
      description: g.description,
      latitude: g.location.coordinates[1],
      longitude: g.location.coordinates[0],
      radiusMeters: g.radiusMeters,
      isActive: g.isActive,
      createdBy: g.createdBy,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));
  }

  /**
   * Get a single geofence by ID
   * @param {string} geofenceId - Geofence ID
   * @returns {Promise<Object>} Geofence data
   */
  static async getGeofenceById(geofenceId) {
    const geofence = await GeofenceLocation.findById(geofenceId);
    
    if (!geofence) {
      throw new Error('Geofence not found');
    }
    
    return {
      id: geofence._id,
      workspaceId: geofence.workspaceId,
      name: geofence.name,
      description: geofence.description,
      latitude: geofence.location.coordinates[1],
      longitude: geofence.location.coordinates[0],
      radiusMeters: geofence.radiusMeters,
      isActive: geofence.isActive,
      createdBy: geofence.createdBy,
      createdAt: geofence.createdAt,
      updatedAt: geofence.updatedAt
    };
  }

  /**
   * Find geofences near a given location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} workspaceId - Workspace ID
   * @param {number} maxDistance - Maximum distance in meters
   * @returns {Promise<Array>} List of nearby geofences with distances
   */
  static async findNearbyGeofences(latitude, longitude, workspaceId, maxDistance = 1000) {
    const geofences = await GeofenceLocation.find({
      workspaceId,
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    });
    
    // Calculate actual distance for each geofence
    return geofences.map(g => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        g.location.coordinates[1],
        g.location.coordinates[0]
      );
      
      return {
        id: g._id,
        name: g.name,
        description: g.description,
        latitude: g.location.coordinates[1],
        longitude: g.location.coordinates[0],
        radiusMeters: g.radiusMeters,
        distance: Math.round(distance),
        isWithin: distance <= g.radiusMeters
      };
    });
  }

  /**
   * Check if a point is within a geofence
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {Object} geofence - Geofence object
   * @returns {Object} Check result with distance
   */
  static isWithinGeofence(latitude, longitude, geofence) {
    // Handle both populated geofence objects and plain objects
    const geoLat = geofence.location?.coordinates?.[1] ?? geofence.latitude;
    const geoLon = geofence.location?.coordinates?.[0] ?? geofence.longitude;
    const radius = geofence.radiusMeters || geofence.radius;
    
    const distance = this.calculateDistance(latitude, longitude, geoLat, geoLon);
    
    return {
      within: distance <= radius,
      distance: Math.round(distance),
      radius: radius,
      geofenceName: geofence.name
    };
  }

  /**
   * Validate a location against workspace geofences
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} workspaceId - Workspace ID
   * @param {boolean} required - Whether geofence validation is required
   * @returns {Object} Validation result
   */
  static async validateLocation(latitude, longitude, workspaceId, required = false) {
    const geofences = await GeofenceLocation.find({
      workspaceId,
      isActive: true
    });
    
    if (geofences.length === 0) {
      // No geofences configured
      if (required) {
        return {
          valid: false,
          error: 'No geofences configured for this workspace',
          matchedGeofence: null
        };
      }
      
      return {
        valid: true,
        message: 'No geofences configured - location allowed',
        matchedGeofence: null
      };
    }
    
    // Check each geofence
    let closestGeofence = null;
    let closestDistance = Infinity;
    
    for (const geofence of geofences) {
      const result = this.isWithinGeofence(latitude, longitude, geofence);
      
      if (result.within) {
        return {
          valid: true,
          message: `Within geofence: ${geofence.name}`,
          matchedGeofence: {
            id: geofence._id,
            name: geofence.name,
            distance: result.distance
          }
        };
      }
      
      // Track closest geofence
      if (result.distance < closestDistance) {
        closestDistance = result.distance;
        closestGeofence = geofence;
      }
    }
    
    // Not within any geofence
    return {
      valid: required ? false : true,
      error: required ? 'Location is outside all configured geofences' : undefined,
      message: required ? undefined : `Nearest geofence: ${closestGeofence?.name} (${Math.round(closestDistance)}m away)`,
      matchedGeofence: null,
      nearestGeofence: closestGeofence ? {
        id: closestGeofence._id,
        name: closestGeofence.name,
        distance: Math.round(closestDistance)
      } : null
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in meters
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => deg * (Math.PI / 180);
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Get geofence status for a location
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} Geofence status
   */
  static async getGeofenceStatus(latitude, longitude, workspaceId) {
    const geofences = await GeofenceLocation.find({
      workspaceId,
      isActive: true
    });
    
    if (geofences.length === 0) {
      return {
        hasGeofences: false,
        isWithinGeofence: false,
        message: 'No geofences configured',
        geofences: []
      };
    }
    
    const geofenceStatuses = geofences.map(geofence => {
      const result = this.isWithinGeofence(latitude, longitude, geofence);
      
      return {
        id: geofence._id,
        name: geofence.name,
        isWithin: result.within,
        distance: result.distance,
        radius: result.radius
      };
    });
    
    const withinAny = geofenceStatuses.some(g => g.isWithin);
    
    return {
      hasGeofences: true,
      isWithinGeofence: withinAny,
      message: withinAny ? 'Location is within a geofence' : 'Location is outside all geofences',
      geofences: geofenceStatuses
    };
  }

  /**
   * Bulk create geofences
   * @param {string} workspaceId - Workspace ID
   * @param {Array} geofences - Array of geofence data
   * @param {string} userId - User creating the geofences
   * @returns {Promise<Array>} Created geofences
   */
  static async bulkCreateGeofences(workspaceId, geofences, userId) {
    const createdGeofences = [];
    const errors = [];
    
    for (let i = 0; i < geofences.length; i++) {
      try {
        const geofence = await this.createGeofence(workspaceId, geofences[i], userId);
        createdGeofences.push(geofence);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }
    
    return {
      created: createdGeofences,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * Toggle geofence active status
   * @param {string} geofenceId - Geofence ID
   * @returns {Promise<Object>} Updated geofence
   */
  static async toggleGeofenceStatus(geofenceId) {
    const geofence = await GeofenceLocation.findById(geofenceId);
    
    if (!geofence) {
      throw new Error('Geofence not found');
    }
    
    geofence.isActive = !geofence.isActive;
    await geofence.save();
    
    return geofence;
  }
}

export default GeofenceService;
