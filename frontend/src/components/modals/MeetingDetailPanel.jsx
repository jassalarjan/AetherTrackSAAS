/**
 * MeetingDetailPanel
 *
 * Read-only detail view for a meeting — displayed as a slide-over for all roles.
 * Admin/HR roles get additional action buttons (Edit, Cancel, Delete).
 *
 * Props:
 *  meeting        : Meeting object (populated from API)
 *  isOpen         : boolean
 *  onClose        : () => void
 *  onEdit         : (meeting) => void   — admin/hr only
 *  onCancel       : (id, reason) => Promise
 *  onDelete       : (id) => Promise
 *  canManage      : boolean (true for admin/hr)
 *  saving         : boolean
 */

import { useState } from 'react';
import {
  X, Clock, Calendar, Users, Globe, Tag, Link2, RefreshCw,
  Edit2, Trash2, XCircle, Video, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, User
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { MEETING_TYPE_COLORS, MEETING_TYPE_LABELS, STATUS_STYLES } from '../../hooks/useMeetings';

function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString([], {
    dateStyle: 'medium', timeStyle: 'short'
  });
}

function formatDuration(start, end) {
  if (!start || !end) return '';
  const diffMs = new Date(end) - new Date(start);
  const mins   = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const FREQ_LABEL = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', custom: 'Custom'
};

export default function MeetingDetailPanel({ meeting, isOpen, onClose, onEdit, onCancel, onDelete, canManage, saving }) {
  const { currentTheme, theme } = useTheme();
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cancelReason, setCancelReason]           = useState('');
  const [showAgenda, setShowAgenda]               = useState(false);

  if (!isOpen || !meeting) return null;

  const isCancelled = meeting.status === 'cancelled';
  const isCompleted = meeting.status === 'completed';
  const typeColor   = MEETING_TYPE_COLORS[meeting.meeting_type] || '#6b7280';

  const handleCancel = async () => {
    const res = await onCancel(meeting._id, cancelReason);
    if (res?.success) {
      setShowCancelPrompt(false);
      setCancelReason('');
      onClose();
    }
  };

  const handleDelete = async () => {
    const res = await onDelete(meeting._id);
    if (res?.success) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const inputCls = `w-full px-3 py-2 text-sm rounded-lg border ${
    theme === 'dark'
      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400'
      : 'bg-white border-slate-300 text-slate-900'
  } focus:outline-none focus:ring-1 focus:ring-blue-500`;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`w-full max-w-lg h-full overflow-y-auto flex flex-col shadow-2xl ${
        theme === 'dark' ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-slate-200'
      }`}>

        {/* Header strip with type-colour accent */}
        <div className="relative" style={{ borderTop: `4px solid ${typeColor}` }}>
          <div className={`px-6 py-5 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: typeColor }}
                  >
                    {MEETING_TYPE_LABELS[meeting.meeting_type] || 'Meeting'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[meeting.status] || ''}`}>
                    {meeting.status?.charAt(0).toUpperCase() + meeting.status?.slice(1)}
                  </span>
                  {meeting.is_recurring && (
                    <span className={`flex items-center gap-1 text-xs ${currentTheme.textSecondary}`}>
                      <RefreshCw className="w-3 h-3" /> Recurring
                    </span>
                  )}
                </div>
                <h2 className={`text-xl font-bold leading-snug ${currentTheme.text}`}>{meeting.title}</h2>
              </div>
              <button onClick={onClose} className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${currentTheme.textSecondary} flex-shrink-0`}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-6 space-y-5">

          {/* Cancelled notice */}
          {isCancelled && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-2">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-400">This meeting has been cancelled</p>
                {meeting.cancelled_reason && (
                  <p className="text-xs text-red-300 mt-0.5">{meeting.cancelled_reason}</p>
                )}
              </div>
            </div>
          )}

          {/* Time */}
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Time">
            <p className={`text-sm ${currentTheme.text}`}>{formatDateTime(meeting.start_time)}</p>
            <p className={`text-xs ${currentTheme.textSecondary}`}>
              to {formatDateTime(meeting.end_time)}
              {' · '}
              {formatDuration(meeting.start_time, meeting.end_time)}
            </p>
          </InfoRow>

          {/* Timezone */}
          {meeting.timezone && meeting.timezone !== 'UTC' && (
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Timezone">
              <p className={`text-sm ${currentTheme.text}`}>{meeting.timezone}</p>
            </InfoRow>
          )}

          {/* Recurrence */}
          {meeting.is_recurring && meeting.recurrence_rule && (
            <InfoRow icon={<RefreshCw className="w-4 h-4" />} label="Recurrence">
              <p className={`text-sm ${currentTheme.text}`}>
                {FREQ_LABEL[meeting.recurrence_rule.frequency] || meeting.recurrence_rule.frequency}
                {meeting.recurrence_rule.interval > 1 ? ` every ${meeting.recurrence_rule.interval}` : ''}
              </p>
              {meeting.recurrence_rule.end_date && (
                <p className={`text-xs ${currentTheme.textSecondary}`}>
                  Until {new Date(meeting.recurrence_rule.end_date).toLocaleDateString()}
                </p>
              )}
            </InfoRow>
          )}

          {/* Organizer */}
          {meeting.created_by && (
            <InfoRow icon={<User className="w-4 h-4" />} label="Organizer">
              <p className={`text-sm ${currentTheme.text}`}>{meeting.created_by.full_name}</p>
              <p className={`text-xs ${currentTheme.textSecondary}`}>{meeting.created_by.email}</p>
            </InfoRow>
          )}

          {/* Visibility */}
          <InfoRow icon={<Globe className="w-4 h-4" />} label="Visibility">
            <p className={`text-sm ${currentTheme.text} capitalize`}>
              {meeting.visibility_scope?.replace('_', '-')}
            </p>
          </InfoRow>

          {/* Conference link */}
          {meeting.conference_link && (
            <InfoRow icon={<Video className="w-4 h-4" />} label="Join">
              <a
                href={meeting.conference_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 underline break-all"
              >
                {meeting.conference_link}
              </a>
            </InfoRow>
          )}

          {/* Participants — teams */}
          {meeting.participant_teams?.length > 0 && (
            <InfoRow icon={<Users className="w-4 h-4" />} label="Teams">
              <div className="flex flex-wrap gap-1 mt-0.5">
                {meeting.participant_teams.map(t => (
                  <span
                    key={t._id || t}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.name || t}
                  </span>
                ))}
              </div>
            </InfoRow>
          )}

          {/* Participants — individuals */}
          {meeting.participant_users?.length > 0 && (
            <InfoRow icon={<Users className="w-4 h-4" />} label={`Participants (${meeting.participant_users.length})`}>
              <div className="mt-1 space-y-1 max-h-36 overflow-y-auto pr-1">
                {meeting.participant_users.map(u => (
                  <div key={u._id || u} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                      {(u.full_name || '?')[0]}
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${currentTheme.text}`}>{u.full_name || u}</p>
                      {u.email && <p className={`text-xs ${currentTheme.textSecondary}`}>{u.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </InfoRow>
          )}

          {/* Description */}
          {meeting.description && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${currentTheme.textSecondary}`}>Description</p>
              <p className={`text-sm leading-relaxed ${currentTheme.text}`}>{meeting.description}</p>
            </div>
          )}

          {/* Agenda (collapsible) */}
          {meeting.agenda && (
            <div>
              <button
                onClick={() => setShowAgenda(v => !v)}
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
              >
                {showAgenda ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Agenda
              </button>
              {showAgenda && (
                <pre className={`mt-2 text-sm whitespace-pre-wrap leading-relaxed ${currentTheme.text} font-sans`}>
                  {meeting.agenda}
                </pre>
              )}
            </div>
          )}

          {/* Tags */}
          {meeting.tags?.length > 0 && (
            <InfoRow icon={<Tag className="w-4 h-4" />} label="Tags">
              <div className="flex flex-wrap gap-1 mt-0.5">
                {meeting.tags.map(t => (
                  <span
                    key={t}
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </InfoRow>
          )}

          {/* Admin actions */}
          {canManage && (
            <div className={`pt-4 border-t space-y-3 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>

              {!isCancelled && !isCompleted && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(meeting)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => setShowCancelPrompt(true)}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      theme === 'dark'
                        ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                        : 'border-amber-400 text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}

              {/* Cancel prompt */}
              {showCancelPrompt && (
                <div className={`p-3 rounded-lg border space-y-2 ${
                  theme === 'dark' ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'
                }`}>
                  <p className={`text-xs font-semibold ${currentTheme.text}`}>Reason for cancellation (optional)</p>
                  <textarea
                    rows={2}
                    className={inputCls}
                    placeholder="e.g. Rescheduled to next week..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        theme === 'dark' ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Go back
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Cancelling…' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Hard delete */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-colors ${
                    theme === 'dark'
                      ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                      : 'border-red-300 text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Delete permanently
                </button>
              ) : (
                <div className={`p-3 rounded-lg border space-y-2 ${
                  theme === 'dark' ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'
                }`}>
                  <p className={`text-xs font-semibold text-red-400`}>This cannot be undone. All occurrences will be removed.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-2 rounded-lg text-sm border ${
                      theme === 'dark' ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    } transition-colors`}>
                      Go back
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tiny layout helper ────────────────────────────────────────────────────────
function InfoRow({ icon, label, children }) {
  const { currentTheme } = useTheme();
  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 flex-shrink-0 ${currentTheme.textSecondary}`}>{icon}</div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${currentTheme.textSecondary}`}>{label}</p>
        {children}
      </div>
    </div>
  );
}
