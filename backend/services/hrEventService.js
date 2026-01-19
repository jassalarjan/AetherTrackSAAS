import EmailTemplate from '../models/EmailTemplate.js';
import User from '../models/User.js';
import brevoEmailService from './brevoEmailService.js';
import { logChange } from '../utils/changeLogService.js';

/**
 * HR Event Service
 * Maps HR events to email templates and dispatches emails via Brevo
 */
class HrEventService {
  // Mandatory event-to-template mapping
  static EVENT_TEMPLATE_MAP = {
    LEAVE_APPROVED: 'LEAVE_APPROVED',
    LEAVE_REJECTED: 'LEAVE_REJECTED',
    ATTENDANCE_OVERRIDDEN: 'ATTENDANCE_REMINDER',
    EMPLOYEE_ACTIVATED: 'EMPLOYEE_ACTIVATED',
    EMPLOYEE_DEACTIVATED: 'EMPLOYEE_DEACTIVATED'
  };

  /**
   * Handle HR event by sending appropriate email
   * @param {string} event - HR event type
   * @param {Object} data - Event data
   * @param {string} workspaceId - Workspace ID
   */
  static async handleEvent(event, data, workspaceId) {
    try {
      console.log(`🔄 Processing HR event: ${event}`, data);

      // Check if employee is ACTIVE (block send for INACTIVE/EXITED)
      if (data.employeeId) {
        const employee = await User.findById(data.employeeId);
        if (!employee || employee.employmentStatus !== 'ACTIVE') {
          console.log(`🚫 Skipping email for ${event}: Employee not ACTIVE (status: ${employee?.employmentStatus})`);
          return {
            success: false,
            reason: 'Employee not active',
            event,
            employeeStatus: employee?.employmentStatus
          };
        }
      }

      // Get template code from mapping
      const templateCode = this.EVENT_TEMPLATE_MAP[event];
      if (!templateCode) {
        console.log(`⚠️ No template mapping for event: ${event}`);
        return { success: false, reason: 'No template mapping', event };
      }

      // Find template
      const template = await EmailTemplate.findOne({
        code: templateCode,
        isActive: true,
        $or: [
          { workspaceId },
          { workspaceId: null, isPredefined: true }
        ]
      });

      if (!template) {
        console.log(`⚠️ Template not found: ${templateCode} for workspace ${workspaceId}`);
        return { success: false, reason: 'Template not found', event, templateCode };
      }

      // Resolve variables
      const params = this.resolveVariables(event, data);

      // Send email
      const emailResult = await brevoEmailService.send({
        to: data.employeeEmail,
        subject: template.subject,
        htmlContent: template.htmlContent,
        params
      });

      // Log delivery result
      await logChange({
        event_type: 'hr_email_sent',
        target_type: 'user',
        target_id: data.employeeId,
        action: 'send',
        description: `HR email sent for ${event}`,
        metadata: {
          event,
          templateCode,
          emailResult,
          messageId: emailResult.messageId,
          employeeEmail: data.employeeEmail
        },
        workspaceId
      });

      console.log(`✅ HR email sent for ${event}:`, emailResult);

      return {
        success: emailResult.success,
        event,
        templateCode,
        messageId: emailResult.messageId,
        employeeEmail: data.employeeEmail
      };

    } catch (error) {
      console.error(`❌ Error handling HR event ${event}:`, error);

      // Log error
      await logChange({
        event_type: 'hr_email_error',
        target_type: 'user',
        target_id: data.employeeId,
        action: 'error',
        description: `HR email failed for ${event}: ${error.message}`,
        metadata: { event, error: error.message },
        workspaceId
      });

      return {
        success: false,
        event,
        error: error.message
      };
    }
  }

  /**
   * Resolve variables for template interpolation
   */
  static resolveVariables(event, data) {
    const baseVars = {
      employeeName: data.employeeName || '',
      employeeEmail: data.employeeEmail || '',
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString()
    };

    switch (event) {
      case 'LEAVE_APPROVED':
        return {
          ...baseVars,
          leaveId: data.leaveId || '',
          approvalDate: new Date().toLocaleDateString()
        };

      case 'LEAVE_REJECTED':
        return {
          ...baseVars,
          leaveId: data.leaveId || '',
          rejectionReason: data.reason || '',
          rejectionDate: new Date().toLocaleDateString()
        };

      case 'ATTENDANCE_OVERRIDDEN':
        return {
          ...baseVars,
          attendanceId: data.attendanceId || '',
          overrideDate: new Date().toLocaleDateString()
        };

      case 'EMPLOYEE_ACTIVATED':
        return {
          ...baseVars,
          activationDate: new Date().toLocaleDateString()
        };

      case 'EMPLOYEE_DEACTIVATED':
        return {
          ...baseVars,
          deactivationDate: new Date().toLocaleDateString()
        };

      default:
        return baseVars;
    }
  }
}

export default HrEventService;