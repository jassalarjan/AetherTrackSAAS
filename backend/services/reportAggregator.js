import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Sprint from '../models/Sprint.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const asObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
};

const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const computeDateRange = async (tenantId, reportConfig = {}) => {
  const now = new Date();
  const type = reportConfig.dateRangeType || 'last_month';

  if (type === 'last_week') {
    const to = endOfDay(now);
    const from = startOfDay(new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000)));
    return { from, to, label: `${from.toLocaleDateString()} - ${to.toLocaleDateString()}` };
  }

  if (type === 'last_sprint') {
    const lastSprint = await Sprint.findOne({ workspace: tenantId, status: 'completed' }).sort({ endDate: -1 }).lean();
    if (lastSprint?.startDate && lastSprint?.endDate) {
      const from = startOfDay(lastSprint.startDate);
      const to = endOfDay(lastSprint.endDate);
      return { from, to, label: lastSprint.name || `${from.toLocaleDateString()} - ${to.toLocaleDateString()}` };
    }
  }

  if (type === 'custom' && reportConfig.customDateFrom && reportConfig.customDateTo) {
    const from = startOfDay(reportConfig.customDateFrom);
    const to = endOfDay(reportConfig.customDateTo);
    return { from, to, label: `${from.toLocaleDateString()} - ${to.toLocaleDateString()}` };
  }

  const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = startOfDay(new Date(firstOfCurrentMonth.getFullYear(), firstOfCurrentMonth.getMonth() - 1, 1));
  const to = endOfDay(new Date(firstOfCurrentMonth.getFullYear(), firstOfCurrentMonth.getMonth(), 0));
  return { from, to, label: monthLabel(from) };
};

const buildTenantScope = async (tenantId, projectFilter = []) => {
  const userRows = await User.find({ workspaceId: tenantId }).select('_id full_name').lean();
  const tenantUserIds = userRows.map((u) => u._id);
  const userNameMap = new Map(userRows.map((u) => [String(u._id), u.full_name || 'Unknown']));

  const projectQuery = { created_by: { $in: tenantUserIds } };
  if (Array.isArray(projectFilter) && projectFilter.length > 0) {
    const ids = projectFilter.map(asObjectId).filter(Boolean);
    if (ids.length > 0) projectQuery._id = { $in: ids };
  }

  const projects = await Project.find(projectQuery).select('_id name status due_date start_date updated_at').lean();
  const projectIds = projects.map((p) => p._id);
  const projectNameMap = new Map(projects.map((p) => [String(p._id), p.name || 'Untitled Project']));

  return { tenantUserIds, userNameMap, projects, projectIds, projectNameMap };
};

const safePercent = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);

const buildTaskMetrics = async ({ from, to, projectIds, projectNameMap, groupBy }) => {
  if (!projectIds.length) return null;

  const createdQuery = { project_id: { $in: projectIds }, created_at: { $gte: from, $lte: to } };
  const completedQuery = { project_id: { $in: projectIds }, status: 'done', actual_end: { $gte: from, $lte: to } };

  const [createdTotal, completedTotal, createdDocs, completedDocs, allStatusRows] = await Promise.all([
    Task.countDocuments(createdQuery),
    Task.countDocuments(completedQuery),
    Task.find(createdQuery).select('_id created_at actual_end due_date status project_id assigned_to').lean(),
    Task.find(completedQuery).select('_id created_at actual_end due_date status project_id assigned_to').lean(),
    Task.aggregate([
      { $match: { project_id: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const completionDays = completedDocs
    .map((task) => {
      if (!task.created_at || !task.actual_end) return null;
      return (new Date(task.actual_end).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((value) => value != null && value >= 0);

  const averageCompletionDays = completionDays.length
    ? Number((completionDays.reduce((sum, n) => sum + n, 0) / completionDays.length).toFixed(1))
    : 0;

  const tasksByStatus = allStatusRows.reduce((acc, row) => {
    if (!row?._id) return acc;
    acc[row._id] = row.count;
    return acc;
  }, {});

  let grouped = [];
  if (groupBy === 'status') {
    grouped = Object.entries(tasksByStatus).map(([label, count]) => ({ label, count }));
  } else if (groupBy === 'member') {
    const counts = new Map();
    createdDocs.forEach((task) => {
      const memberIds = Array.isArray(task.assigned_to) && task.assigned_to.length ? task.assigned_to : ['unassigned'];
      memberIds.forEach((memberId) => {
        const key = String(memberId);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });

    grouped = Array.from(counts.entries())
      .map(([id, count]) => ({ label: id === 'unassigned' ? 'Unassigned' : id, count }))
      .sort((a, b) => b.count - a.count);
  } else {
    const counts = new Map();
    createdDocs.forEach((task) => {
      const key = String(task.project_id || 'unknown');
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    grouped = Array.from(counts.entries())
      .map(([projectId, count]) => ({ label: projectNameMap.get(projectId) || 'Unknown Project', count }))
      .sort((a, b) => b.count - a.count);
  }

  if (createdTotal === 0 && completedTotal === 0) return null;

  return {
    totalCreated: createdTotal,
    totalCompleted: completedTotal,
    completionRate: safePercent(completedTotal, createdTotal),
    averageCompletionDays,
    tasksByStatus,
    groupedBy: grouped
  };
};

const buildTeamActivity = async ({ from, to, tenantUserIds, userNameMap, projectIds }) => {
  if (!tenantUserIds.length || !projectIds.length) return null;

  const [createdRows, completedRows, commentsRows, activeTaskRows] = await Promise.all([
    Task.aggregate([
      { $match: { created_by: { $in: tenantUserIds }, project_id: { $in: projectIds }, created_at: { $gte: from, $lte: to } } },
      { $group: { _id: '$created_by', count: { $sum: 1 } } }
    ]),
    Task.aggregate([
      { $match: { project_id: { $in: projectIds }, status: 'done', actual_end: { $gte: from, $lte: to } } },
      { $unwind: { path: '$assigned_to', preserveNullAndEmptyArrays: false } },
      { $match: { assigned_to: { $in: tenantUserIds } } },
      { $group: { _id: '$assigned_to', count: { $sum: 1 } } }
    ]),
    Comment.aggregate([
      { $match: { author_id: { $in: tenantUserIds }, created_at: { $gte: from, $lte: to } } },
      { $group: { _id: '$author_id', count: { $sum: 1 } } }
    ]),
    Task.aggregate([
      { $match: { project_id: { $in: projectIds }, updated_at: { $gte: from, $lte: to } } },
      { $unwind: { path: '$assigned_to', preserveNullAndEmptyArrays: false } },
      { $match: { assigned_to: { $in: tenantUserIds } } },
      {
        $project: {
          userId: '$assigned_to',
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$updated_at'
            }
          }
        }
      },
      { $group: { _id: { userId: '$userId', day: '$day' } } },
      { $group: { _id: '$_id.userId', count: { $sum: 1 } } }
    ])
  ]);

  const indexRows = (rows = []) => new Map(rows.map((row) => [String(row._id), row.count || 0]));
  const createdMap = indexRows(createdRows);
  const completedMap = indexRows(completedRows);
  const commentsMap = indexRows(commentsRows);
  const activeMap = indexRows(activeTaskRows);

  const activity = tenantUserIds
    .map((userId) => {
      const key = String(userId);
      return {
        userId: key,
        memberName: userNameMap.get(key) || 'Unknown Member',
        tasksCompleted: completedMap.get(key) || 0,
        tasksCreated: createdMap.get(key) || 0,
        commentsPosted: commentsMap.get(key) || 0,
        activeDays: activeMap.get(key) || 0
      };
    })
    .filter((row) => row.tasksCompleted > 0 || row.tasksCreated > 0 || row.commentsPosted > 0 || row.activeDays > 0)
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 10);

  return activity.length ? activity : null;
};

const buildMilestones = async ({ from, to, projectIds, projectNameMap }) => {
  if (!projectIds.length) return null;

  const rows = await Task.find({
    task_type: 'milestone',
    project_id: { $in: projectIds },
    due_date: { $gte: from, $lte: to }
  })
    .select('title project_id due_date status actual_end')
    .sort({ due_date: 1 })
    .lean();

  if (!rows.length) return null;

  return rows.map((row) => {
    const dueDate = row.due_date ? new Date(row.due_date) : null;
    const actualEnd = row.actual_end ? new Date(row.actual_end) : null;

    let milestoneStatus = 'pending';
    if (row.status === 'done' && actualEnd && dueDate) {
      milestoneStatus = actualEnd <= dueDate ? 'hit' : 'missed';
    } else if (row.status === 'done') {
      milestoneStatus = 'hit';
    } else if (dueDate && dueDate < new Date()) {
      milestoneStatus = 'missed';
    }

    return {
      name: row.title,
      project: projectNameMap.get(String(row.project_id)) || 'Unknown Project',
      dueDate: row.due_date,
      status: milestoneStatus
    };
  });
};

const buildOverdueTasks = async ({ projectIds, projectNameMap }) => {
  if (!projectIds.length) return null;

  const now = new Date();
  const rows = await Task.find({
    project_id: { $in: projectIds },
    due_date: { $lt: now },
    status: { $ne: 'done' },
    task_type: { $ne: 'milestone' }
  })
    .select('title project_id assigned_to due_date')
    .sort({ due_date: 1 })
    .limit(20)
    .populate('assigned_to', 'full_name')
    .lean();

  if (!rows.length) return null;

  const transformed = rows.map((row) => {
    const dueDate = new Date(row.due_date);
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const assignee = Array.isArray(row.assigned_to) && row.assigned_to.length
      ? row.assigned_to.map((user) => user?.full_name).filter(Boolean).join(', ')
      : 'Unassigned';

    return {
      name: row.title,
      project: projectNameMap.get(String(row.project_id)) || 'Unknown Project',
      assignee,
      daysOverdue
    };
  });

  transformed.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return transformed;
};

const buildProjectStats = async ({ from, to, projects }) => {
  if (!projects.length) return null;

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const completedInRange = projects.filter((p) => p.status === 'completed' && p.updated_at && p.updated_at >= from && p.updated_at <= to).length;
  const startedInRange = projects.filter((p) => p.start_date && p.start_date >= from && p.start_date <= to).length;

  const now = new Date();
  const atRiskCount = projects.filter((p) => p.due_date && p.status !== 'completed' && new Date(p.due_date) < now).length;

  if (activeCount === 0 && completedInRange === 0 && startedInRange === 0 && atRiskCount === 0) return null;

  return {
    totalActiveProjects: activeCount,
    projectsCompletedInRange: completedInRange,
    projectsAtRisk: atRiskCount,
    newProjectsStartedInRange: startedInRange
  };
};

export const generateReportData = async (reportAutomationDoc) => {
  const tenantId = asObjectId(reportAutomationDoc?.tenantId);
  if (!tenantId) {
    throw new Error('Invalid tenant context for report automation');
  }

  const reportConfig = reportAutomationDoc?.reportConfig || {};
  const range = await computeDateRange(tenantId, reportConfig);
  const scope = await buildTenantScope(tenantId, reportConfig.projectFilter || []);

  const [projectStats, taskMetrics, teamActivity, milestones, overdueTasks] = await Promise.all([
    reportConfig.includeProjectStats ? buildProjectStats({ from: range.from, to: range.to, projects: scope.projects }) : Promise.resolve(null),
    reportConfig.includeTaskMetrics ? buildTaskMetrics({ from: range.from, to: range.to, projectIds: scope.projectIds, projectNameMap: scope.projectNameMap, groupBy: reportConfig.groupBy || 'project' }) : Promise.resolve(null),
    reportConfig.includeTeamActivity ? buildTeamActivity({ from: range.from, to: range.to, tenantUserIds: scope.tenantUserIds, userNameMap: scope.userNameMap, projectIds: scope.projectIds }) : Promise.resolve(null),
    reportConfig.includeMilestones ? buildMilestones({ from: range.from, to: range.to, projectIds: scope.projectIds, projectNameMap: scope.projectNameMap }) : Promise.resolve(null),
    reportConfig.includeOverdueTasks ? buildOverdueTasks({ projectIds: scope.projectIds, projectNameMap: scope.projectNameMap }) : Promise.resolve(null)
  ]);

  return {
    generatedAt: new Date(),
    dateRange: {
      from: range.from,
      to: range.to,
      label: range.label
    },
    projectStats: projectStats || null,
    taskMetrics: taskMetrics || null,
    teamActivity: teamActivity || null,
    milestones: milestones || null,
    overdueTasks: overdueTasks || null,
    meta: {
      tenantName: reportAutomationDoc?.tenantName || 'AetherTrack Workspace',
      reportType: reportAutomationDoc?.reportType || 'custom',
      groupBy: reportConfig.groupBy || 'project'
    }
  };
};
