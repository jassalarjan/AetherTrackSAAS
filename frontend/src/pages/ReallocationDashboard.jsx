/**
 * ReallocationDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Team Lead command centre for reviewing, accepting, redistributing, or
 * rejecting task reallocations triggered by employee leaves.
 *
 * Also serves as a read-only history view for HR/Admin.
 */

import { SectionLoader } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import {
  ArrowLeftRight, CheckCircle2, XCircle, Send, Clock, AlertTriangle,
  RefreshCw, User, Briefcase, Calendar, ChevronDown, ChevronUp,
  Filter, BarChart3, Search, Info, Loader2
} from 'lucide-react';

// ─── Priority badge ───────────────────────────────────────────────────────────
const PriorityBadge = ({ priority }) => {
  const map = {
    urgent:  'bg-red-500/20 text-red-400 border-red-500/30',
    high:    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low:     'bg-green-500/20 text-green-400 border-green-500/30'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[priority] || map.medium}`}>
      {priority}
    </span>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:        'bg-amber-500/20 text-amber-400 border-amber-500/30',
    accepted:       'bg-blue-500/20 text-blue-400 border-blue-500/30',
    redistributed:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
    rejected:       'bg-red-500/20 text-red-400 border-red-500/30'
  };
  const labels = {
    pending: '⏳ Pending',
    accepted: '✅ Accepted',
    redistributed: '🔀 Redistributed',
    rejected: '❌ Rejected'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.pending}`}>
      {labels[status] || status}
    </span>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, theme }) => (
  <div className={`rounded-xl border p-4 flex items-center gap-3
    bg-[var(--bg-raised)] border-[var(--border-soft)]`}>
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className={`text-2xl font-bold text-[var(--text-primary)]`}>{value}</p>
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  </div>
);

// ─── Redistribute modal ───────────────────────────────────────────────────────
function RedistributeModal({ log, theme, onClose, onSubmit, teamMembers }) {
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [adjustedDueDate, setAdjustedDueDate] = useState(
    log.taskDueDate ? new Date(log.taskDueDate).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAssigneeId) return;
    setSubmitting(true);
    await onSubmit({ newAssigneeId, adjustedDueDate, notes });
    setSubmitting(false);
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm
    ${theme === 'dark'
      ? 'bg-[#111418] border-[#282f39] text-white placeholder-gray-500'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl
        bg-[var(--bg-raised)] border-[var(--border-soft)]`}>
        <div className="p-6 border-b border-inherit">
          <h3 className={`text-lg font-semibold text-[var(--text-primary)]`}>
            🔀 Redistribute Task
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Reassign <span className="font-medium">"{log.taskTitle}"</span> to another team member.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Assign to *
            </label>
            <select
              value={newAssigneeId}
              onChange={e => setNewAssigneeId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Select team member…</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.full_name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Adjusted Due Date
            </label>
            <input
              type="date"
              value={adjustedDueDate}
              onChange={e => setAdjustedDueDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add context for the new assignee…"
              className={inputCls}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border
                ${theme === 'dark'
                  ? 'border-[#282f39] text-gray-300 hover:bg-[#282f39]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newAssigneeId}
              className="aether-btn aether-btn-primary flex-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Redistribute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ log, theme, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl
        bg-[var(--bg-raised)] border-[var(--border-soft)]`}>
        <div className="p-6 border-b border-inherit">
          <h3 className={`text-lg font-semibold text-[var(--text-primary)]`}>
            ❌ Reject Reallocation
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            You must provide a reason. This will be logged and HR will be notified.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Why are you rejecting this reallocation?…"
            className={`w-full rounded-lg border px-3 py-2 text-sm
              ${theme === 'dark'
                ? 'bg-[#111418] border-[#282f39] text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`}
            required
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border
                ${theme === 'dark'
                  ? 'border-[#282f39] text-gray-300 hover:bg-[#282f39]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="aether-btn aether-btn-danger flex-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Confirm Reject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reallocation row card ────────────────────────────────────────────────────
function ReallocationCard({ log, theme, user, onAction, teamMembers }) {
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(null); // 'redistribute' | 'reject'
  const [accepting, setAccepting] = useState(false);

  const isTeamLead = user.role === 'team_lead';
  const canAct = isTeamLead && log.status === 'pending';

  const handleAccept = async () => {
    setAccepting(true);
    await onAction(log._id, 'accept', {});
    setAccepting(false);
  };

  const cardBg = theme === 'dark'
    ? 'bg-[#1c2027] border-[#282f39]'
    : 'bg-white border-gray-200';

  const textPrimary   = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      <div className={`rounded-xl border ${cardBg} overflow-hidden transition-all`}>
        {/* Card header */}
        <div
          className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-semibold truncate ${textPrimary}`}>
                  {log.taskTitle}
                </h4>
                <StatusBadge status={log.status} />
                <PriorityBadge priority={log.taskPriority} />
              </div>
              <div className={`flex items-center gap-3 mt-1.5 flex-wrap text-xs ${textSecondary}`}>
                {log.originalUserId && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    From: {log.originalUserId.full_name}
                  </span>
                )}
                {log.projectId && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {log.projectId.name}
                  </span>
                )}
                {log.taskDueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {new Date(log.taskDueDate).toLocaleDateString()}
                  </span>
                )}
                <span className={`flex items-center gap-1 ${
                  log.triggerType === 'leave_approved' ? 'text-blue-400' : 'text-amber-400'
                }`}>
                  <Info className="w-3 h-3" />
                  {log.triggerType === 'leave_approved' ? 'Leave Approved' : 'Absence Marked'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className={`border-t px-4 py-3 space-y-3
            border-[var(--border-soft)] bg-[var(--bg-base)]/50`}>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className={textSecondary}>Leave Period</span>
                <p className={`font-medium mt-0.5 ${textPrimary}`}>
                  {new Date(log.leaveStartDate).toLocaleDateString()} –{' '}
                  {new Date(log.leaveEndDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className={textSecondary}>Reason</span>
                <p className={`font-medium mt-0.5 ${textPrimary}`}>
                  {log.reallocationReason}
                </p>
              </div>
              {log.leadNotes && (
                <div className="col-span-2">
                  <span className={textSecondary}>Notes</span>
                  <p className={`font-medium mt-0.5 ${textPrimary}`}>{log.leadNotes}</p>
                </div>
              )}
              {log.rejectionReason && (
                <div className="col-span-2">
                  <span className="text-red-400">Rejection Reason</span>
                  <p className="font-medium mt-0.5 text-red-400">{log.rejectionReason}</p>
                </div>
              )}
              {log.redistributedToUserId && (
                <div className="col-span-2">
                  <span className={textSecondary}>Redistributed To</span>
                  <p className={`font-medium mt-0.5 ${textPrimary}`}>
                    {log.redistributedToUserId.full_name}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons — only for team lead on pending items */}
            {canAct && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="aether-btn aether-btn-success aether-btn-sm"
                >
                  {accepting
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <CheckCircle2 className="w-3 h-3" />}
                  Accept Ownership
                </button>
                <button
                  onClick={() => setModal('redistribute')}
                  className="aether-btn aether-btn-primary aether-btn-sm"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Redistribute
                </button>
                <button
                  onClick={() => setModal('reject')}
                  className="aether-btn aether-btn-sm" style={{ color: 'var(--danger)', background: 'var(--danger-dim)', border: '1px solid var(--danger)' }}
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'redistribute' && (
        <RedistributeModal
          log={log}
          theme={theme}
          teamMembers={teamMembers}
          onClose={() => setModal(null)}
          onSubmit={async (data) => {
            await onAction(log._id, 'redistribute', data);
            setModal(null);
          }}
        />
      )}
      {modal === 'reject' && (
        <RejectModal
          log={log}
          theme={theme}
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await onAction(log._id, 'reject', { rejectionReason: reason });
            setModal(null);
          }}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ReallocationDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [tab, setTab] = useState('pending');       // 'pending' | 'history'
  const [logs, setLogs] = useState([]);
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdminOrHr = ['admin', 'hr'].includes(user?.role);
  const isTeamLead  = user?.role === 'team_lead';

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [];

      // Pending queue
      if (isTeamLead || isAdminOrHr) {
        promises.push(
          api.get('/hr/reallocation/pending').then(r => setPending(r.data.pending || []))
        );
      }

      // History
      promises.push(
        api.get('/hr/reallocation', {
          params: { status: statusFilter || undefined, page }
        }).then(r => {
          setLogs(r.data.logs || []);
          setTotalPages(r.data.totalPages || 1);
        })
      );

      // Stats (admin/hr only)
      if (isAdminOrHr) {
        promises.push(
          api.get('/hr/reallocation/stats').then(r => setStats(r.data.stats))
        );
      }

      // Team members for redistribution (team leads need this)
      if (isTeamLead || isAdminOrHr) {
        promises.push(
          api.get('/users').then(r => {
            const members = (r.data.users || r.data || []).filter(
              u => u._id !== user._id && u.employmentStatus === 'ACTIVE'
            );
            setTeamMembers(members);
          })
        );
      }

      await Promise.allSettled(promises);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reallocation data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, isAdminOrHr, isTeamLead, user?._id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Action handler ──────────────────────────────────────────────────────────
  const handleAction = async (logId, action, payload) => {
    try {
      await api.post(`/hr/reallocation/${logId}/${action}`, payload);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} reallocation`);
    }
  };

  // ── Filtered display list ───────────────────────────────────────────────────
  const displayList = (tab === 'pending' ? pending : logs).filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.taskTitle?.toLowerCase().includes(q) ||
      log.originalUserId?.full_name?.toLowerCase().includes(q) ||
      log.projectId?.name?.toLowerCase().includes(q)
    );
  });

  const cardBg      = 'bg-[var(--bg-raised)] border-[var(--border-soft)]';
  const textPrimary   = 'text-[var(--text-primary)]';
  const textSecondary = 'text-[var(--text-muted)]';
  const inputCls  = 'rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-text-[var(--text-muted)]';

  return (
    <ResponsivePageLayout
      title="Task Reallocation"
      subtitle={
        isTeamLead
          ? 'Manage tasks reallocated to you when team members go on leave'
          : 'Monitor and audit all task reallocation events'
      }
      actions={
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      }
    >
      <div className="p-4 sm:p-6 space-y-6">

        {/* Stats row (admin/hr only) */}
        {isAdminOrHr && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Pending"       value={stats.pending}       icon={Clock}         color="bg-amber-500/20 text-amber-400"  theme={theme} />
            <StatCard label="Accepted"      value={stats.accepted}      icon={CheckCircle2}  color="bg-blue-500/20 text-blue-400"    theme={theme} />
            <StatCard label="Redistributed" value={stats.redistributed} icon={ArrowLeftRight} color="bg-purple-500/20 text-purple-400" theme={theme} />
            <StatCard label="Total"         value={stats.total}         icon={BarChart3}     color="bg-gray-500/20 text-gray-400"    theme={theme} />
          </div>
        )}

        {/* Pending alert banner for team leads */}
        {isTeamLead && pending.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-medium text-sm">
                You have {pending.length} pending reallocation{pending.length > 1 ? 's' : ''}
              </p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                These tasks need your attention. Accept, redistribute, or reject each one.
              </p>
            </div>
          </div>
        )}

        {/* Tabs + filters */}
        <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
          <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b
            border-[var(--border-soft)]`}>
            {/* Tabs */}
            <div className="flex gap-1">
              {[
                { key: 'pending', label: `Pending${pending.length ? ` (${pending.length})` : ''}` },
                { key: 'history', label: 'History' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${tab === t.key
                      ? 'bg-[#C4713A] text-white'
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-[#282f39]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSecondary}`} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tasks…"
                  className={`${inputCls} pl-8 w-40`}
                />
              </div>
              {tab === 'history' && (
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className={inputCls}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="redistributed">Redistributed</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="py-10">
                <SectionLoader label="Loading requests…" minHeight="160px" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle className="w-10 h-10 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={fetchData} className="text-blue-400 text-sm hover:underline">Retry</button>
              </div>
            ) : displayList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {tab === 'pending' ? 'No pending reallocations' : 'No reallocation history'}
                </p>
                <p className={`text-xs ${textSecondary}`}>
                  {tab === 'pending'
                    ? 'All clear — no tasks are awaiting your attention.'
                    : 'Reallocations will appear here once triggered.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayList.map(log => (
                  <ReallocationCard
                    key={log._id}
                    log={log}
                    theme={theme}
                    user={user}
                    onAction={handleAction}
                    teamMembers={teamMembers}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination (history tab) */}
          {tab === 'history' && totalPages > 1 && !loading && (
            <div className={`flex items-center justify-center gap-3 px-4 py-3 border-t
              border-[var(--border-soft)]`}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40
                  ${theme === 'dark'
                    ? 'border-[#282f39] text-gray-300 hover:bg-[#282f39]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Previous
              </button>
              <span className={`text-xs ${textSecondary}`}>Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40
                  ${theme === 'dark'
                    ? 'border-[#282f39] text-gray-300 hover:bg-[#282f39]'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </ResponsivePageLayout>
  );
}
