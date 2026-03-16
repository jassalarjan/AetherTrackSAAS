import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import api from '@/shared/services/axios';
import useRealtimeSync from '@/shared/hooks/useRealtimeSync';
import { usePageShortcuts } from '@/shared/hooks/usePageShortcuts';
import ShortcutsOverlay from '@/features/tasks/components/ShortcutsOverlay';
import { PageLoader } from '@/shared/components/ui/Spinner';
import { Filter, Calendar, AlertTriangle, TrendingUp, BarChart3, Target, User, Users, Clock, Download, FileSpreadsheet, FileText, X, ChevronDown } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { generateExcelReport } from '@/features/analytics/services/reportGenerator';
import { generateComprehensivePDFReport } from '@/features/analytics/services/comprehensiveReportGenerator';

const Analytics = () => {
  const { user } = useAuth();
  const { theme, effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
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
      color: getStatusChartColor(status === 'active' ? 'in_progress' : status === 'completed' ? 'done' : status === 'on_hold' ? 'review' : 'todo'),
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
      { range: '0-25%',   count: 0, color: getPriorityColor('urgent') },
      { range: '25-50%',  count: 0, color: getPriorityColor('medium') },
      { range: '50-75%',  count: 0, color: getPriorityColor('high')   },
      { range: '75-100%', count: 0, color: getPriorityColor('low')    },
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
    // Theme-aware resolved colors matching design tokens
    const colors = isDark ? {
      todo:        '#8A7A6A',
      in_progress: '#D4824A',
      review:      '#D4A843',
      done:        '#4CAF78',
      archived:    '#D45858',
    } : {
      todo:        '#9A8A7A',
      in_progress: '#C4713A',
      review:      '#CA9020',
      done:        '#2E9E5B',
      archived:    '#C84040',
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = isDark ? {
      low:    '#4AB87A',
      medium: '#D4A843',
      high:   '#D48043',
      urgent: '#D45858',
    } : {
      low:    '#2E9E5B',
      medium: '#CA9020',
      high:   '#C46820',
      urgent: '#C84040',
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
  const chartColors = {
    grid:          isDark ? 'rgba(240,232,220,0.08)' : 'rgba(42,30,22,0.09)',
    axis:          isDark ? '#A89880' : '#7A6A58',
    tooltipBg:     isDark ? '#2A1E14' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(240,232,220,0.12)' : 'rgba(42,30,22,0.12)',
    tooltipText:   isDark ? '#F0E8DC' : '#2A1E16',
    // Semantic palette (matches tokens)
    brand:   isDark ? '#D4905A' : '#C4713A',
    success: isDark ? '#6AA06A' : '#5A8A5A',
    warning: isDark ? '#D4AA4A' : '#C49A3A',
    danger:  isDark ? '#C06060' : '#B05050',
    ai:      isDark ? '#9A8ACC' : '#7A6AAA',
    // Extra chart palette (theme-aware, no harsh primaries)
    chart1: isDark ? '#D4905A' : '#C4713A',
    chart2: isDark ? '#6AA06A' : '#5A8A5A',
    chart3: isDark ? '#9A8ACC' : '#7A6AAA',
    chart4: isDark ? '#D4AA4A' : '#C49A3A',
    chart5: isDark ? '#C06060' : '#B05050',
    chart6: isDark ? '#5AACBF' : '#4A8FA0',
    chart7: isDark ? '#A07ABF' : '#8A6AAA',
    chart8: isDark ? '#8AB05A' : '#7A9A4A',
  };
  const tooltipStyle = {
    backgroundColor: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: '10px',
    color: chartColors.tooltipText,
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    fontSize: '12px',
    fontFamily: 'var(--font-body)',
    padding: '8px 12px',
  };

  // Chart team palette generator (theme-aware)
  const teamColor = (index) => {
    const palette = [
      chartColors.chart1, chartColors.chart2, chartColors.chart3,
      chartColors.chart4, chartColors.chart5, chartColors.chart6,
      chartColors.chart7, chartColors.chart8,
    ];
    return palette[index % palette.length];
  };

  if (loading) return <PageLoader variant="bars" label="Loading analytics…" />;

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
                  className="aether-btn aether-btn-success flex items-center gap-2 text-sm font-semibold"
                  title="Export comprehensive Excel report"
                >
                  <FileSpreadsheet size={16} />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowReportOptions(!showReportOptions)}
                    className="aether-btn aether-btn-danger flex items-center gap-2 text-sm font-semibold"
                    title="Export PDF report"
                  >
                    <FileText size={16} />
                    <span className="hidden sm:inline">PDF</span>
                    <ChevronDown size={14} className={`hidden sm:block transition-transform duration-200 ${showReportOptions ? 'rotate-180' : ''}`} />
                  </button>
                  {showReportOptions && (
                    <div className="aether-dropdown w-56 scale-in">
                      <div className="aether-dropdown-header">Report Period</div>
                      <button onClick={() => { setReportPeriod('daily'); handleExportPDF(); }} className="aether-dropdown-item">Daily Report (Today)</button>
                      <button onClick={() => { setReportPeriod('weekly'); handleExportPDF(); }} className="aether-dropdown-item">Weekly Report (Last 7 Days)</button>
                      <button onClick={() => { setReportPeriod('monthly'); handleExportPDF(); }} className="aether-dropdown-item">Monthly Report (This Month)</button>
                      <div className="aether-dropdown-divider" />
                      <button onClick={() => { setReportPeriod('all'); handleExportPDF(); }} className="aether-dropdown-item">Complete Report (All Time)</button>
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
                className="filter-select w-full"
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
                className="filter-select w-full"
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
                    className="filter-select w-full"
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
                    className="filter-select w-full"
                  >
                    <option value="">All Projects</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>{project.name}</option>
                    ))}
                  </select>

                  <select
                    value={filters.team}
                    onChange={(e) => setFilters({...filters, team: e.target.value})}
                    className="filter-select w-full"
                  >
                    <option value="">All Teams</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>

                  <select
                    value={filters.user}
                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                    className="filter-select w-full"
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
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
                <input
                  type="date"
                  value={filters.customStartDate}
                  onChange={(e) => setFilters({...filters, customStartDate: e.target.value})}
                  className="filter-select w-full"
                />
                <input
                  type="date"
                  value={filters.customEndDate}
                  onChange={(e) => setFilters({...filters, customEndDate: e.target.value})}
                  className="filter-select w-full"
                />
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 animate-stagger">
            {/* Total Tasks */}
            <div className="kpi-metric-card group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-[0.08em] font-bold">Total Tasks</p>
                <div className="kpi-metric-icon bg-[var(--brand-dim)] fade-up" style={{ '--kpi-card-accent': 'linear-gradient(160deg, var(--brand-dim) 0%, transparent 60%)' }}>
                  <BarChart3 size={18} style={{ color: 'var(--brand)' }} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tabular-nums leading-none mb-2" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em' }}>{analyticsData.totalTasks}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="kpi-trend-up">
                  <TrendingUp size={10} />
                  {completionRate}%
                </span>
                <span className="text-xs text-[var(--text-muted)]">completion rate</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completionRate}%`, background: 'var(--brand)' }} />
              </div>
            </div>

            {/* Overdue */}
            <div className="kpi-metric-card group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-[0.08em] font-bold">Overdue</p>
                <div className="kpi-metric-icon bg-[var(--danger-dim)]">
                  <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black tabular-nums leading-none mb-2" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em', color: 'var(--danger)' }}>{analyticsData.overdueTasks}</p>
              <div className="flex items-center gap-2 mb-3">
                {overdueRate > 20 ? (
                  <span className="kpi-trend-down"><AlertTriangle size={10} />{overdueRate}%</span>
                ) : (
                  <span className="kpi-trend-neutral">{overdueRate}%</span>
                )}
                <span className="text-xs text-[var(--text-muted)]">of all tasks</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${overdueRate}%`, background: 'var(--danger)' }} />
              </div>
            </div>

            {/* Completed */}
            <div className="kpi-metric-card group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-[0.08em] font-bold">Completed</p>
                <div className="kpi-metric-icon bg-[var(--success-dim)]">
                  <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black tabular-nums leading-none mb-2" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em', color: 'var(--success)' }}>{analyticsData.completedTasks}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="kpi-trend-up"><TrendingUp size={10} />{completionRate}%</span>
                <span className="text-xs text-[var(--text-muted)]">target rate</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completionRate}%`, background: 'var(--success)' }} />
              </div>
            </div>

            {/* In Progress */}
            <div className="kpi-metric-card group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-[0.08em] font-bold">In Progress</p>
                <div className="kpi-metric-icon bg-[var(--warning-dim)]">
                  <Clock size={18} style={{ color: 'var(--warning)' }} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black tabular-nums leading-none mb-2" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em', color: 'var(--warning)' }}>{analyticsData.inProgressTasks}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="kpi-trend-neutral"><Clock size={10} />{inProgressRate}%</span>
                <span className="text-xs text-[var(--text-muted)]">active work</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${inProgressRate}%`, background: 'var(--warning)' }} />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          {user?.role !== 'member' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Status Distribution */}
              <div className="chart-card">
                <div className="chart-card-title"><span className="chart-card-title-accent" />Task Status Distribution</div>
                <div style={{ width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <RechartsPieChart>
                      <Pie data={analyticsData.statusDistribution} cx="50%" cy="50%" labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius="55%" fill="#8884d8" dataKey="value" strokeWidth={0}>
                        {analyticsData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="chart-card">
                <div className="chart-card-title"><span className="chart-card-title-accent" />Task Priority Distribution</div>
                <div style={{ width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                    <BarChart data={analyticsData.priorityDistribution} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="name" stroke="none" tick={{ fontSize: 11, fill: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                      <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chartColors.grid }} />
                      <Bar dataKey="value" fill={chartColors.brand} radius={[4, 4, 0, 0]}>
                        {analyticsData.priorityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || chartColors.brand} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Charts - Admin/HR Only */}
          {['admin', 'hr'].includes(user?.role) && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Overdue by Priority */}
                <div className="chart-card">
                  <div className="chart-card-title" style={{ color: 'var(--danger)' }}><span className="chart-card-title-accent" style={{ background: 'var(--danger)' }} />Overdue Tasks by Priority</div>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <BarChart data={analyticsData.overdueByPriority} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="name" stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} />
                        <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" fill={chartColors.danger} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Completion Trend */}
                <div className="chart-card">
                  <div className="chart-card-title"><span className="chart-card-title-accent" />Completion Trend (30 Days)</div>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <AreaChart data={analyticsData.completionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="date" stroke="none" tick={{ fontSize: 7, fill: chartColors.axis }} angle={-45} textAnchor="end" height={45} />
                        <YAxis stroke="none" tick={{ fontSize: 9, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <defs>
                          <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.brand} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={chartColors.brand} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={chartColors.success} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="created" stackId="1" stroke={chartColors.brand} fill="url(#createdGrad)" strokeWidth={2} name="Created" />
                        <Area type="monotone" dataKey="completed" stackId="2" stroke={chartColors.success} fill="url(#completedGrad)" strokeWidth={2} name="Completed" />
                        <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* User Performance */}
              <div className="chart-card mb-6 sm:mb-8">
                <div className="chart-card-title"><span className="chart-card-title-accent" />User Performance</div>
                <div style={{ width: '100%', minWidth: '200px' }}>
                  <ResponsiveContainer width="100%" aspect={1.5} minWidth={200}>
                    <BarChart data={analyticsData.assigneePerformance} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="name" stroke="none" tick={{ fontSize: 7, fill: chartColors.axis }} angle={-45} textAnchor="end" height={65} />
                      <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                      <Bar dataKey="total" fill={chartColors.brand} name="Total Tasks" radius={[3, 3, 0, 0]} barSize={10} />
                      <Bar dataKey="completed" fill={chartColors.success} name="Completed" radius={[3, 3, 0, 0]} barSize={10} />
                      <Bar dataKey="overdue" fill={chartColors.danger} name="Overdue" radius={[3, 3, 0, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Team Distribution */}
              <div className="chart-card mb-6 sm:mb-8">
                <div className="chart-card-title"><span className="chart-card-title-accent" />Tasks by Team</div>
                {analyticsData.teamDistribution && analyticsData.teamDistribution.length > 0 ? (
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.5} minWidth={200}>
                      <BarChart data={analyticsData.teamDistribution} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="name" stroke="none" tick={{ fontSize: 7, fill: chartColors.axis }} angle={-45} textAnchor="end" height={75} interval={0} />
                        <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                          {analyticsData.teamDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={teamColor(index)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-8 text-[var(--text-muted)] text-sm">No team data available</p>
                )}
              </div>

              {/* Weekly Progress & Hourly Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="chart-card">
                  <div className="chart-card-title"><span className="chart-card-title-accent" />Weekly Progress (Last 8 Weeks)</div>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <LineChart data={analyticsData.weeklyProgress}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="week" stroke="none" tick={{ fontSize: 9, fill: chartColors.axis }} />
                        <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                        <Line type="monotone" dataKey="completed" stroke={chartColors.success} strokeWidth={2.5} dot={{ r: 3, fill: chartColors.success }} name="Completed" />
                        <Line type="monotone" dataKey="inProgress" stroke={chartColors.brand} strokeWidth={2.5} dot={{ r: 3, fill: chartColors.brand }} name="In Progress" />
                        <Line type="monotone" dataKey="todo" stroke={chartColors.axis} strokeWidth={1.5} dot={{ r: 2, fill: chartColors.axis }} name="To Do" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-card-title"><span className="chart-card-title-accent" />Task Creation by Hour</div>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <BarChart data={analyticsData.hourlyDistribution} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="hour" stroke="none" tick={{ fontSize: 6, fill: chartColors.axis }} angle={-60} textAnchor="end" height={50} />
                        <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill={chartColors.warning} name="Tasks Created" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Task Age Distribution & Priority Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="chart-card">
                  <div className="chart-card-title"><span className="chart-card-title-accent" />Open Task Age Distribution</div>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <BarChart data={analyticsData.taskAgeDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                        <XAxis type="number" stroke="none" tick={{ fontSize: 9, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="range" type="category" stroke="none" tick={{ fontSize: 8, fill: chartColors.axis }} width={60} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill={chartColors.ai} name="Tasks" radius={[0, 3, 3, 0]}>
                          {analyticsData.taskAgeDistribution?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={teamColor(index + 2)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-card-title"><span className="chart-card-title-accent" />Priority Trend (12 Weeks)</div>
                  <div style={{ width: '100%', minWidth: '200px' }}>
                    <ResponsiveContainer width="100%" aspect={1.8} minWidth={200}>
                      <AreaChart data={analyticsData.priorityTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="week" stroke="none" tick={{ fontSize: 8, fill: chartColors.axis }} />
                        <YAxis stroke="none" tick={{ fontSize: 9, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '10px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                        <Area type="monotone" dataKey="urgent" stackId="1" stroke={chartColors.danger} fill={chartColors.danger} name="Urgent" fillOpacity={0.65} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="high" stackId="1" stroke={chartColors.brand} fill={chartColors.brand} name="High" fillOpacity={0.65} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="medium" stackId="1" stroke={chartColors.warning} fill={chartColors.warning} name="Medium" fillOpacity={0.65} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="low" stackId="1" stroke={chartColors.success} fill={chartColors.success} name="Low" fillOpacity={0.65} strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Team Completion Rate */}
              <div className="chart-card mb-6 sm:mb-8">
                <div className="chart-card-title"><span className="chart-card-title-accent" />Team Completion Rate</div>
                <ResponsiveContainer width="100%" height={350} minWidth={200} minHeight={350}>
                  <BarChart data={analyticsData.completionRateByTeam} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="team" stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="none" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false}
                      label={{ value: 'Rate %', angle: -90, position: 'insideLeft', fill: chartColors.axis, fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(value, name) => {
                        if (name === 'rate') return [`${value}%`, 'Completion Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                    <Bar dataKey="rate" fill={chartColors.chart6} name="Completion Rate %" radius={[4, 4, 0, 0]}>
                      {analyticsData.completionRateByTeam?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rate >= 75 ? chartColors.success : entry.rate >= 50 ? chartColors.brand : chartColors.danger} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* PROJECT ANALYTICS SECTION */}
          {analyticsData.totalProjects > 0 && (
            <div className="mb-8">
              <div className="analytics-section-head">
                <BarChart3 size={18} />
                Project Analytics
              </div>

              {/* Project Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="kpi-metric-card group animate-stagger">
                  <p className="kpi-metric-label">Total Projects</p>
                  <p className="kpi-metric-value fade-up">{analyticsData.totalProjects}</p>
                </div>
                <div className="kpi-metric-card group animate-stagger">
                  <p className="kpi-metric-label">Active</p>
                  <p className="kpi-metric-value fade-up" style={{ color: 'var(--brand)' }}>{analyticsData.activeProjects}</p>
                </div>
                <div className="kpi-metric-card group animate-stagger">
                  <p className="kpi-metric-label">Completed</p>
                  <p className="kpi-metric-value fade-up" style={{ color: 'var(--success)' }}>{analyticsData.completedProjects}</p>
                </div>
                <div className="kpi-metric-card group animate-stagger">
                  <p className="kpi-metric-label">On Hold</p>
                  <p className="kpi-metric-value fade-up" style={{ color: 'var(--warning)' }}>{analyticsData.onHoldProjects}</p>
                </div>
              </div>

              {/* Project Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4">
                {analyticsData.projectStatusDistribution.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title"><span className="chart-card-title-accent" />Project Status</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie data={analyticsData.projectStatusDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={85} dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelStyle={{ fontSize: '10px', fontFamily: 'var(--font-body)', fill: chartColors.axis }}>
                          {analyticsData.projectStatusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || teamColor(index)} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsData.projectProgressDistribution.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title"><span className="chart-card-title-accent" />Progress Distribution</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.projectProgressDistribution} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="range" stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} />
                        <YAxis stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                          {analyticsData.projectProgressDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || teamColor(index)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsData.tasksPerProject.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title"><span className="chart-card-title-accent" />Tasks Per Project</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.tasksPerProject} layout="vertical" barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                        <XAxis type="number" stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="none" tick={{ fontSize: 9, fill: chartColors.axis }} width={84} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px', color: chartColors.axis, fontFamily: 'var(--font-body)' }} />
                        <Bar dataKey="completed" stackId="a" fill={chartColors.success} name="Done" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="pending" stackId="a" fill={chartColors.warning} name="Pending" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {analyticsData.projectHealthScore.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-card-title"><span className="chart-card-title-accent" />Project Health Score</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analyticsData.projectHealthScore} layout="vertical" barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke="none" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="none" tick={{ fontSize: 9, fill: chartColors.axis }} width={84} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="score" name="Health Score" radius={[0, 4, 4, 0]}>
                          {analyticsData.projectHealthScore.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score >= 70 ? chartColors.success : entry.score >= 40 ? chartColors.warning : chartColors.danger} />
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
          <div className="data-table-wrap">
            <div className="data-table-header">
              <span>
                {filters.status || filters.priority || filters.team || filters.user || filters.dateRange !== 'all'
                  ? `Filtered Tasks (${filteredTasks.length})`
                  : `All Tasks (${filteredTasks.length})`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th className="hidden lg:table-cell">Assigned</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                        No tasks found matching the selected filters
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.slice(0, 50).map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                      return (
                        <tr key={task._id} className={isOverdue ? 'bg-[var(--danger-dim)]' : ''}>
                          <td>
                            <div className="text-sm font-medium text-[var(--text-primary)]">{task.title}</div>
                            <div className="text-xs text-[var(--text-muted)] truncate max-w-xs">{task.description}</div>
                          </td>
                          <td>
                            <span className={`badge ${
                              task.status === 'done' ? 'badge-success' :
                              task.status === 'in_progress' ? 'badge-brand' :
                              task.status === 'review' ? 'badge-warning' :
                              'badge-neutral'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{
                              backgroundColor: getPriorityColor(task.priority) + '22',
                              color: getPriorityColor(task.priority),
                            }}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell text-sm text-[var(--text-muted)]">
                            {task.assigned_to && task.assigned_to.length > 0
                              ? task.assigned_to.map(u => u.full_name).join(', ')
                              : 'Unassigned'}
                          </td>
                          <td>
                            <div className={`text-sm flex items-center gap-1.5 ${isOverdue ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                              {isOverdue && <AlertTriangle size={14} />}
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
