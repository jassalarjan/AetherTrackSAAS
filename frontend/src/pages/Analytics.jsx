import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import useRealtimeSync from '../hooks/useRealtimeSync';
import { Filter, Calendar, AlertTriangle, TrendingUp, BarChart3, Target, User, Users, Clock, Download, FileSpreadsheet, FileText, X, ChevronDown } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { generateExcelReport } from '../utils/reportGenerator';
import { generateComprehensivePDFReport } from '../utils/comprehensiveReportGenerator';

const Analytics = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    team: '',
    user: '',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
  });
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportPeriod, setReportPeriod] = useState('all');
  const [showReportOptions, setShowReportOptions] = useState(false);
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
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchTasks();
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
      in_progress: '#136dec',
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
      generateExcelReport(filteredTasks, analyticsData, filters);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Error generating Excel report. Please try again.');
    }
  };

  const handleExportPDF = () => {
    try {
      generateComprehensivePDFReport(filteredTasks, analyticsData, filters, user, reportPeriod);
      setShowReportOptions(false);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={`${theme === 'dark' ? 'bg-[#111418]' : 'bg-gray-50'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-['Inter'] h-screen flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-4 h-12 bg-[#136dec] rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>
          <p className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden ${theme === 'dark' ? 'bg-[#111418]' : 'bg-gray-50'}`}>
      <Sidebar />

      <main className={`flex-1 flex flex-col h-full min-w-0 ${theme === 'dark' ? 'bg-[#111418]' : 'bg-gray-50'}`}>
        {/* Header Section */}
        <header className={`border-b ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} ${theme === 'dark' ? 'bg-[#111418]' : 'bg-gray-50'} shrink-0`}>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-xl font-bold leading-tight`}>Analytics & Reports</h2>
              <p className={`${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} text-xs mt-1`}>
                {user?.role === 'member' 
                  ? 'View your personal task statistics' 
                  : user?.role === 'team_lead'
                  ? 'Overview of your team performance'
                  : 'Track team performance, task velocity, and operational metrics'}
              </p>
            </div>
            {['admin', 'hr'].includes(user?.role) && (
              <div className="flex gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center justify-center rounded h-9 px-4 bg-green-600 text-white gap-2 text-sm font-bold hover:bg-green-700 transition-colors"
                  title="Export comprehensive Excel report"
                >
                  <FileSpreadsheet size={18} />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowReportOptions(!showReportOptions)}
                    className="flex items-center justify-center rounded h-9 px-4 bg-red-600 text-white gap-2 text-sm font-bold hover:bg-red-700 transition-colors"
                    title="Export PDF report"
                  >
                    <FileText size={18} />
                    <span className="hidden sm:inline">PDF</span>
                    <ChevronDown size={16} />
                  </button>
                  {showReportOptions && (
                    <div className={`absolute right-0 mt-2 w-56 rounded ${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} shadow-lg z-10`}>
                      <div className="py-1">
                        <div className={`px-4 py-2 text-[10px] font-bold ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} uppercase tracking-wider`}>Report Period</div>
                        <button
                          onClick={() => { setReportPeriod('daily'); handleExportPDF(); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'hover:bg-[#282f39]' : 'hover:bg-gray-100'} transition-colors`}
                        >
                          Daily Report (Today)
                        </button>
                        <button
                          onClick={() => { setReportPeriod('weekly'); handleExportPDF(); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'hover:bg-[#282f39]' : 'hover:bg-gray-100'} transition-colors`}
                        >
                          Weekly Report (Last 7 Days)
                        </button>
                        <button
                          onClick={() => { setReportPeriod('monthly'); handleExportPDF(); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'hover:bg-[#282f39]' : 'hover:bg-gray-100'} transition-colors`}
                        >
                          Monthly Report (This Month)
                        </button>
                        <button
                          onClick={() => { setReportPeriod('all'); handleExportPDF(); }}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${theme === 'dark' ? 'hover:bg-[#282f39]' : 'hover:bg-gray-100'} transition-colors`}
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
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className={`${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'}`} />
                <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>Filters</span>
              </div>
              <button
                onClick={() => setFilters({ status: '', priority: '', team: '', user: '', dateRange: 'all', customStartDate: '', customEndDate: '' })}
                className="text-xs text-[#136dec] hover:text-blue-400 font-medium"
              >
                Reset All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
              >
                <option value="">All Priorities</option>
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
                    className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  <select
                    value={filters.team}
                    onChange={(e) => setFilters({...filters, team: e.target.value})}
                    className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
                  >
                    <option value="">All Teams</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>

                  <select
                    value={filters.user}
                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                    className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
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

            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <input
                  type="date"
                  value={filters.customStartDate}
                  onChange={(e) => setFilters({...filters, customStartDate: e.target.value})}
                  className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
                />
                <input
                  type="date"
                  value={filters.customEndDate}
                  onChange={(e) => setFilters({...filters, customEndDate: e.target.value})}
                  className={`h-9 px-3 ${theme === 'dark' ? 'bg-[#282f39]' : 'bg-white'} border ${theme === 'dark' ? 'border-[#3e454f]' : 'border-gray-200'} rounded text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} focus:ring-2 focus:ring-[#136dec] focus:border-transparent`}
                />
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} text-xs uppercase tracking-wider font-medium`}>Total Tasks</p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mt-2`}>{analyticsData.totalTasks}</p>
                </div>
                <BarChart3 className="text-[#136dec]" size={40} />
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} text-xs uppercase tracking-wider font-medium`}>Overdue</p>
                  <p className="text-3xl font-bold text-red-500 mt-2">{analyticsData.overdueTasks}</p>
                </div>
                <AlertTriangle className="text-red-500" size={40} />
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} text-xs uppercase tracking-wider font-medium`}>Completed</p>
                  <p className="text-3xl font-bold text-green-500 mt-2">{analyticsData.completedTasks}</p>
                </div>
                <TrendingUp className="text-green-500" size={40} />
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} text-xs uppercase tracking-wider font-medium`}>In Progress</p>
                  <p className="text-3xl font-bold text-yellow-500 mt-2">{analyticsData.inProgressTasks}</p>
                </div>
                <Clock className="text-yellow-500" size={40} />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          {user?.role !== 'member' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Status Distribution */}
              <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-6`}>
                <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider mb-4`}>Task Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1c2027', border: '1px solid #282f39', borderRadius: '0.125rem' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Priority Distribution */}
              <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-6`}>
                <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider mb-4`}>Task Priority Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.priorityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#282f39" />
                    <XAxis dataKey="name" stroke="#9da8b9" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9da8b9" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c2027', border: '1px solid #282f39', borderRadius: '0.125rem' }} />
                    <Bar dataKey="value" fill="#136dec" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Advanced Charts - Admin/HR Only */}
          {['admin', 'hr'].includes(user?.role) && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Overdue by Priority */}
                <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-6`}>
                  <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4">Overdue Tasks by Priority</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.overdueByPriority}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#282f39" />
                      <XAxis dataKey="name" stroke="#9da8b9" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9da8b9" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1c2027', border: '1px solid #282f39', borderRadius: '0.125rem' }} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Completion Trend */}
                <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-6`}>
                  <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider mb-4`}>Completion Trend (30 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.completionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#282f39" />
                      <XAxis dataKey="date" stroke="#9da8b9" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis stroke="#9da8b9" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1c2027', border: '1px solid #282f39', borderRadius: '0.125rem' }} />
                      <Area type="monotone" dataKey="created" stackId="1" stroke="#136dec" fill="#136dec" />
                      <Area type="monotone" dataKey="completed" stackId="2" stroke="#22c55e" fill="#22c55e" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User Performance */}
              <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-6 mb-6`}>
                <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider mb-4`}>User Performance</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analyticsData.assigneePerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#282f39" />
                    <XAxis dataKey="name" stroke="#9da8b9" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#9da8b9" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c2027', border: '1px solid #282f39', borderRadius: '0.125rem' }} />
                    <Bar dataKey="total" fill="#136dec" name="Total Tasks" />
                    <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                    <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Team Distribution */}
              <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} p-6 mb-6`}>
                <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider mb-4`}>Tasks by Team</h3>
                {analyticsData.teamDistribution && analyticsData.teamDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analyticsData.teamDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#282f39" />
                      <XAxis dataKey="name" stroke="#9da8b9" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={120} interval={0} />
                      <YAxis stroke="#9da8b9" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1c2027', border: '1px solid #282f39', borderRadius: '0.125rem' }} />
                      <Bar dataKey="value" fill="#22c55e" name="Tasks">
                        {analyticsData.teamDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={`text-center py-8 ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} text-sm`}>No team data available</p>
                )}
              </div>
            </>
          )}

          {/* Tasks Table */}
          <div className={`${theme === 'dark' ? 'bg-[#1c2027]' : 'bg-white'} rounded border ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'} overflow-hidden`}>
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-[#282f39]' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} uppercase tracking-wider`}>
                {filters.status || filters.priority || filters.team || filters.user || filters.dateRange !== 'all' 
                  ? `Filtered Tasks (${filteredTasks.length})` 
                  : `All Tasks (${filteredTasks.length})`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-[#111418]' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-[10px] font-bold ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} uppercase tracking-wider`}>Task</th>
                    <th className={`px-4 py-3 text-left text-[10px] font-bold ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} uppercase tracking-wider`}>Status</th>
                    <th className={`px-4 py-3 text-left text-[10px] font-bold ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} uppercase tracking-wider`}>Priority</th>
                    <th className={`px-4 py-3 text-left text-[10px] font-bold ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} uppercase tracking-wider hidden lg:table-cell`}>Assigned</th>
                    <th className={`px-4 py-3 text-left text-[10px] font-bold ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} uppercase tracking-wider`}>Due Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-[#282f39]' : 'divide-gray-200'}`}>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={`px-4 py-8 text-center ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'}`}>
                        No tasks found matching the selected filters
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.slice(0, 50).map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                      return (
                        <tr key={task._id} className={`${isOverdue ? 'bg-red-900/10' : ''} ${theme === 'dark' ? 'hover:bg-[#282f39]/50' : 'hover:bg-gray-50'} transition-colors`}>
                          <td className="px-4 py-3">
                            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{task.title}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} truncate max-w-xs`}>{task.description}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                              task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                              task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              task.status === 'review' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded`} style={{ 
                              backgroundColor: getPriorityColor(task.priority) + '20', 
                              color: getPriorityColor(task.priority) 
                            }}>
                              {task.priority}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'} hidden lg:table-cell`}>
                            {task.assigned_to && task.assigned_to.length > 0
                              ? task.assigned_to.map(u => u.full_name).join(', ')
                              : 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`text-sm flex items-center gap-2 ${isOverdue ? 'text-red-400' : `${theme === 'dark' ? 'text-[#9da8b9]' : 'text-gray-600'}`}`}>
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
      </main>
    </div>
  );
};

export default Analytics;
