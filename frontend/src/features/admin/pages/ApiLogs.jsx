import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import api from '@/shared/services/axios';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';

const METHOD_OPTIONS = ['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const OPERATION_OPTIONS = ['', 'read', 'create', 'update', 'delete'];
const OUTCOME_OPTIONS = ['', 'success', 'failed'];

export default function ApiLogs() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const isDark = theme === 'dark';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    method: '',
    module: '',
    operation: '',
    outcome: '',
    search: '',
    start_date: '',
    end_date: ''
  });

  const isAllowed = user && ['admin', 'hr', 'super_admin'].includes(user.role);

  useEffect(() => {
    if (isAllowed) {
      void fetchApiLogs();
    }
  }, [isAllowed, page, filters]);

  const hasActiveFilters = useMemo(() => (
    Boolean(
      filters.method ||
      filters.module ||
      filters.operation ||
      filters.outcome ||
      filters.search ||
      filters.start_date ||
      filters.end_date
    )
  ), [filters]);

  const fetchApiLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit: 25,
        ...filters
      };

      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });

      const response = await api.get('/api-logs', { params });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || 'Failed to fetch API logs');
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      method: '',
      module: '',
      operation: '',
      outcome: '',
      search: '',
      start_date: '',
      end_date: ''
    });
  };

  const handleExportCSV = () => {
    const rows = logs.map((log) => [
      new Date(log.created_at).toISOString(),
      log.method || '',
      log.path || '',
      log.module || '',
      log.operation || '',
      log.outcome || '',
      log.status_code || '',
      log.user_email || ''
    ]);

    const csv = [
      'Timestamp,Method,Path,Module,Operation,Outcome,Status Code,User Email',
      ...rows.map((row) => row.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `api-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isAllowed) {
    return (
      <ResponsivePageLayout>
        <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-medium">Access Denied</p>
            <p>You do not have permission to access API logs.</p>
          </div>
        </div>
      </ResponsivePageLayout>
    );
  }

  return (
    <ResponsivePageLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-surface)]"
            >
              <FileText className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                API Logs
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Dedicated request logs for backend and frontend API activity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
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
            </button>

            <button
              onClick={fetchApiLogs}
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

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
            {error}
          </div>
        )}

        {showFilters && (
          <div className="mb-4 p-4 rounded-lg border bg-[var(--bg-raised)] border-[var(--border-soft)]">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">Method</label>
                <select
                  value={filters.method}
                  onChange={(event) => handleFilterChange('method', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {METHOD_OPTIONS.map((method) => (
                    <option key={method || 'all'} value={method}>
                      {method || 'all'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">Operation</label>
                <select
                  value={filters.operation}
                  onChange={(event) => handleFilterChange('operation', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {OPERATION_OPTIONS.map((operation) => (
                    <option key={operation || 'all'} value={operation}>
                      {operation || 'all'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">Outcome</label>
                <select
                  value={filters.outcome}
                  onChange={(event) => handleFilterChange('outcome', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {OUTCOME_OPTIONS.map((outcome) => (
                    <option key={outcome || 'all'} value={outcome}>
                      {outcome || 'all'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">Module</label>
                <input
                  type="text"
                  value={filters.module}
                  onChange={(event) => handleFilterChange('module', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) => handleFilterChange('search', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(event) => handleFilterChange('start_date', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-muted)]">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(event) => handleFilterChange('end_date', event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-[var(--bg-surface)] border-[var(--bg-surface)] text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="mt-3">
              <button onClick={clearFilters} className="text-sm text-[#C4713A] hover:text-[#A35C28]">Clear filters</button>
            </div>
          </div>
        )}

        <div className="mb-3 text-sm text-[var(--text-muted)]">Showing {logs.length} of {total} entries</div>

        <div className="rounded-lg border overflow-hidden border-[var(--border-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-surface)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Operation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Outcome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">No API logs found.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[var(--bg-surface)]">
                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{log.method || '-'}</td>
                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.path || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{log.module || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{log.operation || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{log.outcome || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{Number.isFinite(log.status_code) ? log.status_code : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[var(--border-soft)] flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded border border-[var(--border-soft)] disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded border border-[var(--border-soft)] disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsivePageLayout>
  );
}
