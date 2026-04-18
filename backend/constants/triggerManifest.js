export const TRIGGER_MANIFEST = [
  {
    id: 'task.created',
    label: 'Task Created',
    entityType: 'task',
    action: 'created',
    availableFields: ['taskName', 'assignee', 'project', 'priority'],
    description: 'Fires when a new task is created'
  },
  {
    id: 'task.completed',
    label: 'Task Completed',
    entityType: 'task',
    action: 'completed',
    availableFields: ['taskName', 'assignee', 'completedBy', 'project'],
    description: 'Fires when a task is marked completed'
  },
  {
    id: 'task.status_changed',
    label: 'Task Status Changed',
    entityType: 'task',
    action: 'status_changed',
    availableFields: ['taskName', 'fromStatus', 'toStatus', 'assignee', 'project'],
    description: 'Fires when any task changes its status'
  },
  {
    id: 'task.deleted',
    label: 'Task Deleted',
    entityType: 'task',
    action: 'deleted',
    availableFields: ['taskName', 'project', 'deletedBy'],
    description: 'Fires when a task is deleted'
  },
  {
    id: 'task.assigned',
    label: 'Task Assigned',
    entityType: 'task',
    action: 'assigned',
    availableFields: ['taskName', 'assignee', 'assignedBy', 'project'],
    description: 'Fires when a task assignee changes'
  },
  {
    id: 'project.created',
    label: 'Project Created',
    entityType: 'project',
    action: 'created',
    availableFields: ['projectName', 'owner', 'priority', 'dueDate'],
    description: 'Fires when a new project is created'
  },
  {
    id: 'project.updated',
    label: 'Project Updated',
    entityType: 'project',
    action: 'updated',
    availableFields: ['projectName', 'updatedBy', 'changedField'],
    description: 'Fires when project details are updated'
  },
  {
    id: 'project.deleted',
    label: 'Project Deleted',
    entityType: 'project',
    action: 'deleted',
    availableFields: ['projectName', 'deletedBy'],
    description: 'Fires when a project is deleted'
  },
  {
    id: 'project.milestone_reached',
    label: 'Project Milestone Reached',
    entityType: 'milestone',
    action: 'completed',
    availableFields: ['milestoneName', 'project', 'completedBy'],
    description: 'Fires when a milestone is completed'
  },
  {
    id: 'member.added',
    label: 'Member Added',
    entityType: 'member',
    action: 'created',
    availableFields: ['memberName', 'memberEmail', 'role'],
    description: 'Fires when a member is added to the workspace'
  },
  {
    id: 'member.removed',
    label: 'Member Removed',
    entityType: 'member',
    action: 'deleted',
    availableFields: ['memberName', 'memberEmail', 'role'],
    description: 'Fires when a member is removed from the workspace'
  },
  {
    id: 'team.created',
    label: 'Team Created',
    entityType: 'team',
    action: 'created',
    availableFields: ['teamName', 'owner'],
    description: 'Fires when a team is created'
  },
  {
    id: 'team.updated',
    label: 'Team Updated',
    entityType: 'team',
    action: 'updated',
    availableFields: ['teamName', 'updatedBy', 'changedField'],
    description: 'Fires when a team is updated'
  },
  {
    id: 'team.deleted',
    label: 'Team Deleted',
    entityType: 'team',
    action: 'deleted',
    availableFields: ['teamName', 'deletedBy'],
    description: 'Fires when a team is deleted'
  },
  {
    id: 'sprint.started',
    label: 'Sprint Started',
    entityType: 'sprint',
    action: 'status_changed',
    availableFields: ['sprintName', 'project', 'startDate', 'endDate'],
    description: 'Fires when a sprint status changes to active'
  },
  {
    id: 'sprint.completed',
    label: 'Sprint Completed',
    entityType: 'sprint',
    action: 'completed',
    availableFields: ['sprintName', 'project', 'velocity'],
    description: 'Fires when a sprint is completed'
  },
  {
    id: 'attendance.check_in',
    label: 'Attendance Check-In',
    entityType: 'attendance',
    action: 'check_in',
    availableFields: ['employeeName', 'checkInTime', 'location'],
    description: 'Fires when a user checks in'
  },
  {
    id: 'attendance.check_out',
    label: 'Attendance Check-Out',
    entityType: 'attendance',
    action: 'check_out',
    availableFields: ['employeeName', 'checkOutTime', 'workHours'],
    description: 'Fires when a user checks out'
  },
  {
    id: 'leave.submitted',
    label: 'Leave Submitted',
    entityType: 'leave',
    action: 'created',
    availableFields: ['employeeName', 'leaveType', 'fromDate', 'toDate'],
    description: 'Fires when a leave request is submitted'
  },
  {
    id: 'leave.approved',
    label: 'Leave Approved',
    entityType: 'leave',
    action: 'approved',
    availableFields: ['employeeName', 'leaveType', 'approvedBy'],
    description: 'Fires when a leave request is approved'
  },
  {
    id: 'leave.rejected',
    label: 'Leave Rejected',
    entityType: 'leave',
    action: 'rejected',
    availableFields: ['employeeName', 'leaveType', 'rejectedBy'],
    description: 'Fires when a leave request is rejected'
  },
  {
    id: 'email.sent',
    label: 'Email Sent',
    entityType: 'email',
    action: 'sent',
    availableFields: ['recipient', 'subject', 'templateName'],
    description: 'Fires when an email is sent'
  },
  {
    id: 'email.failed',
    label: 'Email Failed',
    entityType: 'email',
    action: 'failed',
    availableFields: ['recipient', 'subject', 'errorMessage'],
    description: 'Fires when email delivery fails'
  },
  {
    id: 'notification.sent',
    label: 'Notification Sent',
    entityType: 'notification',
    action: 'sent',
    availableFields: ['recipient', 'channel', 'messageType'],
    description: 'Fires when a notification is sent'
  },
  {
    id: 'user.login',
    label: 'User Login',
    entityType: 'auth',
    action: 'login',
    availableFields: ['userName', 'email', 'ipAddress'],
    description: 'Fires when a user logs in'
  },
  {
    id: 'user.logout',
    label: 'User Logout',
    entityType: 'auth',
    action: 'logout',
    availableFields: ['userName', 'email', 'ipAddress'],
    description: 'Fires when a user logs out'
  },
  {
    id: 'comment.added',
    label: 'Comment Added',
    entityType: 'comment',
    action: 'created',
    availableFields: ['author', 'taskName', 'project'],
    description: 'Fires when a comment is added'
  },
  {
    id: 'bulk.import',
    label: 'Bulk Import Completed',
    entityType: 'system',
    action: 'bulk_import',
    availableFields: ['entityType', 'importedCount', 'failedCount'],
    description: 'Fires when a bulk import operation completes'
  }
];
