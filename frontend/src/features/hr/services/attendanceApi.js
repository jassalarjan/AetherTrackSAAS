/**
 * attendanceApi.js
 * 
 * API functions for attendance verification and management.
 * Provides functions for check-in with photo and GPS, review management,
 * and audit log retrieval.
 * 
 * API Endpoints (prefixed with /hr/attendance):
 * - GET /                         - Get attendance records
 * - POST /checkin                 - Check in with optional photo/GPS
 * - POST /checkout                - Check out
 * - GET /verification-settings    - Get verification settings (admin/HR)
 * - PUT /verification-settings    - Update verification settings (admin)
 * - GET /pending-reviews          - Get pending attendance reviews (admin/HR)
 * - GET /:id/review               - Get attendance for review (admin/HR)
 * - POST /:id/approve             - Approve attendance (admin)
 * - POST /:id/reject              - Reject attendance (admin)
 * - POST /:id/override            - Override attendance (admin)
 * - GET /:id/audit                - Get attendance audit (admin/HR)
 * - GET /audit-log                - Get audit log (admin/HR)
 */

import api from '@/shared/services/axios';

const BASE_URL = '/hr/attendance';

// ==================== Verification Settings ====================

/**
 * Get verification settings for the workspace
 * @returns {Promise<Object>} Verification settings
 */
export const getVerificationSettings = async () => {
  const response = await api.get(`${BASE_URL}/verification-settings`);
  return response.data;
};

/**
 * Update verification settings for the workspace
 * @param {Object} settings - New verification settings
 * @returns {Promise<Object>} Updated settings
 */
export const updateVerificationSettings = async (settings) => {
  const response = await api.put(`${BASE_URL}/verification-settings`, settings);
  return response.data;
};

/**
 * Get attendance governance settings (who marks attendance, special days)
 * @returns {Promise<Object>} Governance settings
 */
export const getAttendanceGovernanceSettings = async () => {
  const response = await api.get(`${BASE_URL}/verification-settings`);
  const settings = response.data?.settings || response.data || {};
  return settings.attendanceGovernance || {
    regularAttendanceMarkedBy: 'self',
    specialDays: []
  };
};

/**
 * Update attendance governance settings
 * @param {Object} attendanceGovernance - Governance config
 * @returns {Promise<Object>} Updated settings
 */
export const updateAttendanceGovernanceSettings = async (attendanceGovernance) => {
  const response = await api.put(`${BASE_URL}/verification-settings`, { attendanceGovernance });
  return response.data;
};

// ==================== Check-In ====================

/**
 * Check in with optional photo and GPS data
 * @param {Object} data - Check-in data
 * @param {string} data.checkInTime - ISO timestamp
 * @param {string} data.date - Date string (YYYY-MM-DD)
 * @param {string} data.workMode - 'onsite', 'wfh', 'hybrid'
 * @param {string} data.reason - Optional reason
 * @param {Object} data.photo - Optional photo data (base64)
 * @param {Object} data.location - Optional GPS location data
 * @returns {Promise<Object>} Check-in result with evaluation
 */
export const checkIn = async (data) => {
  const response = await api.post(`${BASE_URL}/checkin`, {
    checkInTime: data.checkInTime,
    date: data.date,
    workMode: data.workMode,
    reason: data.reason,
    location: data.location,
    // Photo is handled via separate upload if needed
    photoData: data.photo
  });
  return response.data;
};

/**
 * Check out from current attendance
 * @param {Object} data - Check-out data
 * @param {string} data.checkOutTime - ISO timestamp
 * @param {string} data.date - Optional date string
 * @returns {Promise<Object>} Check-out result with evaluation
 */
export const checkOut = async (data) => {
  const response = await api.post(`${BASE_URL}/checkout`, {
    checkOutTime: data.checkOutTime,
    date: data.date
  });
  return response.data;
};

// ==================== Review Management ====================

/**
 * Get pending attendance reviews (for admin/HR)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Pending reviews
 */
export const getPendingReviews = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}/pending-reviews?${queryString}` : `${BASE_URL}/pending-reviews`;
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Get attendance record for review (for admin/HR)
 * @param {string} id - Attendance ID
 * @returns {Promise<Object>} Attendance record with review data
 */
export const getAttendanceForReview = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}/review`);
  return response.data;
};

/**
 * Approve attendance (admin)
 * @param {string} id - Attendance ID
 * @param {string} notes - Optional approval notes
 * @returns {Promise<Object>} Approval result
 */
export const approveAttendance = async (id, notes = '') => {
  const response = await api.post(`${BASE_URL}/${id}/approve`, { notes });
  return response.data;
};

/**
 * Reject attendance (admin)
 * @param {string} id - Attendance ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Rejection result
 */
export const rejectAttendance = async (id, reason) => {
  const response = await api.post(`${BASE_URL}/${id}/reject`, { reason });
  return response.data;
};

/**
 * Override attendance (admin)
 * @param {string} id - Attendance ID
 * @param {Object} data - Override data
 * @param {string} reason - Override reason
 * @returns {Promise<Object>} Override result
 */
export const overrideAttendance = async (id, data, reason) => {
  const response = await api.post(`${BASE_URL}/${id}/override`, {
    ...data,
    reason
  });
  return response.data;
};

// ==================== Audit ====================

/**
 * Get audit log for specific attendance
 * @param {string} id - Attendance ID
 * @returns {Promise<Object>} Audit log
 */
export const getAttendanceAudit = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}/audit`);
  return response.data;
};

/**
 * Get audit log with filters (admin/HR)
 * @param {Object} filters - Audit log filters
 * @returns {Promise<Object>} Filtered audit logs
 */
export const getAuditLog = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.action) params.append('action', filters.action);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.page) params.append('page', filters.page);
  
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}/audit-log?${queryString}` : `${BASE_URL}/audit-log`;
  
  const response = await api.get(url);
  return response.data;
};

// ==================== Location Validation ====================

/**
 * Validate location against geofences (if enabled)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {boolean} required - Whether location is required
 * @returns {Promise<Object>} Validation result
 */
export const validateLocation = async (latitude, longitude, required = false) => {
  const response = await api.post('/geofences/validate', {
    latitude,
    longitude,
    required
  });
  return response.data;
};

// ==================== Default Export ====================

const attendanceApi = {
  getVerificationSettings,
  updateVerificationSettings,
  getAttendanceGovernanceSettings,
  updateAttendanceGovernanceSettings,
  checkIn,
  checkOut,
  getPendingReviews,
  getAttendanceForReview,
  approveAttendance,
  rejectAttendance,
  overrideAttendance,
  getAttendanceAudit,
  getAuditLog,
  validateLocation
};

export default attendanceApi;
