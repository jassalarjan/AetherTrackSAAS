/**
 * Audit Service
 * 
 * Service for audit logging of attendance verification events.
 * Tracks all attendance-related actions for compliance and security.
 */

import AttendanceAudit from '../models/AttendanceAudit.js';
import Attendance from '../models/Attendance.js';

class AuditService {
  /**
   * Log a check-in event
   * @param {string} attendanceId - Attendance record ID
   * @param {string} userId - User checking in
   * @param {string} workspaceId - Workspace ID
   * @param {Object} verificationData - Verification data
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Created audit entry
   */
  static async logCheckIn(attendanceId, userId, workspaceId, verificationData = {}, ipAddress = null) {
    const auditEntry = await AttendanceAudit.logEvent({
      workspaceId,
      attendanceId,
      userId,
      action: 'CHECKIN',
      details: {
        verificationStatus: verificationData.verificationStatus || 'pending',
        flags: verificationData.flags || [],
        metadata: {
          hasPhoto: !!verificationData.photoUrl,
          hasGPS: !!verificationData.gpsLocation,
          deviceInfo: verificationData.deviceInfo
        }
      },
      performedBy: userId,
      ipAddress
    });
    
    return auditEntry;
  }

  /**
   * Log a check-out event
   * @param {string} attendanceId - Attendance record ID
   * @param {string} userId - User checking out
   * @param {string} workspaceId - Workspace ID
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Created audit entry
   */
  static async logCheckOut(attendanceId, userId, workspaceId, ipAddress = null) {
    const auditEntry = await AttendanceAudit.logEvent({
      workspaceId,
      attendanceId,
      userId,
      action: 'CHECKOUT',
      details: {
        verificationStatus: 'pending',
        metadata: {}
      },
      performedBy: userId,
      ipAddress
    });
    
    return auditEntry;
  }

  /**
   * Log a verification event
   * @param {string} attendanceId - Attendance record ID
   * @param {string} userId - User associated with attendance
   * @param {string} workspaceId - Workspace ID
   * @param {Array} flags - Verification flags
   * @param {string} status - Verification status
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Created audit entry
   */
  static async logVerification(attendanceId, userId, workspaceId, flags = [], status = 'pending', ipAddress = null) {
    const action = status === 'approved' || status === 'auto_approved' 
      ? 'LOCATION_VALIDATED' 
      : 'VERIFICATION_FAILED';
    
    const auditEntry = await AttendanceAudit.logEvent({
      workspaceId,
      attendanceId,
      userId,
      action,
      details: {
        verificationStatus: status,
        flags,
        metadata: {}
      },
      performedBy: userId, // System/user performed verification
      ipAddress
    });
    
    return auditEntry;
  }

  /**
   * Log an admin action
   * @param {string} attendanceId - Attendance record ID
   * @param {string} adminId - Admin user ID
   * @param {string} workspaceId - Workspace ID
   * @param {string} action - Action type (APPROVE, REJECT, OVERRIDE)
   * @param {Object} details - Action details
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Created audit entry
   */
  static async logAdminAction(attendanceId, adminId, workspaceId, action, details = {}, ipAddress = null) {
    const auditEntry = await AttendanceAudit.logEvent({
      workspaceId,
      attendanceId,
      userId: adminId,
      action,
      details: {
        verificationStatus: details.verificationStatus,
        previousStatus: details.previousStatus,
        newStatus: details.newStatus,
        reason: details.reason,
        metadata: details.metadata || {}
      },
      performedBy: adminId,
      ipAddress
    });
    
    return auditEntry;
  }

  /**
   * Log an override action
   * @param {string} attendanceId - Attendance record ID
   * @param {string} adminId - Admin user ID
   * @param {string} workspaceId - Workspace ID
   * @param {string} reason - Override reason
   * @param {Object} originalData - Original attendance data
   * @param {Object} newData - New attendance data
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>} Created audit entry
   */
  static async logOverride(attendanceId, adminId, workspaceId, reason, originalData = {}, newData = {}, ipAddress = null) {
    const auditEntry = await AttendanceAudit.logEvent({
      workspaceId,
      attendanceId,
      userId: adminId,
      action: 'OVERRIDE',
      details: {
        reason,
        previousStatus: originalData.status,
        newStatus: newData.status,
        metadata: {
          original: {
            checkIn: originalData.checkIn,
            checkOut: originalData.checkOut,
            status: originalData.status
          },
          new: {
            checkIn: newData.checkIn,
            checkOut: newData.checkOut,
            status: newData.status
          }
        }
      },
      performedBy: adminId,
      ipAddress
    });
    
    return auditEntry;
  }

  // ==================== QUERY FUNCTIONS ====================

  /**
   * Get full audit trail for an attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit trail
   */
  static async getAttendanceAuditTrail(attendanceId, options = {}) {
    const { limit = 50, skip = 0, action } = options;
    
    const auditTrail = await AttendanceAudit.getAttendanceHistory(attendanceId, {
      limit,
      skip,
      action
    });
    
    return auditTrail.map(entry => ({
      id: entry._id,
      action: entry.action,
      userId: entry.userId,
      performedBy: entry.performedBy,
      timestamp: entry.timestamp,
      ipAddress: entry.ipAddress,
      details: entry.details
    }));
  }

  /**
   * Get user's attendance history with audit
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} User's attendance history
   */
  static async getUserAttendanceHistory(userId, workspaceId, startDate, endDate) {
    const query = {
      workspaceId,
      userId
    };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    const audits = await AttendanceAudit.find(query)
      .sort({ timestamp: -1 })
      .populate('performedBy', 'name email')
      .limit(500);
    
    // Group by attendance ID
    const groupedAudits = {};
    for (const audit of audits) {
      const attendanceIdStr = audit.attendanceId.toString();
      if (!groupedAudits[attendanceIdStr]) {
        groupedAudits[attendanceIdStr] = {
          attendanceId: audit.attendanceId,
          events: []
        };
      }
      groupedAudits[attendanceIdStr].events.push({
        id: audit._id,
        action: audit.action,
        performedBy: audit.performedBy,
        timestamp: audit.timestamp,
        ipAddress: audit.ipAddress,
        details: audit.details
      });
    }
    
    return Object.values(groupedAudits);
  }

  /**
   * Get failed verification records
   * @param {string} workspaceId - Workspace ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Failed verification records
   */
  static async getVerificationFailures(workspaceId, startDate, endDate) {
    const query = {
      workspaceId,
      action: 'VERIFICATION_FAILED'
    };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    const failures = await AttendanceAudit.find(query)
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .populate('performedBy', 'name email');
    
    return failures.map(failure => ({
      id: failure._id,
      attendanceId: failure.attendanceId,
      user: failure.userId,
      timestamp: failure.timestamp,
      ipAddress: failure.ipAddress,
      flags: failure.details.flags,
      verificationStatus: failure.details.verificationStatus
    }));
  }

  /**
   * Get audit summary for a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Audit summary
   */
  static async getAuditSummary(workspaceId, startDate, endDate) {
    const matchQuery = { workspaceId };
    
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) {
        matchQuery.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Get action counts
    const actionCounts = await AttendanceAudit.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);
    
    // Get unique users
    const uniqueUsers = await AttendanceAudit.distinct('userId', matchQuery);
    
    // Get unique attendances
    const uniqueAttendances = await AttendanceAudit.distinct('attendanceId', matchQuery);
    
    // Get daily counts
    const dailyCounts = await AttendanceAudit.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);
    
    // Format action counts
    const summary = {
      totalEvents: actionCounts.reduce((sum, item) => sum + item.count, 0),
      uniqueUsers: uniqueUsers.length,
      uniqueAttendances: uniqueAttendances.length,
      actions: {},
      dailyCounts
    };
    
    for (const item of actionCounts) {
      summary.actions[item._id] = item.count;
    }
    
    return summary;
  }

  /**
   * Get recent audit events
   * @param {string} workspaceId - Workspace ID
   * @param {number} limit - Number of records
   * @param {string} action - Filter by action type
   * @returns {Promise<Array>} Recent audit events
   */
  static async getRecentEvents(workspaceId, limit = 100, action = null) {
    const query = { workspaceId };
    if (action) {
      query.action = action;
    }
    
    const events = await AttendanceAudit.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .populate('performedBy', 'name email');
    
    return events.map(event => ({
      id: event._id,
      attendanceId: event.attendanceId,
      user: event.userId,
      action: event.action,
      performedBy: event.performedBy,
      timestamp: event.timestamp,
      ipAddress: event.ipAddress,
      details: event.details
    }));
  }

  /**
   * Get audit events by type
   * @param {string} workspaceId - Workspace ID
   * @param {string} action - Action type
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Audit events
   */
  static async getEventsByType(workspaceId, action, startDate, endDate) {
    const query = {
      workspaceId,
      action
    };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    const events = await AttendanceAudit.find(query)
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .populate('performedBy', 'name email');
    
    return events;
  }

  /**
   * Get all flag occurrences within a date range
   * @param {string} workspaceId - Workspace ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Flag statistics
   */
  static async getFlagStatistics(workspaceId, startDate, endDate) {
    const query = {
      workspaceId,
      'details.flags': { $exists: true, $ne: [] }
    };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    const events = await AttendanceAudit.find(query);
    
    // Count flags
    const flagCounts = {};
    for (const event of events) {
      if (event.details.flags && event.details.flags.length > 0) {
        for (const flag of event.details.flags) {
          flagCounts[flag] = (flagCounts[flag] || 0) + 1;
        }
      }
    }
    
    return {
      totalEvents: events.length,
      flags: flagCounts,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };
  }
}

export default AuditService;
