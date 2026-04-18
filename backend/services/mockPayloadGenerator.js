const samplePeople = ['Arjan Singh', 'Jane Doe', 'Mohit Sharma', 'Anita Verma', 'Luis Garcia', 'Nina Patel'];
const sampleTasks = ['Redesign login page', 'Write API docs', 'Fix payment webhook', 'Optimize dashboard query'];
const sampleProjects = ['Q3 Marketing Push', 'Mobile App Revamp', 'Client Onboarding'];
const sampleMilestones = ['Beta Launch', 'UAT Sign-off', 'Production Cutover'];

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const baseChangelog = () => ({
  entityId: `mock-${Date.now()}`,
  changedBy: 'mock-user-id',
  changedByName: randomFrom(samplePeople),
  changedAt: new Date().toISOString(),
  diff: {}
});

const MOCK_CHANGELOG_BY_TRIGGER = {
  'task.status_changed': () => ({
    ...baseChangelog(),
    entityType: 'task',
    action: 'status_changed',
    entityName: randomFrom(sampleTasks),
    diff: { fromStatus: 'in_progress', toStatus: 'done' }
  }),
  'task.assigned': () => ({
    ...baseChangelog(),
    entityType: 'task',
    action: 'assigned',
    entityName: randomFrom(sampleTasks),
    diff: { assignee: randomFrom(samplePeople) }
  }),
  'task.created': () => ({
    ...baseChangelog(),
    entityType: 'task',
    action: 'created',
    entityName: randomFrom(sampleTasks),
    diff: { priority: randomFrom(['low', 'medium', 'high']) }
  }),
  'task.completed': () => ({
    ...baseChangelog(),
    entityType: 'task',
    action: 'completed',
    entityName: randomFrom(sampleTasks),
    diff: { completedBy: randomFrom(samplePeople) }
  }),
  'task.deleted': () => ({
    ...baseChangelog(),
    entityType: 'task',
    action: 'deleted',
    entityName: randomFrom(sampleTasks),
    diff: { deletedBy: randomFrom(samplePeople) }
  }),
  'project.created': () => ({
    ...baseChangelog(),
    entityType: 'project',
    action: 'created',
    entityName: randomFrom(sampleProjects),
    diff: { owner: randomFrom(samplePeople), priority: 'high' }
  }),
  'project.updated': () => ({
    ...baseChangelog(),
    entityType: 'project',
    action: 'updated',
    entityName: randomFrom(sampleProjects),
    diff: { changedField: randomFrom(['status', 'due_date', 'priority']) }
  }),
  'project.deleted': () => ({
    ...baseChangelog(),
    entityType: 'project',
    action: 'deleted',
    entityName: randomFrom(sampleProjects),
    diff: { deletedBy: randomFrom(samplePeople) }
  }),
  'project.milestone_reached': () => ({
    ...baseChangelog(),
    entityType: 'milestone',
    action: 'completed',
    entityName: randomFrom(sampleMilestones),
    diff: { project: randomFrom(sampleProjects) }
  }),
  'milestone.completed': () => ({
    ...baseChangelog(),
    entityType: 'milestone',
    action: 'completed',
    entityName: randomFrom(sampleMilestones),
    diff: { completedBy: randomFrom(samplePeople) }
  }),
  'member.added': () => ({
    ...baseChangelog(),
    entityType: 'member',
    action: 'created',
    entityName: randomFrom(samplePeople),
    diff: { role: randomFrom(['member', 'team_lead']) }
  }),
  'member.removed': () => ({
    ...baseChangelog(),
    entityType: 'member',
    action: 'deleted',
    entityName: randomFrom(samplePeople),
    diff: { role: randomFrom(['member', 'team_lead']) }
  }),
  'team.created': () => ({
    ...baseChangelog(),
    entityType: 'team',
    action: 'created',
    entityName: `${randomFrom(['Alpha', 'Beta', 'Gamma'])} Team`,
    diff: { owner: randomFrom(samplePeople) }
  }),
  'team.updated': () => ({
    ...baseChangelog(),
    entityType: 'team',
    action: 'updated',
    entityName: `${randomFrom(['Alpha', 'Beta', 'Gamma'])} Team`,
    diff: { changedField: 'members' }
  }),
  'team.deleted': () => ({
    ...baseChangelog(),
    entityType: 'team',
    action: 'deleted',
    entityName: `${randomFrom(['Alpha', 'Beta', 'Gamma'])} Team`,
    diff: { deletedBy: randomFrom(samplePeople) }
  }),
  'sprint.started': () => ({
    ...baseChangelog(),
    entityType: 'sprint',
    action: 'status_changed',
    entityName: `Sprint ${randomInt(10, 30)}`,
    diff: { fromStatus: 'planning', toStatus: 'active' }
  }),
  'sprint.completed': () => ({
    ...baseChangelog(),
    entityType: 'sprint',
    action: 'completed',
    entityName: `Sprint ${randomInt(10, 30)}`,
    diff: { velocity: randomInt(20, 45) }
  }),
  'attendance.check_in': () => ({
    ...baseChangelog(),
    entityType: 'attendance',
    action: 'check_in',
    entityName: randomFrom(samplePeople),
    diff: { location: 'Office HQ' }
  }),
  'attendance.check_out': () => ({
    ...baseChangelog(),
    entityType: 'attendance',
    action: 'check_out',
    entityName: randomFrom(samplePeople),
    diff: { workHours: randomInt(7, 10) }
  }),
  'leave.submitted': () => ({
    ...baseChangelog(),
    entityType: 'leave',
    action: 'created',
    entityName: randomFrom(samplePeople),
    diff: { leaveType: randomFrom(['casual', 'sick', 'earned']) }
  }),
  'leave.approved': () => ({
    ...baseChangelog(),
    entityType: 'leave',
    action: 'approved',
    entityName: randomFrom(samplePeople),
    diff: { approvedBy: randomFrom(samplePeople) }
  }),
  'leave.rejected': () => ({
    ...baseChangelog(),
    entityType: 'leave',
    action: 'rejected',
    entityName: randomFrom(samplePeople),
    diff: { rejectedBy: randomFrom(samplePeople) }
  }),
  'email.sent': () => ({
    ...baseChangelog(),
    entityType: 'email',
    action: 'sent',
    entityName: 'Campaign Message',
    diff: { recipient: 'client@example.com' }
  }),
  'email.failed': () => ({
    ...baseChangelog(),
    entityType: 'email',
    action: 'failed',
    entityName: 'Campaign Message',
    diff: { recipient: 'client@example.com', errorMessage: 'Mailbox unavailable' }
  }),
  'notification.sent': () => ({
    ...baseChangelog(),
    entityType: 'notification',
    action: 'sent',
    entityName: 'System Alert',
    diff: { channel: 'email' }
  }),
  'user.login': () => ({
    ...baseChangelog(),
    entityType: 'auth',
    action: 'login',
    entityName: randomFrom(samplePeople),
    diff: { ipAddress: '192.168.1.20' }
  }),
  'user.logout': () => ({
    ...baseChangelog(),
    entityType: 'auth',
    action: 'logout',
    entityName: randomFrom(samplePeople),
    diff: { ipAddress: '192.168.1.20' }
  }),
  'comment.added': () => ({
    ...baseChangelog(),
    entityType: 'comment',
    action: 'created',
    entityName: randomFrom(sampleTasks),
    diff: { author: randomFrom(samplePeople), comment: 'Looks good to ship.' }
  }),
  'bulk.import': () => ({
    ...baseChangelog(),
    entityType: 'system',
    action: 'bulk_import',
    entityName: 'Bulk Import',
    diff: { entityType: 'task', importedCount: randomInt(20, 200), failedCount: randomInt(0, 10) }
  })
};

export const generateMockChangelog = (changelogTriggerId) => {
  const generator = MOCK_CHANGELOG_BY_TRIGGER[String(changelogTriggerId || '').trim()];
  if (generator) return generator();

  return {
    ...baseChangelog(),
    entityType: 'task',
    action: 'updated',
    entityName: randomFrom(sampleTasks),
    diff: { note: `Mock payload for unknown trigger: ${changelogTriggerId}` }
  };
};

const createMetricBlock = () => {
  const created = randomInt(10, 50);
  const completed = randomInt(8, created);
  return {
    totalCreated: created,
    totalCompleted: completed,
    completionRate: Number(((completed / created) * 100).toFixed(1)),
    averageCompletionDays: Number((Math.random() * 6 + 1).toFixed(1)),
    tasksByStatus: {
      todo: randomInt(3, 10),
      in_progress: randomInt(3, 10),
      review: randomInt(1, 8),
      done: completed
    },
    groupedBy: [
      { label: 'Project Alpha', count: randomInt(8, 20) },
      { label: 'Project Beta', count: randomInt(6, 18) },
      { label: 'Project Gamma', count: randomInt(4, 14) }
    ]
  };
};

export const generateMockReportData = (reportAutomationLike = {}) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const teamCount = randomInt(3, 8);
  const teamActivity = Array.from({ length: teamCount }).map((_, idx) => ({
    userId: `mock-user-${idx + 1}`,
    memberName: randomFrom(samplePeople),
    tasksCompleted: randomInt(3, 15),
    tasksCreated: randomInt(4, 18),
    commentsPosted: randomInt(1, 25),
    activeDays: randomInt(3, 15)
  })).sort((a, b) => b.tasksCompleted - a.tasksCompleted);

  const taskMetrics = createMetricBlock();

  return {
    generatedAt: new Date(),
    dateRange: {
      from,
      to,
      label: from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },
    projectStats: reportAutomationLike?.reportConfig?.includeProjectStats === false
      ? null
      : {
          totalActiveProjects: randomInt(4, 18),
          projectsCompletedInRange: randomInt(1, 7),
          projectsAtRisk: randomInt(0, 4),
          newProjectsStartedInRange: randomInt(1, 6)
        },
    taskMetrics: reportAutomationLike?.reportConfig?.includeTaskMetrics === false ? null : taskMetrics,
    teamActivity: reportAutomationLike?.reportConfig?.includeTeamActivity === false ? null : teamActivity,
    milestones: reportAutomationLike?.reportConfig?.includeMilestones === false
      ? null
      : [
          { name: randomFrom(sampleMilestones), project: randomFrom(sampleProjects), dueDate: new Date(), status: randomFrom(['hit', 'missed', 'pending']) },
          { name: randomFrom(sampleMilestones), project: randomFrom(sampleProjects), dueDate: new Date(), status: randomFrom(['hit', 'missed', 'pending']) }
        ],
    overdueTasks: reportAutomationLike?.reportConfig?.includeOverdueTasks === false
      ? null
      : Array.from({ length: randomInt(4, 10) }).map((_, idx) => ({
          name: `${randomFrom(sampleTasks)} #${idx + 1}`,
          project: randomFrom(sampleProjects),
          assignee: randomFrom(samplePeople),
          daysOverdue: randomInt(1, 14)
        })).sort((a, b) => b.daysOverdue - a.daysOverdue),
    meta: {
      tenantName: 'AetherTrack Workspace',
      reportType: reportAutomationLike?.reportType || 'custom',
      groupBy: reportAutomationLike?.reportConfig?.groupBy || 'project'
    }
  };
};
