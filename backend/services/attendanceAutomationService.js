/**
 * Attendance Automation Hooks Service
 * 
 * Provides event-driven automation for attendance actions:
 * - Task reallocation triggers
 * - Notification triggers
 * - Review queue management
 * - Analytics updates
 * 
 * This service is designed to be extensible - business actions are not hardcoded.
 */

import Attendance from '../models/Attendance.js';
import AttendanceEvaluation from '../models/AttendanceEvaluation.js';
import AttendanceException from '../models/AttendanceException.js';
import User from '../models/User.js';
import { logChange } from '../utils/changeLogService.js';

// Event types for automation
export const ATTENDANCE_EVENTS = {
  CHECK_IN: 'ATTENDANCE_CHECK_IN',
  CHECK_OUT: 'ATTENDANCE_CHECK_OUT',
  STATUS_CHANGED: 'ATTENDANCE_STATUS_CHANGED',
  EXCEPTION_CREATED: 'ATTENDANCE_EXCEPTION_CREATED',
  EXCEPTION_APPROVED: 'ATTENDANCE_EXCEPTION_APPROVED',
  EXCEPTION_REJECTED: 'ATTENDANCE_EXCEPTION_REJECTED',
  IRREGULAR_PATTERN: 'ATTENDANCE_IRREGULAR_PATTERN',
  OVERRIDE_CREATED: 'ATTENDANCE_OVERRIDE_CREATED',
  MISSING_CHECKOUT: 'ATTENDANCE_MISSING_CHECKOUT'
};

class AttendanceAutomationService {
  // Registered hooks - can be extended by other services
  static hooks = {
    [ATTENDANCE_EVENTS.CHECK_IN]: [],
    [ATTENDANCE_EVENTS.CHECK_OUT]: [],
    [ATTENDANCE_EVENTS.STATUS_CHANGED]: [],
    [ATTENDANCE_EVENTS.EXCEPTION_CREATED]: [],
    [ATTENDANCE_EVENTS.EXCEPTION_APPROVED]: [],
    [ATTENDANCE_EVENTS.EXCEPTION_REJECTED]: [],
    [ATTENDANCE_EVENTS.IRREGULAR_PATTERN]: [],
    [ATTENDANCE_EVENTS.OVERRIDE_CREATED]: [],
    [ATTENDANCE_EVENTS.MISSING_CHECKOUT]: []
  };

  /**
   * Register a hook for an event type
   */
  static registerHook(eventType, handler) {
    if (!this.hooks[eventType]) {
      this.hooks[eventType] = [];
    }
    this.hooks[eventType].push(handler);
    console.log(`📌 Registered hook for event: ${eventType}`);
  }

  /**
   * Unregister a hook
   */
  static unregisterHook(eventType, handler) {
    if (this.hooks[eventType]) {
      this.hooks[eventType] = this.hooks[eventType].filter(h => h !== handler);
    }
  }

  /**
   * Trigger all hooks for an event
   */
  static async trigger(eventType, data) {
    console.log(`🔔 Triggering automation hooks for: ${eventType}`);
    
    const handlers = this.hooks[eventType] || [];
    const results = [];

    for (const handler of handlers) {
      try {
        const result = await handler(data);
        results.push({ handler: handler.name, success: true, result });
      } catch (error) {
        console.error(`❌ Error in hook ${handler.name}:`, error);
        results.push({ handler: handler.name, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Handle check-in event
   */
  static async handleCheckIn(attendance, evaluation) {
    const data = {
      attendance,
      evaluation,
      userId: attendance.userId,
      date: attendance.date,
      checkInTime: attendance.checkIn,
      workMode: attendance.workMode,
      shiftId: attendance.shift_id
    };

    // Trigger check-in hooks
    await this.trigger(ATTENDANCE_EVENTS.CHECK_IN, data);

    // Check for flags and trigger additional events
    if (evaluation?.flags?.triggered?.includes('LATE_CHECKIN')) {
      await this.trigger(ATTENDANCE_EVENTS.STATUS_CHANGED, {
        ...data,
        reason: 'Late check-in'
      });
    }

    // Log the event
    await this.logAutomationEvent('CHECK_IN', attendance.userId, data);
  }

  /**
   * Handle check-out event
   */
  static async handleCheckOut(attendance, evaluation) {
    const data = {
      attendance,
      evaluation,
      userId: attendance.userId,
      date: attendance.date,
      checkInTime: attendance.checkIn,
      checkOutTime: attendance.checkOut,
      workingHours: attendance.workingHours,
      status: attendance.status
    };

    // Trigger check-out hooks
    await this.trigger(ATTENDANCE_EVENTS.CHECK_OUT, data);

    // Check for flags
    if (evaluation?.flags?.triggered?.includes('MISSING_CHECKOUT')) {
      await this.trigger(ATTENDANCE_EVENTS.MISSING_CHECKOUT, data);
    }

    if (evaluation?.flags?.triggered?.includes('OVERTIME')) {
      await this.logAutomationEvent('OVERTIME_DETECTED', attendance.userId, {
        ...data,
        overtimeHours: evaluation.result.overtime_hours
      });
    }

    // Log the event
    await this.logAutomationEvent('CHECK_OUT', attendance.userId, data);
  }

  /**
   * Handle attendance override
   */
  static async handleOverride(attendance, overrideBy) {
    const data = {
      attendance,
      overrideBy,
      userId: attendance.userId,
      date: attendance.date,
      reason: attendance.overrideReason,
      previousStatus: attendance._previousValues?.status
    };

    // Trigger override hooks
    await this.trigger(ATTENDANCE_EVENTS.OVERRIDE_CREATED, data);

    // Log the event
    await this.logAutomationEvent('OVERRIDE', overrideBy, data);
  }

  /**
   * Handle exception created
   */
  static async handleExceptionCreated(exception) {
    const data = {
      exception,
      userId: exception.user_id,
      date: exception.date,
      exceptionType: exception.exception_type,
      details: exception.details
    };

    // Trigger exception hooks
    await this.trigger(ATTENDANCE_EVENTS.EXCEPTION_CREATED, data);

    // Log the event
    await this.logAutomationEvent('EXCEPTION_CREATED', exception.requested_by, data);
  }

  /**
   * Handle exception approved
   */
  static async handleExceptionApproved(exception, approvedBy) {
    const data = {
      exception,
      approvedBy,
      userId: exception.user_id,
      date: exception.date,
      exceptionType: exception.exception_type
    };

    // Trigger approval hooks
    await this.trigger(ATTENDANCE_EVENTS.EXCEPTION_APPROVED, data);

    // Update attendance if needed
    if (exception.attendance_id) {
      await Attendance.findByIdAndUpdate(exception.attendance_id, {
        status: exception.details?.requested_values?.status || 'present'
      });
    }

    // Log the event
    await this.logAutomationEvent('EXCEPTION_APPROVED', approvedBy, data);
  }

  /**
   * Handle exception rejected
   */
  static async handleExceptionRejected(exception, rejectedBy, reason) {
    const data = {
      exception,
      rejectedBy,
      reason,
      userId: exception.user_id,
      date: exception.date,
      exceptionType: exception.exception_type
    };

    // Trigger rejection hooks
    await this.trigger(ATTENDANCE_EVENTS.EXCEPTION_REJECTED, data);

    // Log the event
    await this.logAutomationEvent('EXCEPTION_REJECTED', rejectedBy, data);
  }

  /**
   * Handle irregular pattern detected
   */
  static async handleIrregularPattern(userId, patternData) {
    const data = {
      userId,
      patternType: patternData.patternType,
      consecutiveDays: patternData.consecutiveDays,
      dates: patternData.dates
    };

    // Trigger irregular pattern hooks
    await this.trigger(ATTENDANCE_EVENTS.IRREGULAR_PATTERN, data);

    // Log the event
    await this.logAutomationEvent('IRREGULAR_PATTERN', userId, data);
  }

  /**
   * Log automation event
   */
  static async logAutomationEvent(action, userId, metadata) {
    await logChange({
      event_type: 'automation_triggered',
      target_type: 'attendance',
      target_id: metadata.attendance?._id || metadata.exception?._id || null,
      user_id: userId,
      action,
      description: `Attendance automation: ${action}`,
      metadata: {
        event: action,
        ...metadata
      }
    });
  }

  /**
   * Get automation status and registered hooks
   */
  static getStatus() {
    return Object.entries(this.hooks).map(([event, handlers]) => ({
      event,
      handlerCount: handlers.length,
      handlers: handlers.map(h => h.name)
    }));
  }
}

// Default hooks registration - These can be extended or overridden
// Task reallocation hook
AttendanceAutomationService.registerHook(ATTENDANCE_EVENTS.CHECK_IN, async (data) => {
  console.log('⚡ Task Reallocation: Checking for task reallocation needs on check-in');
  // This will be connected to the taskReallocationService
  // import taskReallocationService from './taskReallocationService.js';
  // await taskReallocationService.checkAndReallocate(data.userId, data.date);
});

// Notification hook
AttendanceAutomationService.registerHook(ATTENDANCE_EVENTS.EXCEPTION_CREATED, async (data) => {
  console.log('⚡ Notifications: Sending notification for new exception request');
  // HR notification handled by hrEventService
});

// Review queue hook
AttendanceAutomationService.registerHook(ATTENDANCE_EVENTS.IRREGULAR_PATTERN, async (data) => {
  console.log('⚡ Review Queue: Adding user to review queue for irregular pattern');
  // Can be connected to a review queue system
});

// Missing checkout hook
AttendanceAutomationService.registerHook(ATTENDANCE_EVENTS.MISSING_CHECKOUT, async (data) => {
  console.log('⚡ Missing Checkout: Sending reminder for missing checkout');
  // Can trigger a reminder notification
});

export default AttendanceAutomationService;
