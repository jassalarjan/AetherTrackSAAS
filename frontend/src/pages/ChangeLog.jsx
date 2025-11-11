import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { 
  Activity, 
  Download, 
  Filter, 
  Search, 
  RefreshCw, 
  Trash2, 
  Calendar,
  User,
  Target,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const ChangeLog = () => {
  const { currentTheme, currentColorScheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    event_type: '',
    target_type: '',
    search: '',
    start_date: '',
    end_date: '',
    limit: 50
  });
  const [showFilters, setShowFilters] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    if (user) {
      fetchLogs();
      fetchStats();
      fetchEventTypes();
    }
  }, [page, filters, user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        ...filters
      });

      const response = await api.get(`/changelog?${params}`);
      setLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching change logs:', error);
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
        navigate('/dashboard');
      } else {
        setError('Failed to fetch change logs. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await api.get(`/changelog/stats?${params}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't show error for stats, just log it
    }
  };

  const fetchEventTypes = async () => {
    try {
      const response = await api.get('/changelog/event-types');
      setEventTypes(response.data);
    } catch (error) {
      console.error('Error fetching event types:', error);
      // Don't show error for event types, just log it
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams(filters);
      const response = await api.get(`/changelog/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `changelog-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const handleClearOldLogs = async () => {
    if (!confirm('Are you sure you want to delete logs older than 90 days?')) {
      return;
    }

    try {
      const response = await api.delete('/changelog/clear?days=90');
      alert(response.data.message);
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Failed to clear logs');
    }
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes('login') || eventType.includes('logout')) return '🔐';
    if (eventType.includes('task')) return '✅';
    if (eventType.includes('user')) return '👤';
    if (eventType.includes('team')) return '👥';
    if (eventType.includes('report')) return '📊';
    if (eventType.includes('automation')) return '🤖';
    if (eventType.includes('notification')) return '🔔';
    if (eventType.includes('comment')) return '💬';
    if (eventType.includes('bulk')) return '📦';
    return '⚙️';
  };

  const getEventColor = (eventType) => {
    if (eventType.includes('login') || eventType.includes('logout')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (eventType.includes('created')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (eventType.includes('updated')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    if (eventType.includes('deleted')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (eventType.includes('automation')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    if (eventType.includes('report')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen">
      <Navbar />
      <div className={`flex-1 overflow-auto ${currentTheme.background}`}>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Activity className={`w-8 h-8 ${currentColorScheme.primaryText}`} />
                <h1 className={`text-3xl font-bold ${currentTheme.text}`}>Change Log</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchLogs}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentTheme.hover} ${currentTheme.text} transition-colors`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentColorScheme.primary} text-white transition-colors hover:opacity-90 disabled:opacity-50`}
                >
                  <Download className="w-4 h-4" />
                  <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentTheme.hover} ${currentTheme.text} transition-colors`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
              </div>
            </div>
            <p className={`${currentTheme.textSecondary}`}>
              Track all system events, user activities, and changes across the platform
            </p>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className={`${currentTheme.surface} rounded-xl p-6 border ${currentTheme.border} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary} mb-1`}>Total Events</p>
                    <p className={`text-3xl font-bold ${currentTheme.text}`}>{stats.total.toLocaleString()}</p>
                  </div>
                  <TrendingUp className={`w-10 h-10 ${currentColorScheme.primaryText} opacity-50`} />
                </div>
              </div>
              
              <div className={`${currentTheme.surface} rounded-xl p-6 border ${currentTheme.border} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary} mb-1`}>Event Types</p>
                    <p className={`text-3xl font-bold ${currentTheme.text}`}>{stats.by_event_type.length}</p>
                  </div>
                  <Target className={`w-10 h-10 ${currentColorScheme.primaryText} opacity-50`} />
                </div>
              </div>
              
              <div className={`${currentTheme.surface} rounded-xl p-6 border ${currentTheme.border} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary} mb-1`}>Active Users</p>
                    <p className={`text-3xl font-bold ${currentTheme.text}`}>{stats.top_users.length}</p>
                  </div>
                  <User className={`w-10 h-10 ${currentColorScheme.primaryText} opacity-50`} />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className={`${currentTheme.surface} rounded-xl p-6 mb-6 border ${currentTheme.border} shadow-sm`}>
              <h3 className={`text-lg font-semibold ${currentTheme.text} mb-4`}>Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Event Type</label>
                  <select
                    value={filters.event_type}
                    onChange={(e) => handleFilterChange('event_type', e.target.value)}
                    className={`w-full px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                  >
                    <option value="">All Events</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Target Type</label>
                  <select
                    value={filters.target_type}
                    onChange={(e) => handleFilterChange('target_type', e.target.value)}
                    className={`w-full px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                  >
                    <option value="">All Types</option>
                    <option value="task">Task</option>
                    <option value="user">User</option>
                    <option value="team">Team</option>
                    <option value="report">Report</option>
                    <option value="comment">Comment</option>
                    <option value="notification">Notification</option>
                    <option value="automation">Automation</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Search</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${currentTheme.textMuted}`} />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Search logs..."
                      className={`w-full pl-10 pr-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Start Date</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                    className={`w-full px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>End Date</label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                    className={`w-full px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>Items per page</label>
                  <select
                    value={filters.limit}
                    onChange={(e) => handleFilterChange('limit', e.target.value)}
                    className={`w-full px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setFilters({
                      event_type: '',
                      target_type: '',
                      search: '',
                      start_date: '',
                      end_date: '',
                      limit: 50
                    });
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg ${currentTheme.hover} ${currentTheme.text} transition-colors`}
                >
                  Clear Filters
                </button>
                <button
                  onClick={handleClearOldLogs}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Old Logs (90+ days)</span>
                </button>
              </div>
            </div>
          )}

          {/* Logs Table */}
          <div className={`${currentTheme.surface} rounded-xl border ${currentTheme.border} shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className={`w-8 h-8 ${currentColorScheme.primaryText} animate-spin mx-auto mb-4`} />
                  <p className={currentTheme.textSecondary}>Loading change logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center">
                  <Activity className={`w-12 h-12 ${currentTheme.textMuted} mx-auto mb-4`} />
                  <p className={`text-lg ${currentTheme.text} mb-2`}>No logs found</p>
                  <p className={currentTheme.textSecondary}>Try adjusting your filters</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className={`${currentTheme.surfaceSecondary} border-b ${currentTheme.border}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${currentTheme.text} uppercase tracking-wider`}>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Timestamp</span>
                        </div>
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${currentTheme.text} uppercase tracking-wider`}>
                        Event Type
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${currentTheme.text} uppercase tracking-wider`}>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>User</span>
                        </div>
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${currentTheme.text} uppercase tracking-wider`}>
                        Description
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${currentTheme.text} uppercase tracking-wider`}>
                        Target
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold ${currentTheme.text} uppercase tracking-wider`}>
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log._id} className={`${currentTheme.hover} transition-colors`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.textSecondary}`}>
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getEventColor(log.event_type)}`}>
                            <span>{getEventIcon(log.event_type)}</span>
                            <span>{log.event_type.replace(/_/g, ' ')}</span>
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${currentTheme.text}`}>
                          <div>
                            <div className="font-medium">{log.user_name || 'System'}</div>
                            <div className={`text-xs ${currentTheme.textSecondary}`}>{log.user_email || 'N/A'}</div>
                            {log.user_role && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                {log.user_role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm ${currentTheme.text} max-w-md`}>
                          {log.description}
                        </td>
                        <td className={`px-6 py-4 text-sm ${currentTheme.textSecondary}`}>
                          {log.target_type && (
                            <div>
                              <div className="font-medium">{log.target_type}</div>
                              <div className="text-xs">{log.target_name || log.target_id || 'N/A'}</div>
                            </div>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.textSecondary} font-mono`}>
                          {log.user_ip || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`px-6 py-4 border-t ${currentTheme.border} flex items-center justify-between`}>
                <div className={`text-sm ${currentTheme.textSecondary}`}>
                  Showing page {page} of {totalPages} ({total.toLocaleString()} total events)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-lg ${currentTheme.hover} ${currentTheme.text} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className={`px-4 py-2 ${currentTheme.text}`}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`p-2 rounded-lg ${currentTheme.hover} ${currentTheme.text} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeLog;
