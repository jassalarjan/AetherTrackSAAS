import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { Plus, Users, CheckSquare, TrendingUp, Clock, FileSpreadsheet, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { generateExcelReport } from '../utils/reportGenerator';
import { generateComprehensivePDFReport } from '../utils/comprehensiveReportGenerator';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentTheme, currentColorScheme } = useTheme();
  const [stats, setStats] = useState({
    totalTasks: 0,
    myTasks: 0,
    inProgress: 0,
    completed: 0,
    overdueTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalTasks: 0,
    overdueTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    statusDistribution: [],
    priorityDistribution: [],
    overdueByPriority: [],
    completionTrend: [],
    assigneePerformance: [],
  });
  const [chartData, setChartData] = useState({
    statusDistribution: [],
    progressOverTime: [],
    priorityDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('all'); // 'daily', 'weekly', 'monthly', 'all'
  const [showReportOptions, setShowReportOptions] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const tasksResponse = await api.get('/tasks');
      const tasks = tasksResponse.data.tasks || [];
      
      setAllTasks(tasks);

      const myTasks = tasks.filter(
        (t) => (t.assigned_to && Array.isArray(t.assigned_to) && t.assigned_to.some(u => u && u._id === user.id)) || (t.created_by && t.created_by._id === user.id)
      );
      const inProgress = tasks.filter((t) => t.status === 'in_progress');
      const completed = tasks.filter((t) => t.status === 'done');
      const overdue = tasks.filter(task =>
        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
      );

      setStats({
        totalTasks: tasks.length,
        myTasks: myTasks.length,
        inProgress: inProgress.length,
        completed: completed.length,
        overdueTasks: overdue.length,
      });

      setOverdueTasks(overdue.slice(0, 5));

      // Prepare chart data
      const statusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count,
        color: getStatusChartColor(status),
      }));

      const priorityCounts = tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {});

      const priorityDistribution = Object.entries(priorityCounts).map(([priority, count]) => ({
        name: priority.toUpperCase(),
        value: count,
      }));

      // Mock progress over time data (last 7 days)
      const progressOverTime = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayTasks = tasks.filter(task => {
          const taskDate = new Date(task.created_at);
          return taskDate.toDateString() === date.toDateString();
        });
        progressOverTime.push({
          date: date.toLocaleDateString(),
          created: dayTasks.length,
          completed: dayTasks.filter(t => t.status === 'done').length,
        });
      }

      setChartData({
        statusDistribution,
        priorityDistribution,
        progressOverTime,
      });

      // Prepare analytics data for reports
      const now = new Date();
      const userStats = tasks.reduce((acc, task) => {
        if (task.assigned_to && task.assigned_to.length > 0) {
          task.assigned_to.forEach(user => {
            const userId = user._id;
            const userName = user.full_name;

            if (!acc[userId]) {
              acc[userId] = {
                name: userName,
                total: 0,
                completed: 0,
                overdue: 0,
              };
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

      setAnalyticsData({
        totalTasks: tasks.length,
        overdueTasks: overdue.length,
        completedTasks: completed.length,
        inProgressTasks: inProgress.length,
        statusDistribution,
        priorityDistribution,
        overdueByPriority: [],
        completionTrend: progressOverTime,
        assigneePerformance,
      });

      setRecentTasks(tasks.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.medium;
  };

  const getStatusChartColor = (status) => {
    const colors = {
      todo: '#6b7280',
      in_progress: '#3b82f6',
      review: '#f59e0b',
      done: '#10b981',
      archived: '#ef4444',
    };
    return colors[status] || colors.todo;
  };

  const handleExportExcel = () => {
    try {
      generateExcelReport(allTasks, analyticsData, {});
    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Error generating Excel report. Please try again.');
    }
  };

  const handleExportPDF = () => {
    try {
      generateComprehensivePDFReport(allTasks, analyticsData, {}, user, reportPeriod);
      setShowReportOptions(false);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentTheme.background} transition-colors`} data-testid="dashboard">
      <div className="flex">
        <Navbar />
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${currentTheme.text} transition-colors`}>Welcome back, {user?.full_name}!</h1>
            <p className={`${currentTheme.textSecondary} mt-2 transition-colors`}>Here's what's happening with your tasks today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${currentTheme.textSecondary} text-sm`}>Total Tasks</p>
                  <p className={`text-3xl font-bold ${currentTheme.text} mt-2`} data-testid="stat-total-tasks">{stats.totalTasks}</p>
                </div>
                <CheckSquare className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${currentTheme.textSecondary} text-sm`}>My Tasks</p>
                  <p className={`text-3xl font-bold ${currentTheme.text} mt-2`} data-testid="stat-my-tasks">{stats.myTasks}</p>
                </div>
                <Users className="w-12 h-12 text-green-500" />
              </div>
            </div>

            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${currentTheme.textSecondary} text-sm`}>In Progress</p>
                  <p className={`text-3xl font-bold ${currentTheme.text} mt-2`} data-testid="stat-in-progress">{stats.inProgress}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-500" />
              </div>
            </div>

            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${currentTheme.textSecondary} text-sm`}>Completed</p>
                  <p className={`text-3xl font-bold ${currentTheme.text} mt-2`} data-testid="stat-completed">{stats.completed}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-500" />
              </div>
            </div>

            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${currentTheme.textSecondary} text-sm`}>Overdue Tasks</p>
                  <p className="text-3xl font-bold text-red-600 mt-2" data-testid="stat-overdue">{stats.overdueTasks}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4">
              <Link
                to="/tasks"
                className="btn btn-primary flex items-center space-x-2"
                data-testid="view-tasks-button"
              >
                <CheckSquare className="w-5 h-5" />
                <span>View All Tasks</span>
              </Link>
              <Link
                to="/tasks?create=true"
                className="btn bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2"
                data-testid="create-task-button"
              >
                <Plus className="w-5 h-5" />
                <span>Create Task</span>
              </Link>
              {['admin', 'hr'].includes(user?.role) && (
                <Link
                  to="/teams"
                  className="btn bg-purple-600 text-white hover:bg-purple-700 flex items-center space-x-2"
                  data-testid="manage-teams-button"
                >
                  <Users className="w-5 h-5" />
                  <span>Manage Teams</span>
                </Link>
              )}
              <button
                onClick={handleExportExcel}
                className="btn bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2 shadow-md transition-all"
                data-testid="export-excel-button"
                title="Export comprehensive Excel report with multiple sheets"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Export Excel</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowReportOptions(!showReportOptions)}
                  className="btn bg-red-600 text-white hover:bg-red-700 flex items-center space-x-2 shadow-md transition-all"
                  data-testid="generate-pdf-button"
                  title="Export PDF report with charts and tables"
                >
                  <FileText className="w-5 h-5" />
                  <span>Export PDF</span>
                  <Calendar className="w-4 h-4" />
                </button>
                
                {showReportOptions && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Report Period</div>
                      <button
                        onClick={() => { setReportPeriod('daily'); handleExportPDF(); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        📅 Daily Report (Today)
                      </button>
                      <button
                        onClick={() => { setReportPeriod('weekly'); handleExportPDF(); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        📊 Weekly Report (Last 7 Days)
                      </button>
                      <button
                        onClick={() => { setReportPeriod('monthly'); handleExportPDF(); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        📈 Monthly Report (This Month)
                      </button>
                      <button
                        onClick={() => { setReportPeriod('all'); handleExportPDF(); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        📑 Complete Report (All Time)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Task Status Distribution */}
            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <h3 className={`text-lg font-semibold mb-4 ${currentTheme.text}`}>Task Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Distribution */}
            <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 transition-colors`}>
              <h3 className={`text-lg font-semibold mb-4 ${currentTheme.text}`}>Task Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.priorityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progress Over Time */}
          <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 mb-8 transition-colors`}>
            <h3 className={`text-lg font-semibold mb-4 ${currentTheme.text}`}>Task Progress Over Time (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.progressOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#8884d8" name="Created" />
                <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Overdue Tasks Section */}
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8 transition-colors">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h2 className="text-xl font-semibold text-red-800 dark:text-red-200">Overdue Tasks ({overdueTasks.length})</h2>
              </div>
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <div key={task._id} className={`${currentTheme.surface} rounded-lg p-4 border border-red-200 dark:border-red-700 transition-colors`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${currentTheme.text}`}>{task.title}</h3>
                        <p className={`text-sm ${currentTheme.textSecondary} mt-1`}>{task.description}</p>
                        <div className="flex items-center space-x-2 mt-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.assigned_to && (
                            <span className="text-xs text-gray-500">Assigned to: {task.assigned_to.full_name}</span>
                          )}
                          <span className="text-xs text-red-600 font-medium">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tasks */}
          <div className={`${currentTheme.surface} rounded-lg shadow-md transition-colors`}>
            <div className={`p-6 border-b ${currentTheme.border}`}>
              <h2 className={`text-xl font-semibold ${currentTheme.text}`}>Recent Tasks</h2>
            </div>
            <div className={`divide-y ${currentTheme.border}`}>
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                  return (
                    <div key={task._id} className={`p-6 ${currentTheme.hover} transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400' : ''}`} data-testid="task-item">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-semibold ${currentTheme.text}`}>{task.title}</h3>
                            {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
                          <p className={`text-sm ${currentTheme.textSecondary} mt-1`}>{task.description}</p>
                          <div className="flex items-center space-x-2 mt-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.assigned_to && task.assigned_to.length > 0 && (
                              <span className={`text-xs ${currentTheme.textMuted}`}>Assigned to: {task.assigned_to.map(u => u.full_name).join(', ')}</span>
                            )}
                            {task.due_date && (
                              <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : currentTheme.textMuted}`}>
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={`p-8 text-center ${currentTheme.textMuted}`}>
                  <p>No tasks yet. Create your first task to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;