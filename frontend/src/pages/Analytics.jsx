import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import api from '../api/axios';
import useRealtimeSync from '../hooks/useRealtimeSync';
import { usePageShortcuts } from '../hooks/usePageShortcuts';
import ShortcutsOverlay from '../components/ShortcutsOverlay';
import { PageLoader } from '../components/Spinner';
import { Filter, Calendar, AlertTriangle, TrendingUp, BarChart3, Target, User, Users, Clock, Download, FileSpreadsheet, FileText, X, ChevronDown } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { generateExcelReport } from '../utils/reportGenerator';
import { generateComprehensivePDFReport } from '../utils/comprehensiveReportGenerator';

const Analytics = () => {
  const { user } = useAuth();
  const { theme, effectiveTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    team: '',
    user: '',
    project: '',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
  });
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportPeriod, setReportPeriod] = useState('all');
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // -- Keyboard shortcuts --------------------------------------------------
  const analyticsShortcuts = [
    { key: 'f', label: 'Toggle Filters',  description: 'Show/hide the filter panel',     action: () => setShowFilters((v) => !v) },
    { key: 'e', label: 'Export Options',  description: 'Show/hide report export options', action: () => setShowReportOptions((v) => !v) },
    { key: 'r', label: 'Refresh',         description: 'Reload all analytics data',       action: () => fetchTasks() },
  ];
  const { showHelp, setShowHelp } = usePageShortcuts(analyticsShortcuts);
  const [analyticsData, setAnalyticsData] = useState({
    totalTasks: 0,
    overdueTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    statusDistribution: [],
    priorityDistribution: [],
    teamDistribution: [],
    overdueByPriority: [],
    completionTrend: [],
    assigneePerformance: [],
    weeklyProgress: [],
    hourlyDistribution: [],
    taskAgeDistribution: [],
    completionRateByTeam: [],
    priorityTrend: [],
    statusTransitions: [],
    // Project Analytics
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    projectStatusDistribution: [],
    projectPriorityDistribution: [],
    projectProgressDistribution: [],
    projectBudgetUtilization: [],
    projectTimeline: [],
    projectHealthScore: [],
    tasksPerProject: [],
    projectCompletionRate: [],
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchTasks();
      await fetchProjects();
      await fetchTeams();
      if (['admin', 'hr'].includes(user?.role)) {
        await fetchUsers();
      }
    };
    loadData();
  }, [user?.role]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  useEffect(() => {
    if (filteredTasks.length >= 0) {
      processAnalyticsData(filteredTasks);
    }
  }, [filteredTasks]);

  useRealtimeSync({
    onTaskCreated: () => fetchTasks(),
    onTaskUpdated: () => fetchTasks(),
    onTaskDeleted: () => fetchTasks(),
  });

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.tasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams);
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching teams:', error);
      }
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/my-projects');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching users:', error);
      }
    }
  };

  const processAnalyticsData = useCallback((taskList) => {
    const now = new Date();
    const overdueTasks = taskList.filter(task =>
      task.due_date && new Date(task.due_date) < now && task.status !== 'done'
    );
    const completedTasks = taskList.filter(task => task.status === 'done');
    const inProgressTasks = taskList.filter(task => task.status === 'in_progress');

    const statusCounts = taskList.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      color: getStatusChartColor(status),
    }));

    const priorityCounts = taskList.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const priorityDistribution = Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count,
    }));

    const overdueByPriority = overdueTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const overduePriorityData = Object.entries(overdueByPriority).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count,
    }));

    // 30-day completion trend
    const completionTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTasks = taskList.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate.toDateString() === date.toDateString();
      });
      const dayCompleted = dayTasks.filter(t => t.status === 'done');
      completionTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: dayTasks.length,
        completed: dayCompleted.length,
      });
    }

    // Weekly progress (last 8 weeks)
    const weeklyProgress = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekTasks = taskList.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
      
      const weekCompleted = weekTasks.filter(t => t.status === 'done').length;
      const weekInProgress = weekTasks.filter(t => t.status === 'in_progress').length;
      const weekTodo = weekTasks.filter(t => t.status === 'todo').length;
      
      weeklyProgress.push({
        week: `W${i === 0 ? 'Now' : i}`,
        completed: weekCompleted,
        inProgress: weekInProgress,
        todo: weekTodo,
        total: weekTasks.length,
      });
    }

    // Hourly distribution (when tasks are created)
    const hourlyDistribution = Array(24).fill(0).map((_, hour) => ({
      hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
      count: 0,
    }));
    
    taskList.forEach(task => {
      const hour = new Date(task.created_at).getHours();
      hourlyDistribution[hour].count++;
    });

    // Task age distribution (how long tasks remain open)
    const taskAgeDistribution = [
      { range: '0-1 days', count: 0 },
      { range: '1-3 days', count: 0 },
      { range: '3-7 days', count: 0 },
      { range: '7-14 days', count: 0 },
      { range: '14-30 days', count: 0 },
      { range: '30+ days', count: 0 },
    ];
    
    taskList.forEach(task => {
      if (task.status !== 'done') {
        const age = Math.floor((now - new Date(task.created_at)) / (1000 * 60 * 60 * 24));
        if (age <= 1) taskAgeDistribution[0].count++;
        else if (age <= 3) taskAgeDistribution[1].count++;
        else if (age <= 7) taskAgeDistribution[2].count++;
        else if (age <= 14) taskAgeDistribution[3].count++;
        else if (age <= 30) taskAgeDistribution[4].count++;
        else taskAgeDistribution[5].count++;
      }
    });

    // Priority trend over time (last 12 weeks)
    const priorityTrend = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekTasks = taskList.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
      
      priorityTrend.push({
        week: `W${12 - i}`,
        low: weekTasks.filter(t => t.priority === 'low').length,
        medium: weekTasks.filter(t => t.priority === 'medium').length,
        high: weekTasks.filter(t => t.priority === 'high').length,
        urgent: weekTasks.filter(t => t.priority === 'urgent').length,
      });
    }

    const userStats = taskList.reduce((acc, task) => {
      if (task.assigned_to && task.assigned_to.length > 0) {
        task.assigned_to.forEach(user => {
          const userId = user._id;
          const userName = user.full_name;
          if (!acc[userId]) {
            acc[userId] = { name: userName, total: 0, completed: 0, overdue: 0 };
          }
          acc[userId].total++;
          if (task.status === 'done') acc[userId].completed++;
          if (task.due_date && new Date(task.due_date) < now && task.status !== 'done') {
            acc[userId].overdue++;
          }
        });
      }
      return acc;
    }, {});

    const assigneePerformance = Object.values(userStats).map(stat => ({
      name: stat.name,
      total: stat.total,
      completed: stat.completed,
      overdue: stat.overdue,
      completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
    }));

    const teamCounts = taskList.reduce((acc, task) => {
      const teamName = task.team_id?.name || 'Unassigned';
      acc[teamName] = (acc[teamName] || 0) + 1;
      return acc;
    }, {});

    const teamDistribution = Object.entries(teamCounts)
      .map(([team, count]) => ({ name: team, value: count }))
      .sort((a, b) => b.value - a.value);

    // Completion rate by team
    const completionRateByTeam = Object.entries(
      taskList.reduce((acc, task) => {
        const teamName = task.team_id?.name || 'Unassigned';
        if (!acc[teamName]) {
          acc[teamName] = { total: 0, completed: 0 };
        }
        acc[teamName].total++;
        if (task.status === 'done') acc[teamName].completed++;
        return acc;
      }, {})
    ).map(([team, stats]) => ({
      team,
      rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      completed: stats.completed,
      total: stats.total,
    })).sort((a, b) => b.rate - a.rate);

    // Project Analytics
    const activeProjects = projects.filter(p => p.status === 'active');
    const completedProjects = projects.filter(p => p.status === 'completed');
    const onHoldProjects = projects.filter(p => p.status === 'on_hold');

    const projectStatusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {});

    const projectStatusDistribution = Object.entries(projectStatusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      color: status === 'active' ? '#C4713A' : status === 'completed' ? '#22c55e' : status === 'on_hold' ? '#f59e0b' : '#6b7280',
    }));

    const projectPriorityCounts = projects.reduce((acc, project) => {
      acc[project.priority] = (acc[project.priority] || 0) + 1;
      return acc;
    }, {});

    const projectPriorityDistribution = Object.entries(projectPriorityCounts).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count,
      color: getPriorityColor(priority),
    }));

    // Project Progress Distribution
    const projectProgressDistribution = [
      { range: '0-25%', count: 0, color: '#ef4444' },
      { range: '25-50%', count: 0, color: '#f59e0b' },
      { range: '50-75%', count: 0, color: '#C4713A' },
      { range: '75-100%', count: 0, color: '#22c55e' },
    ];

    projects.forEach(project => {
      const progress = project.progress || 0;
      if (progress < 25) projectProgressDistribution[0].count++;
      else if (progress < 50) projectProgressDistribution[1].count++;
      else if (progress < 75) projectProgressDistribution[2].count++;
      else projectProgressDistribution[3].count++;
    });

    // Project Budget Utilization
    const projectBudgetUtilization = projects
      .filter(p => p.budget?.allocated > 0)
      .map(project => ({
        name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        allocated: project.budget?.allocated || 0,
        spent: project.budget?.spent || 0,
        utilization: project.budget?.allocated > 0 ? Math.round((project.budget.spent / project.budget.allocated) * 100) : 0,
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 10);

    // Project Timeline (Start vs Due Date)
    const projectTimeline = projects.map(project => ({
      name: project.name.length > 12 ? project.name.substring(0, 12) + '...' : project.name,
      start: new Date(project.start_date).getTime(),
      due: new Date(project.due_date).getTime(),
      progress: project.progress || 0,
      status: project.status,
    })).slice(0, 8);

    // Project Health Score (based on progress, overdue, priority)
    const projectHealthScore = projects.map(project => {
      const isOverdue = new Date(project.due_date) < now && project.status !== 'completed';
      const progressScore = project.progress || 0;
      const priorityPenalty = project.priority === 'urgent' ? 20 : project.priority === 'high' ? 10 : 0;
      const overduePenalty = isOverdue ? 30 : 0;
      const statusBonus = project.status === 'active' ? 10 : project.status === 'completed' ? 20 : -10;
      
      const healthScore = Math.max(0, Math.min(100, progressScore + statusBonus - priorityPenalty - overduePenalty));
      
      return {
        name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        score: Math.round(healthScore),
        status: project.status,
      };
    }).sort((a, b) => a.score - b.score).slice(0, 10);

    // Tasks Per Project
    const tasksPerProject = projects.map(project => {
      const projectTasks = taskList.filter(task => task.project_id?._id === project._id || task.project_id === project._id);
      const completedTasks = projectTasks.filter(t => t.status === 'done');
      return {
        name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        total: projectTasks.length,
        completed: completedTasks.length,
        pending: projectTasks.length - completedTasks.length,
      };
    }).filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

    // Project Completion Rate
    const projectCompletionRate = projects.map(project => {
      const projectTasks = taskList.filter(task => task.project_id?._id === project._id || task.project_id === project._id);
      const completedTasks = projectTasks.filter(t => t.status === 'done');
      return {
        name: project.name.length > 12 ? project.name.substring(0, 12) + '...' : project.name,
        rate: projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0,
        completed: completedTasks.length,
        total: projectTasks.length,
      };
    }).filter(p => p.total > 0).sort((a, b) => b.rate - a.rate).slice(0, 8);

    setAnalyticsData({
      totalTasks: taskList.length,
      overdueTasks: overdueTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      statusDistribution,
      priorityDistribution,
      teamDistribution,
      overdueByPriority: overduePriorityData,
      completionTrend,
      assigneePerformance,
      weeklyProgress,
      hourlyDistribution,
      taskAgeDistribution,
      completionRateByTeam,
      priorityTrend,
    });
  }, []);

  const applyFilters = () => {
    let filtered = [...tasks];
    if (user?.role === 'member') {
      filtered = filtered.filter(task => {
        const isAssignedToUser = task.assigned_to && task.assigned_to.some(assignedUser => 
          assignedUser._id === user.id || assignedUser === user.id
        );
        const belongsToUserTeam = user.team_id && task.team_id && 
          (task.team_id._id === user.team_id || task.team_id === user.team_id);
        return isAssignedToUser && belongsToUserTeam;
      });
    }
    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    if (filters.team) {
      filtered = filtered.filter(task => task.team_id?._id === filters.team);
    }
    if (filters.project) {
      filtered = filtered.filter(task => task.project_id?._id === filters.project || task.project_id === filters.project);
    }
    if (filters.user) {
      if (filters.user === 'unassigned') {
        filtered = filtered.filter(task => !task.assigned_to || task.assigned_to.length === 0);
      } else {
        filtered = filtered.filter(task => task.assigned_to && task.assigned_to.some(u => u._id === filters.user));
      }
    }
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            startDate = new Date(filters.customStartDate);
            const endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(task => {
              const taskDate = new Date(task.created_at);
              return taskDate >= startDate && taskDate <= endDate;
            });
          }
          break;
      }
      if (startDate && filters.dateRange !== 'custom') {
        filtered = filtered.filter(task => new Date(task.created_at) >= startDate);
      }
    }
    setFilteredTasks(filtered);
  };

  const getStatusChartColor = (status) => {
    const colors = {
      todo: '#6b7280',
      in_progress: '#C4713A',
      review: '#eab308',
      done: '#22c55e',
      archived: '#ef4444',
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#ef4444',
    };
    return colors[priority] || colors.medium;
  };

  const handleExportExcel = () => {
    try {
      generateExcelReport(filteredTasks, analyticsData, filters, projects);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Error generating Excel report. Please try again.');
    }
  };

  const handleExportPDF = () => {
    try {
      generateComprehensivePDFReport(filteredTasks, analyticsData, filters, user, reportPeriod, projects);
      setShowReportOptions(false);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  // ── Derived metrics ───────────────────────────────────────────────────────
  const completionRate = analyticsData.totalTasks > 0
    ? Math.round((analyticsData.completedTasks / analyticsData.totalTasks) * 100)
    : 0;
  const overdueRate = analyticsData.totalTasks > 0
    ? Math.round((analyticsData.overdueTasks / analyticsData.totalTasks) * 100)
    : 0;
  const inProgressRate = analyticsData.totalTasks > 0
    ? Math.round((analyticsData.inProgressTasks / analyticsData.totalTasks) * 100)
    : 0;

  // ── Theme-aware chart colors (SVG doesn't support CSS vars, so we compute) ──
  const isDark = effectiveTheme === 'dark';
  const chartColors = {
    grid:          isDark ? 'rgba(240,232,220,0.08)' : 'rgba(42,30,22,0.09)',
    axis:          isDark ? '#A89880' : '#7A6A58',
    tooltipBg:     isDark ? '#2A1E14' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(240,232,220,0.12)' : 'rgba(42,30,22,0.12)',
    tooltipText:   isDark ? '#F0E8DC' : '#2A1E16',
  };
  const tooltipStyle = {
    backgroundColor: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: '8px',
    color: chartColors.tooltipText,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    fontSize: '12px',
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent" style={{ borderBottomColor: 'var(--brand)' }} />
      </div>
    );
  }

  return (
    <>
    <ResponsivePageLayout title="Analytics & Reports" icon={BarChart3} noPadding>
        {/* Header Section */}
        <header className="border-b border-[var(--border-soft)] bg-[var(--bg-base)] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="min-w-0">
                <h2 className="text-[var(--text-primary)] text-base sm:text-lg md:text-xl font-bold leading-tight truncate">Analytics & Reports</h2>
                <p className="text-[var(--text-muted)] text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-2">
                  {user?.role === 'member' 
                    ? 'View your personal task statistics' 
                    : user?.role === 'team_lead'
                    ? 'Overview of your team performance'
                    : 'Track team performance, task velocity, and operational metrics'}
                </p>
              </div>
            </div>
            {['admin', 'hr'].includes(user?.role) && (
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center rounded h-9 px-3 sm:px-4 bg-green-600 text-white gap-2 text-sm font-bold hover:bg-green-700 transition-colors"
                  title="Export comprehensive Excel report"
                >
                  <FileSpreadsheet size={18} />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowReportOptions(!showReportOptions)}
                    className="flex items-center justify-center rounded h-9 px-3 sm:px-4 bg-red-600 text-white gap-2 text-sm font-bold hover:bg-red-700 transition-colors"
                    title="Export PDF report"
                  >
                    <FileText size={18} />
                    <span className="hidden sm:inline">PDF</span>
                    <ChevronDown size={16} className="hidden sm:block" />
                  </button>
                  {showReportOptions && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-soft)] shadow-[var(--shadow-lg)] z-10">
                      <div className="py-1">
                        <div className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Report Period</div>
                        <button
                          onClick={() => { setReportPeriod('daily'); handleExportPDF(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          Daily Report (Today)
                        </button>
                        <button
                          onClick={() => { setReportPeriod('weekly'); handleExportPDF(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          Weekly Report (Last 7 Days)
                        </button>
                        <button
                          onClick={() => { setReportPeriod('monthly'); handleExportPDF(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          Monthly Report (This Month)
                        </button>
                        <button
                          onClick={() => { setReportPeriod('all'); handleExportPDF(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          Complete Report (All Time)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters Row */}
          <div className="px-3 sm:px-6 pb-3 sm:pb-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 hover:bg-[var(--bg-surface)] px-2 py-1 rounded transition-colors lg:pointer-events-none"
              >
                <Filter size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs sm:text-sm text-[var(--text-primary)] font-medium">Filters</span>
                <ChevronDown 
                  size={16} 
                  className={`lg:hidden transition-transform ${showFilters ? 'rotate-180' : ''} text-[var(--text-muted)]`}
                />
              </button>
              {showFilters && (
                <button
                  onClick={() => setFilters({ status: '', priority: '', team: '', user: '', project: '', dateRange: 'all', customStartDate: '', customEndDate: '' })}
                  className="text-[10px] sm:text-xs text-[var(--brand)] hover:text-[var(--brand-light)] font-medium transition-colors"
                >
                  Reset All
                </button>
              )}
            </div>
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 lg:max-h-[500px] lg:opacity-100'}`}>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-colors"
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-colors"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              {user?.role !== 'member' && (
                <>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                    className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-colors"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom</option>
                  </select>

                  <select
                    value={filters.project}
                    onChange={(e) => setFilters({...filters, project: e.target.value})}
                    className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-colors"
                  >
                    <option value="">All Projects</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>{project.name}</option>
                    ))}
                  </select>

                  <select
                    value={filters.team}
                    onChange={(e) => setFilters({...filters, team: e.target.value})}
                    className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-colors"
                  >
                    <option value="">All Teams</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>

                  <select
                    value={filters.user}
                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                    className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-colors"
                  >
                    <option value="">All Users</option>
                    <option value="unassigned">Unassigned</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.full_name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {filters.dateRange === 'custom' && showFilters && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3 lg:block lg:grid">
                <input
                  type="date"
                  value={filters.customStartDate}
                  onChange={(e) => setFilters({...filters, customStartDate: e.target.value})}
                  className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                />
                <input
                  type="date"
                  value={filters.customEndDate}
                  onChange={(e) => setFilters({...filters, customEndDate: e.target.value})}
                  className="h-9 px-2 sm:px-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md text-xs sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                />
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Total Tasks */}
            <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 sm:p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Total Tasks</p>
                  <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1 tabular-nums leading-none">{analyticsData.totalTasks}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <TrendingUp size={11} className="text-[var(--success)] flex-shrink-0" />
                    <span className="text-[var(--success)] font-semibold">{completionRate}%</span>&nbsp;completion
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[var(--brand-dim)] grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 size={17} className="text-[var(--brand)]" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-700" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {/* Overdue */}
            <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 sm:p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Overdue</p>
                  <p className="text-2xl sm:text-3xl font-black text-[var(--danger)] mt-1 tabular-nums leading-none">{analyticsData.overdueTasks}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <AlertTriangle size={11} className="text-[var(--danger)] flex-shrink-0" />
                    <span className="text-[var(--danger)] font-semibold">{overdueRate}%</span>&nbsp;of all tasks
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[var(--danger-dim)] grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <AlertTriangle size={17} className="text-[var(--danger)]" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--danger)] transition-all duration-700" style={{ width: `${overdueRate}%` }} />
              </div>
            </div>

            {/* Completed */}
            <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 sm:p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Completed</p>
                  <p className="text-2xl sm:text-3xl font-black text-[var(--success)] mt-1 tabular-nums leading-none">{analyticsData.completedTasks}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <TrendingUp size={11} className="text-[var(--success)] flex-shrink-0" />
                    <span className="text-[var(--success)] font-semibold">{completionRate}%</span>&nbsp;rate
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[var(--success-dim)] grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <TrendingUp size={17} className="text-[var(--success)]" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--success)] transition-all duration-700" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 sm:p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-muted)] text-[10px] sm:text-xs uppercase tracking-wider font-semibold">In Progress</p>
                  <p className="text-2xl sm:text-3xl font-black text-[var(--warning)] mt-1 tabular-nums leading-none">{analyticsData.inProgressTasks}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <Clock size={11} className="text-[var(--warning)] flex-shrink-0" />
                    <span className="text-[var(--warning)] font-semibold">{inProgressRate}%</span>&nbsp;active
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[var(--warning-dim)] grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <Clock size={17} className="text-[var(--warning)]" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--warning)] transition-all duration-700" style={{ width: `${inProgressRate}%` }} />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          {user?.role !== 'member' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Status Distribution */}
              <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Task Status Distribution</h3>
                <div style={{ width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => window.innerWidth < 640 ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius="55%"
                        fill="#8884d8"
                        dataKey="value"
                      >
                      {analyticsData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Task Priority Distribution</h3>
                <div style={{ width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <BarChart data={analyticsData.priorityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                    <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="var(--brand)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Charts - Admin/HR Only */}
          {['admin', 'hr'].includes(user?.role) && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Overdue by Priority */}
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--danger)] uppercase tracking-wider mb-3 sm:mb-4">Overdue Tasks by Priority</h3>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <BarChart data={analyticsData.overdueByPriority}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                      <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="var(--danger)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>

                {/* Completion Trend */}
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Completion Trend (30 Days)</h3>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <AreaChart data={analyticsData.completionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="date" stroke={chartColors.axis} tick={{ fontSize: 7, fill: chartColors.axis }} angle={-60} textAnchor="end" height={50} />
                        <YAxis stroke={chartColors.axis} tick={{ fontSize: 9, fill: chartColors.axis }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <defs>
                        <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="created" stackId="1" stroke="var(--brand)" fill="url(#createdGrad)" name="Created" />
                      <Area type="monotone" dataKey="completed" stackId="2" stroke="var(--success)" fill="url(#completedGrad)" name="Completed" />
                      <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* User Performance */}
              <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 mb-4 sm:mb-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">User Performance</h3>
                <div style={{ width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.5} minWidth={200}>
                  <BarChart data={analyticsData.assigneePerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fontSize: 7, fill: chartColors.axis }} angle={-60} textAnchor="end" height={70} />
                    <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                    <Bar dataKey="total" fill="var(--brand)" name="Total Tasks" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="completed" fill="var(--success)" name="Completed" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="overdue" fill="var(--danger)" name="Overdue" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>

              {/* Team Distribution */}
              <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 mb-4 sm:mb-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Tasks by Team</h3>
                {analyticsData.teamDistribution && analyticsData.teamDistribution.length > 0 ? (
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.5} minWidth={200}>
                    <BarChart data={analyticsData.teamDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="name" stroke={chartColors.axis} tick={{ fontSize: 7, fill: chartColors.axis }} angle={-60} textAnchor="end" height={80} interval={0} />
                      <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Tasks" radius={[2, 2, 0, 0]}>
                        {analyticsData.teamDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-8 text-[var(--text-muted)] text-sm">No team data available</p>
                )}
              </div>

              {/* NEW CHARTS START HERE */}
              
              {/* Weekly Progress Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Weekly Progress (Last 8 Weeks)</h3>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <LineChart data={analyticsData.weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="week" stroke={chartColors.axis} tick={{ fontSize: 9, fill: chartColors.axis }} />
                      <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                      <Line type="monotone" dataKey="completed" stroke="var(--success)" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                      <Line type="monotone" dataKey="inProgress" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3 }} name="In Progress" />
                      <Line type="monotone" dataKey="todo" stroke={chartColors.axis} strokeWidth={2} dot={{ r: 3 }} name="To Do" />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Task Creation by Hour</h3>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <BarChart data={analyticsData.hourlyDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="hour" stroke={chartColors.axis} tick={{ fontSize: 6, fill: chartColors.axis }} angle={-60} textAnchor="end" height={55} />
                      <YAxis stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="var(--warning)" name="Tasks Created" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Task Age Distribution & Priority Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Open Task Age Distribution</h3>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <BarChart data={analyticsData.taskAgeDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" stroke={chartColors.axis} tick={{ fontSize: 9, fill: chartColors.axis }} />
                      <YAxis dataKey="range" type="category" stroke={chartColors.axis} tick={{ fontSize: 8, fill: chartColors.axis }} width={60} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#8b5cf6" name="Tasks" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-3 sm:p-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 sm:mb-4">Priority Trend (12 Weeks)</h3>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <AreaChart data={analyticsData.priorityTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="week" stroke={chartColors.axis} tick={{ fontSize: 8, fill: chartColors.axis }} />
                      <YAxis stroke={chartColors.axis} tick={{ fontSize: 9, fill: chartColors.axis }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '9px', color: chartColors.axis }} />
                      <Area type="monotone" dataKey="urgent" stackId="1" stroke="#ef4444" fill="#ef4444" name="Urgent" fillOpacity={0.7} />
                      <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="#f97316" name="High" fillOpacity={0.7} />
                      <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Medium" fillOpacity={0.7} />
                      <Area type="monotone" dataKey="low" stackId="1" stroke="#10b981" fill="#10b981" name="Low" fillOpacity={0.7} />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Team Completion Rate */}
              <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 sm:p-6 mb-6 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Team Completion Rate</h3>
                <ResponsiveContainer width="100%" height={350} minWidth={200} minHeight={350}>
                  <BarChart data={analyticsData.completionRateByTeam}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="team" stroke={chartColors.axis} tick={{ fontSize: 10, fill: chartColors.axis }} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke={chartColors.axis} tick={{ fontSize: 11, fill: chartColors.axis }} label={{ value: 'Completion Rate %', angle: -90, position: 'insideLeft', fill: chartColors.axis }} />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => {
                        if (name === 'rate') return [`${value}%`, 'Completion Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                    <Bar dataKey="rate" fill="#06b6d4" name="Completion Rate %" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* PROJECT ANALYTICS SECTION */}
          {analyticsData.totalProjects > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-[var(--brand)]" />
                Project Analytics
              </h2>
              
              {/* Project Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <p className="text-2xl font-black text-[var(--text-primary)]">
                    {analyticsData.totalProjects}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Total Projects</p>
                </div>
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <p className="text-2xl font-black text-[var(--brand)]">
                    {analyticsData.activeProjects}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Active</p>
                </div>
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <p className="text-2xl font-black text-[var(--success)]">
                    {analyticsData.completedProjects}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Completed</p>
                </div>
                <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                  <p className="text-2xl font-black text-[var(--warning)]">
                    {analyticsData.onHoldProjects}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">On Hold</p>
                </div>
              </div>

              {/* Project Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {analyticsData.projectStatusDistribution.length > 0 && (
                  <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Project Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie data={analyticsData.projectStatusDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {analyticsData.projectStatusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsData.projectProgressDistribution.length > 0 && (
                  <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Progress Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.projectProgressDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="range" stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                        <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="Projects" radius={[3, 3, 0, 0]}>
                          {analyticsData.projectProgressDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsData.tasksPerProject.length > 0 && (
                  <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Tasks Per Project</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.tasksPerProject} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                        <YAxis type="category" dataKey="name" stroke={chartColors.axis} tick={{ fill: chartColors.axis }} width={80} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis }} />
                        <Bar dataKey="completed" stackId="a" fill="var(--success)" name="Done" />
                        <Bar dataKey="pending" stackId="a" fill="var(--warning)" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsData.projectHealthScore.length > 0 && (
                  <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-200">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Project Health Score</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.projectHealthScore} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis type="number" domain={[0, 100]} stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                        <YAxis type="category" dataKey="name" stroke={chartColors.axis} tick={{ fill: chartColors.axis }} width={80} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="score" name="Health" radius={[0, 3, 3, 0]}>
                          {analyticsData.projectHealthScore.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score >= 70 ? 'var(--success)' : entry.score >= 40 ? 'var(--warning)' : 'var(--danger)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tasks Table */}
          <div className="bg-[var(--bg-raised)] rounded-xl border border-[var(--border-soft)] overflow-hidden shadow-[var(--shadow-xs)]">
            <div className="p-4 border-b border-[var(--border-soft)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {filters.status || filters.priority || filters.team || filters.user || filters.dateRange !== 'all' 
                  ? `Filtered Tasks (${filteredTasks.length})` 
                  : `All Tasks (${filteredTasks.length})`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-base)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Task</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider hidden lg:table-cell">Assigned</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hair)]">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-[var(--text-muted)]">
                        No tasks found matching the selected filters
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.slice(0, 50).map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                      return (
                        <tr key={task._id} className={`${isOverdue ? 'bg-[var(--danger-dim)]' : ''} hover:bg-[var(--bg-surface)] transition-colors duration-100`}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{task.title}</div>
                            <div className="text-xs text-[var(--text-muted)] truncate max-w-xs">{task.description}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${
                              task.status === 'done' ? 'bg-[var(--success-dim)] text-[var(--success)]' :
                              task.status === 'in_progress' ? 'bg-[var(--brand-dim)] text-[var(--brand)]' :
                              task.status === 'review' ? 'bg-[var(--warning-dim)] text-[var(--warning)]' :
                              'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md" style={{ 
                              backgroundColor: getPriorityColor(task.priority) + '20', 
                              color: getPriorityColor(task.priority) 
                            }}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-muted)] hidden lg:table-cell">
                            {task.assigned_to && task.assigned_to.length > 0
                              ? task.assigned_to.map(u => u.full_name).join(', ')
                              : 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`text-sm flex items-center gap-2 ${isOverdue ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                              {isOverdue && <AlertTriangle size={16} />}
                              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </ResponsivePageLayout>

      {/* Keyboard shortcuts help overlay */}
      <ShortcutsOverlay
        show={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={analyticsShortcuts}
        pageName="Analytics"
      />
    </>
  );
};

export default Analytics;
