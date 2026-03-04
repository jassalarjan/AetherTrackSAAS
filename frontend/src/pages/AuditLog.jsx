import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import attendanceApi from '../api/attendanceApi';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import { 
  FileText, Search, Download, Calendar, User, ChevronDown, 
  ChevronUp, RefreshCw, AlertCircle, Filter, X
} from 'lucide-react';

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'CHECK_IN', label: 'Check In' },
  { value: 'CHECK_OUT', label: 'Check Out' },
  { value: 'APPROVE', label: 'Approved' },
  { value: 'REJECT', label: 'Rejected' },
  { value: 'OVERRIDE', label: 'Overridden' },
  { value: 'CREATE', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
];

export default function AuditLog() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const isDark = theme === 'dark';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    attendanceId: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Expanded row
  const [expandedRow, setExpandedRow] = useState(null);

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin, page, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await attendanceApi.getAuditLog(params);
      
      // Handle different response formats
      const data = response.data;
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else if (data.logs) {
        setLogs(data.logs);
        setTotal(data.total || data.logs.length);
        setTotalPages(data.totalPages || Math.ceil(data.total / 20) || 1);
      } else if (data.auditLogs) {
        setLogs(data.auditLogs);
        setTotal(data.total || data.auditLogs.length);
        setTotalPages(data.totalPages || Math.ceil(data.total / 20) || 1);
      } else {
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: '',
      attendanceId: ''
    });
    setPage(1);
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Date', 'User', 'Action', 'Attendance ID', 'Details'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.userId?.name || log.user?.name || 'System',
        log.action || '',
        log.attendanceId || '',
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getActionBadge = (action) => {
    const actionConfig = {
      CHECK_IN: { color: 'bg-blue-500', text: 'text-blue-500' },
      CHECK_OUT: { color: 'bg-purple-500', text: 'text-purple-500' },
      APPROVE: { color: 'bg-green-500', text: 'text-green-500' },
      REJECT: { color: 'bg-red-500', text: 'text-red-500' },
      OVERRIDE: { color: 'bg-yellow-500', text: 'text-yellow-500' },
      CREATE: { color: 'bg-teal-500', text: 'text-teal-500' },
      UPDATE: { color: 'bg-indigo-500', text: 'text-indigo-500' },
      DELETE: { color: 'bg-red-500', text: 'text-red-500' },
    };

    const config = actionConfig[action] || { color: 'bg-gray-500', text: 'text-gray-500' };

    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color} bg-opacity-10 ${config.text}`}>
        {action}
      </span>
    );
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.userId || filters.action || filters.attendanceId;

  if (!isAdmin) {
    return (
      <ResponsivePageLayout>
        <div className={`flex items-center justify-center h-64 ${
          isDark ? 'text-[#9da8b9]' : 'text-gray-500'
        }`}>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-medium">Access Denied</p>
            <p>You don't have permission to access this page.</p>
          </div>
        </div>
      </ResponsivePageLayout>
    );
  }

  return (
    <ResponsivePageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileSidebar}
              className={`lg:hidden p-2 rounded-lg ${
                isDark ? 'hover:bg-[#282f39]' : 'hover:bg-gray-100'
              }`}
            >
              <FileText className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Audit Log
              </h1>
              <p className={`text-sm ${
                isDark ? 'text-[#9da8b9]' : 'text-gray-500'
              }`}>
                View attendance activity and changes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-[#C4713A] text-white'
                  : isDark 
                    ? 'bg-[#282f39] text-white hover:bg-[#333a47]' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-white"></span>
              )}
            </button>

            <button
              onClick={fetchAuditLogs}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-[#282f39] text-white hover:bg-[#333a47]' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-[#282f39] text-white hover:bg-[#333a47]' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className={`mb-4 p-4 rounded-lg border ${
            isDark ? 'bg-[#1c2027] border-[#333a47]' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Filter Options
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#C4713A] hover:text-[#A35C28]"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className={`block text-sm mb-1 ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                }`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-[#282f39] border-[#333a47] text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm mb-1 ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                }`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-[#282f39] border-[#333a47] text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm mb-1 ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                }`}>
                  User ID
                </label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  placeholder="Filter by user ID"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-[#282f39] border-[#333a47] text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm mb-1 ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                }`}>
                  Action Type
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-[#282f39] border-[#333a47] text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {ACTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm mb-1 ${
                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                }`}>
                  Attendance ID
                </label>
                <input
                  type="text"
                  value={filters.attendanceId}
                  onChange={(e) => handleFilterChange('attendanceId', e.target.value)}
                  placeholder="Filter by attendance ID"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-[#282f39] border-[#333a47] text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className={`mb-4 text-sm ${
          isDark ? 'text-[#9da8b9]' : 'text-gray-500'
        }`}>
          Showing {logs.length} of {total} results
          {page > 1 && ` (Page ${page} of ${totalPages})`}
        </div>

        {/* Table */}
        <div className={`rounded-lg border overflow-hidden ${
          isDark ? 'border-[#333a47]' : 'border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${
                isDark ? 'bg-[#282f39]' : 'bg-gray-50'
              }`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                  }`}>
                    Date & Time
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                  }`}>
                    User
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                  }`}>
                    Action
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                  }`}>
                    Attendance ID
                  </th>
                  <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                  }`}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark ? 'divide-[#333a47]' : 'divide-gray-200'
              }`}>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`px-4 py-8 text-center ${
                      isDark ? 'text-[#9da8b9]' : 'text-gray-500'
                    }`}>
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <>
                      <tr 
                        key={log._id || log.id || index}
                        className={`${
                          isDark ? 'hover:bg-[#282f39]' : 'hover:bg-gray-50'
                        } cursor-pointer`}
                        onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                      >
                        <td className={`px-4 py-3 text-sm ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatDate(log.createdAt)}
                        </td>
                        <td className={`px-4 py-3 text-sm ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <User className={`w-4 h-4 ${
                              isDark ? 'text-[#9da8b9]' : 'text-gray-400'
                            }`} />
                            {log.userId?.name || log.user?.name || 'System'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getActionBadge(log.action)}
                        </td>
                        <td className={`px-4 py-3 text-sm ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {log.attendanceId ? (
                            <span className={`font-mono text-xs px-2 py-1 rounded ${
                              isDark ? 'bg-[#282f39]' : 'bg-gray-100'
                            }`}>
                              {typeof log.attendanceId === 'object' 
                                ? log.attendanceId._id?.slice(-8) 
                                : String(log.attendanceId).slice(-8)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {expandedRow === index ? (
                            <ChevronUp className={`w-4 h-4 inline ${
                              isDark ? 'text-[#9da8b9]' : 'text-gray-400'
                            }`} />
                          ) : (
                            <ChevronDown className={`w-4 h-4 inline ${
                              isDark ? 'text-[#9da8b9]' : 'text-gray-400'
                            }`} />
                          )}
                        </td>
                      </tr>
                      {expandedRow === index && (
                        <tr>
                          <td colSpan={5} className={`px-4 py-4 ${
                            isDark ? 'bg-[#282f39]' : 'bg-gray-50'
                          }`}>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className={`font-medium mb-2 ${
                                  isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                  Event Details
                                </h4>
                                <div className={`space-y-2 text-sm ${
                                  isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                                }`}>
                                  <p><span className="font-medium">Event ID:</span> {log._id || log.id}</p>
                                  <p><span className="font-medium">IP Address:</span> {log.ip || log.ipAddress || '-'}</p>
                                  <p><span className="font-medium">User Agent:</span> {log.userAgent || '-'}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className={`font-medium mb-2 ${
                                  isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                  Changes / Notes
                                </h4>
                                <pre className={`text-xs p-3 rounded overflow-auto max-h-32 ${
                                  isDark ? 'bg-[#1c2027]' : 'bg-white'
                                }`}>
                                  {JSON.stringify(log.details || log.changes || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg ${
                isDark 
                  ? 'bg-[#282f39] text-white hover:bg-[#333a47] disabled:opacity-50' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
            >
              Previous
            </button>
            <span className={`text-sm ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-600'
            }`}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-lg ${
                isDark 
                  ? 'bg-[#282f39] text-white hover:bg-[#333a47] disabled:opacity-50' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </ResponsivePageLayout>
  );
}
