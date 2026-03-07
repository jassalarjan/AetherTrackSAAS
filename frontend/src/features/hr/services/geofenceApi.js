/**
 * geofenceApi.js
 * 
 * API functions for geofence management and location validation.
 * Provides CRUD operations for geofences and location verification.
 * 
 * API Endpoints (prefixed with /geofences):
 * - GET /                      - Get all geofences
 * - POST /                     - Create new geofence
 * - GET /:id                   - Get single geofence
 * - PUT /:id                   - Update geofence
 * - DELETE /:id                - Delete geofence
 * - POST /:id/toggle           - Toggle geofence status
 * - GET /validate              - Validate location
 * - POST /validate              - Validate location (POST)
 * - GET /status                - Get geofence status
 * - POST /status                - Get geofence status (POST)
 * - GET /nearby                - Find nearby geofences
 */

import api from '@/shared/services/axios';

const BASE_URL = '/geofences';

// ==================== Geofence CRUD ====================

/**
 * Get all geofences
 * @param {boolean} activeOnly - Whether to return only active geofences
 * @returns {Promise<Object>} List of geofences
 */
export const getGeofences = async (activeOnly = false) => {
  const response = await api.get(BASE_URL, {
    params: { active: activeOnly }
  });
  return response.data;
};

/**
 * Get single geofence by ID
 * @param {string} id - Geofence ID
 * @returns {Promise<Object>} Geofence data
 */
export const getGeofenceById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a new geofence
 * @param {Object} data - Geofence data
 * @param {string} data.name - Geofence name
 * @param {string} data.description - Optional description
 * @param {number} data.latitude - Center latitude
 * @param {number} data.longitude - Center longitude
 * @param {number} data.radiusMeters - Radius in meters
 * @param {boolean} data.isActive - Whether geofence is active
 * @returns {Promise<Object>} Created geofence
 */
export const createGeofence = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

/**
 * Update an existing geofence
 * @param {string} id - Geofence ID
 * @param {Object} data - Updated geofence data
 * @returns {Promise<Object>} Updated geofence
 */
export const updateGeofence = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

/**
 * Delete a geofence
 * @param {string} id - Geofence ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteGeofence = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Toggle geofence active status
 * @param {string} id - Geofence ID
 * @returns {Promise<Object>} Updated geofence
 */
export const toggleGeofence = async (id) => {
  const response = await api.post(`${BASE_URL}/${id}/toggle`);
  return response.data;
};

/**
 * Bulk create geofences
 * @param {Array} geofences - Array of geofence data
 * @returns {Promise<Object>} Bulk creation result
 */
export const bulkCreateGeofences = async (geofences) => {
  const response = await api.post(`${BASE_URL}/bulk`, { geofences });
  return response.data;
};

// ==================== Location Validation ====================

/**
 * Validate a location against geofences
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {boolean} required - Whether location is required
 * @returns {Promise<Object>} Validation result
 */
export const validateLocation = async (latitude, longitude, required = false) => {
  const response = await api.post(`${BASE_URL}/validate`, {
    latitude,
    longitude,
    required
  });
  return response.data;
};

/**
 * Validate a location (GET version)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {boolean} required - Whether location is required
 * @returns {Promise<Object>} Validation result
 */
export const validateLocationGet = async (latitude, longitude, required = false) => {
  const response = await api.get(`${BASE_URL}/validate`, {
    params: { latitude, longitude, required }
  });
  return response.data;
};

/**
 * Get geofence status for a location
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Geofence status
 */
export const getGeofenceStatus = async (latitude, longitude) => {
  const response = await api.post(`${BASE_URL}/status`, {
    latitude,
    longitude
  });
  return response.data;
};

/**
 * Get geofence status (GET version)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Geofence status
 */
export const getGeofenceStatusGet = async (latitude, longitude) => {
  const response = await api.get(`${BASE_URL}/status`, {
    params: { latitude, longitude }
  });
  return response.data;
};

/**
 * Find geofences near a given location
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} maxDistance - Maximum distance in meters (default 1000)
 * @returns {Promise<Object>} Nearby geofences
 */
export const findNearbyGeofences = async (latitude, longitude, maxDistance = 1000) => {
  const response = await api.get(`${BASE_URL}/nearby`, {
    params: { latitude, longitude, maxDistance }
  });
  return response.data;
};

// ==================== Default Export ====================

const geofenceApi = {
  getGeofences,
  getGeofenceById,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  toggleGeofence,
  bulkCreateGeofences,
  validateLocation,
  validateLocationGet,
  getGeofenceStatus,
  getGeofenceStatusGet,
  findNearbyGeofences
};

export default geofenceApi;
