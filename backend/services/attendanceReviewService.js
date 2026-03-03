/**
 * Attendance Review Service
 * 
 * Service for admin review functionality of attendance records.
 * Handles approval, rejection, and override of attendance records.
 */

import Attendance from '../models/Attendance.js';
import AttendanceAudit from '../models/AttendanceAudit.js';
import User from '../models/User.js';

class AttendanceReviewService {
  /**
   * Approve an attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {string} adminId - Admin user ID
   * @param {string} notes - Review notes
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Updated attendance
   */
  static async approveAttendance(attendanceId, adminId, notes = '', ipAddress = null) {
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    
    // Check if already reviewed
    if (attendance.adminReview?.reviewedAt) {
      throw new Error('Attendance record has already been reviewed');
    }
    
    const previousStatus = attendance.verificationStatus;
    
    // Update attendance
    attendance.verificationStatus = 'approved';
    attendance.adminReview = {
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: notes,
      reviewAction: 'approved'
    };
    
    await attendance.save();
    
    // Log the approval action
    await AttendanceAudit.logEvent({
      workspaceId: attendance.workspaceId,
      attendanceId,
      userId: attendance.userId,
      action: 'APPROVE',
      details: {
        verificationStatus: 'approved',
        previousStatus,
        newStatus: 'approved',
        reason: notes,
        metadata: {}
      },
      performedBy: adminId,
      ipAddress
    });
    
    return attendance;
  }

  /**
   * Reject an attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Rejection reason
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Updated attendance
   */
  static async rejectAttendance(attendanceId, adminId, reason = '', ipAddress = null) {
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    
    // Check if already reviewed
    if (attendance.adminReview?.reviewedAt) {
      throw new Error('Attendance record has already been reviewed');
    }
    
    const previousStatus = attendance.verificationStatus;
    
    // Update attendance
    attendance.verificationStatus = 'rejected';
    attendance.adminReview = {
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: reason,
      reviewAction: 'rejected'
    };
    
    await attendance.save();
    
    // Log the rejection action
    await AttendanceAudit.logEvent({
      workspaceId: attendance.workspaceId,
      attendanceId,
      userId: attendance.userId,
      action: 'REJECT',
      details: {
        verificationStatus: 'rejected',
        previousStatus,
        newStatus: 'rejected',
        reason,
        metadata: {}
      },
      performedBy: adminId,
      ipAddress
    });
    
    return attendance;
  }

  /**
   * Override an attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {string} adminId - Admin user ID
   * @param {Object} overrideData - Data to override
   * @param {string} reason - Override reason
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Updated attendance
   */
  static async overrideAttendance(attendanceId, adminId, overrideData, reason = '', ipAddress = null) {
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    
    // Store original data for audit
    const originalData = {
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      workingHours: attendance.workingHours,
      notes: attendance.notes
    };
    
    // Validate override data
    await this.validateOverride(attendanceId, overrideData);
    
    // Apply overrides
    if (overrideData.checkIn !== undefined) {
      attendance.checkIn = overrideData.checkIn;
    }
    if (overrideData.checkOut !== undefined) {
      attendance.checkOut = overrideData.checkOut;
    }
    if (overrideData.status !== undefined) {
      attendance.status = overrideData.status;
    }
    if (overrideData.notes !== undefined) {
      attendance.notes = overrideData.notes;
    }
    if (overrideData.workMode !== undefined) {
      attendance.workMode = overrideData.workMode;
    }
    if (overrideData.reason !== undefined) {
      attendance.reason = overrideData.reason;
    }
    
    // Mark as overridden
    attendance.isOverride = true;
    attendance.isOverridden = true;
    attendance.overrideBy = adminId;
    attendance.overrideReason = reason;
    attendance.overrideTimestamp = new Date();
    
    // Set verification status based on override
    if (overrideData.verificationStatus) {
      attendance.verificationStatus = overrideData.verificationStatus;
    }
    
    await attendance.save();
    
    // Log the override action
    await AttendanceAudit.logEvent({
      workspaceId: attendance.workspaceId,
      attendanceId,
      userId: attendance.userId,
      action: 'OVERRIDE',
      details: {
        reason,
        previousStatus: originalData.status,
        newStatus: attendance.status,
        metadata: {
          original: originalData,
          new: {
            checkIn: attendance.checkIn,
            checkOut: attendance.checkOut,
            status: attendance.status,
            workingHours: attendance.workingHours
          }
        }
      },
      performedBy: adminId,
      ipAddress
    });
    
    return attendance;
  }

  /**
   * Bulk review multiple attendance records
   * @param {Array} attendanceIds - Array of attendance IDs
   * @param {string} adminId - Admin user ID
   * @param {string} action - Action to perform (approve/reject)
   * @param {string} notes - Notes for all records
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Bulk operation result
   */
  static async bulkReview(attendanceIds, adminId, action, notes = '', ipAddress = null) {
    const results = {
      success: [],
      failed: [],
      total: attendanceIds.length
    };
    
    for (const attendanceId of attendanceIds) {
      try {
        let updatedAttendance;
        
        if (action === 'approve') {
          updatedAttendance = await this.approveAttendance(attendanceId, adminId, notes, ipAddress);
        } else if (action === 'reject') {
          updatedAttendance = await this.rejectAttendance(attendanceId, adminId, notes, ipAddress);
        } else {
          throw new Error(`Invalid action: ${action}`);
        }
        
        results.success.push({
          id: attendanceId,
          status: updatedAttendance.verificationStatus
        });
      } catch (error) {
        results.failed.push({
          id: attendanceId,
          error: error.message
        });
      }
    }
    
    results.successCount = results.success.length;
    results.failedCount = results.failed.length;
    
    return results;
  }

  // ==================== QUERY FUNCTIONS ====================

  /**
   * Get pending attendance records for review
   * @param {string} workspaceId - Workspace ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Pending attendance records
   */
  static async getPendingReviews(workspaceId, filters = {}) {
    const query = {
      workspaceId,
      verificationStatus: 'pending'
    };
    
    // Apply additional filters
    if (filters.userId) {
      query.userId = filters.userId;
    }
    
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.hasFlags) {
      query.verificationFlags = { $exists: true, $ne: [] };
    }
    
    const attendances = await Attendance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .populate('userId', 'name email')
      .limit(filters.limit || 100)
      .skip(filters.skip || 0);
    
    return attendances.map(att => ({
      id: att._id,
      user: att.userId,
      date: att.date,
      checkIn: att.checkIn,
      checkOut: att.checkOut,
      status: att.status,
      verificationStatus: att.verificationStatus,
      verificationFlags: att.verificationFlags,
      verification: {
        photoUrl: att.verification?.photoUrl,
        gpsLocation: att.verification?.gpsLocation,
        deviceInfo: att.verification?.deviceInfo
      },
      createdAt: att.createdAt
    }));
  }

  /**
   * Get attendance details for review
   * @param {string} attendanceId - Attendance record ID
   * @returns {Promise<Object>} Attendance details
   */
  static async getReviewableAttendance(attendanceId) {
    const attendance = await Attendance.findById(attendanceId)
      .populate('userId', 'name email')
      .populate('overrideBy', 'name email')
      .populate('adminReview.reviewedBy', 'name email');
    
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    
    // Get audit trail
    const auditTrail = await AttendanceAudit.getAttendanceHistory(attendanceId, { limit: 50 });
    
    return {
      id: attendance._id,
      user: attendance.userId,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      workMode: attendance.workMode,
      reason: attendance.reason,
      workingHours: attendance.workingHours,
      verificationStatus: attendance.verificationStatus,
      verificationFlags: attendance.verificationFlags,
      verification: {
        photoUrl: attendance.verification?.photoUrl,
        photoPublicId: attendance.verification?.photoPublicId,
        photoHash: attendance.verification?.photoHash,
        gpsLocation: attendance.verification?.gpsLocation,
        deviceInfo: attendance.verification?.deviceInfo,
        serverTimestamp: attendance.verification?.serverTimestamp
      },
      adminReview: attendance.adminReview,
      isOverride: attendance.isOverride,
      isOverridden: attendance.isOverridden,
      overrideBy: attendance.overrideBy,
      overrideReason: attendance.overrideReason,
      overrideTimestamp: attendance.overrideTimestamp,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
      auditTrail: auditTrail.map(audit => ({
        id: audit._id,
        action: audit.action,
        performedBy: audit.performedBy,
        timestamp: audit.timestamp,
        details: audit.details
      }))
    };
  }

  /**
   * Get review history for an attendance record
   * @param {string} attendanceId - Attendance record ID
   * @returns {Promise<Array>} Review history
   */
  static async getReviewHistory(attendanceId) {
    const reviewActions = ['APPROVE', 'REJECT', 'OVERRIDE'];
    
    const history = await AttendanceAudit.find({
      attendanceId,
      action: { $in: reviewActions }
    })
      .sort({ timestamp: -1 })
      .populate('performedBy', 'name email');
    
    return history.map(h => ({
      id: h._id,
      action: h.action,
      performedBy: h.performedBy,
      timestamp: h.timestamp,
      details: h.details
    }));
  }

  // ==================== VALIDATION ====================

  /**
   * Check if admin can review an attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {string} adminId - Admin user ID
   * @returns {Object} Check result
   */
  static async canReview(attendanceId, adminId) {
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      return { canReview: false, reason: 'Attendance record not found' };
    }
    
    // Check if already reviewed
    if (attendance.adminReview?.reviewedAt) {
      return { canReview: false, reason: 'Already reviewed' };
    }
    
    // Check if verification is pending
    if (attendance.verificationStatus !== 'pending') {
      return { 
        canReview: false, 
        reason: `Verification status is ${attendance.verificationStatus}, not pending` 
      };
    }
    
    // Check workspace membership (admin must have access to the workspace)
    // This would typically check against the workspace
    return { canReview: true, reason: null };
  }

  /**
   * Validate override data
   * @param {string} attendanceId - Attendance record ID
   * @param {Object} overrideData - Override data to validate
   * @returns {Object} Validation result
   */
  static async validateOverride(attendanceId, overrideData) {
    const errors = [];
    
    // Check if attendance exists
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      errors.push('Attendance record not found');
      return { valid: false, errors };
    }
    
    // Validate check-in/check-out times
    if (overrideData.checkIn !== undefined && overrideData.checkIn !== null) {
      const checkInDate = new Date(overrideData.checkIn);
      if (isNaN(checkInDate.getTime())) {
        errors.push('Invalid check-in date');
      }
      
      // Check if check-in is after check-out (if check-out is also being overridden or exists)
      if (overrideData.checkOut !== undefined) {
        const checkOutDate = new Date(overrideData.checkOut);
        if (checkInDate > checkOutDate) {
          errors.push('Check-in time cannot be after check-out time');
        }
      } else if (attendance.checkOut) {
        if (checkInDate > new Date(attendance.checkOut)) {
          errors.push('Check-in time cannot be after existing check-out time');
        }
      }
    }
    
    if (overrideData.checkOut !== undefined && overrideData.checkOut !== null) {
      const checkOutDate = new Date(overrideData.checkOut);
      if (isNaN(checkOutDate.getTime())) {
        errors.push('Invalid check-out date');
      }
    }
    
    // Validate status
    if (overrideData.status !== undefined) {
      const validStatuses = ['present', 'absent', 'half_day', 'leave', 'wfh', 'holiday'];
      if (!validStatuses.includes(overrideData.status)) {
        errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }
    
    // Validate work mode
    if (overrideData.workMode !== undefined) {
      const validWorkModes = ['onsite', 'wfh', 'hybrid', null];
      if (!validWorkModes.includes(overrideData.workMode)) {
        errors.push('Invalid work mode');
      }
    }
    
    // Validate verification status
    if (overrideData.verificationStatus !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected', 'auto_approved', 'auto_rejected'];
      if (!validStatuses.includes(overrideData.verificationStatus)) {
        errors.push(`Invalid verification status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  // ==================== ADDITIONAL QUERIES ====================

  /**
   * Get rejected attendance records
   * @param {string} workspaceId - Workspace ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Rejected records
   */
  static async getRejectedRecords(workspaceId, filters = {}) {
    const query = {
      workspaceId,
      verificationStatus: 'rejected'
    };
    
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }
    
    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('userId', 'name email')
      .populate('adminReview.reviewedBy', 'name email');
    
    return records.map(r => ({
      id: r._id,
      user: r.userId,
      date: r.date,
      status: r.status,
      adminReview: r.adminReview
    }));
  }

  /**
   * Get attendance statistics for a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Statistics
   */
  static async getReviewStatistics(workspaceId, startDate, endDate) {
    const query = { workspaceId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    const [total, pending, approved, rejected] = await Promise.all([
      Attendance.countDocuments(query),
      Attendance.countDocuments({ ...query, verificationStatus: 'pending' }),
      Attendance.countDocuments({ ...query, verificationStatus: 'approved' }),
      Attendance.countDocuments({ ...query, verificationStatus: 'rejected' })
    ]);
    
    // Get flag statistics
    const flagQuery = { ...query, verificationFlags: { $exists: true, $ne: [] } };
    const recordsWithFlags = await Attendance.find(flagQuery);
    
    const flagCounts = {};
    for (const record of recordsWithFlags) {
      for (const flag of record.verificationFlags) {
        flagCounts[flag] = (flagCounts[flag] || 0) + 1;
      }
    }
    
    return {
      total,
      pending,
      approved,
      rejected,
      flags: flagCounts,
      dateRange: { start: startDate, end: endDate }
    };
  }
}

export default AttendanceReviewService;
