/**
 * MeetingFormModal
 *
 * Slide-over drawer that handles both CREATE and EDIT for meetings.
 * Visible only to Admin / HR roles — enforced by the parent (HRCalendar).
 *
 * Props:
 *  isOpen      : boolean
 *  onClose     : () => void
 *  onSave      : (payload) => Promise<{ success, meeting, conflicts? }>
 *  initialData : meeting object for edit mode (null = create mode)
 *  saving      : boolean
 *  defaultStart: Date (pre-fill when user clicks a calendar cell)
 */

import { useState, useEffect } from 'react';
import {
  X, Clock, Calendar, Users, Globe, Tag, Link2, RefreshCw,
  AlertTriangle, Video, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import { MEETING_TYPE_COLORS, MEETING_TYPE_LABELS } from '../../hooks/useMeetings';

const VISIBILITY_OPTIONS = [
  { value: 'org_wide',   label: 'Organization-wide',  desc: 'All employees' },
  { value: 'team',       label: 'Team',               desc: 'Selected teams only' },
  { value: 'department', label: 'Department',         desc: 'Selected departments' },
  { value: 'private',   label: 'Private',             desc: 'Explicit participants only' },
];

const FREQ_OPTIONS = [
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Bi-weekly' },
  { value: 'monthly',   label: 'Monthly' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  agenda: '',
  start_time: '',
  end_time: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  is_all_day: false,
  is_recurring: false,
  recurrence_rule: { frequency: 'weekly', interval: 1, days_of_week: [], end_date: '', occurrences: '' },
  participant_users: [],
  participant_teams: [],
  participant_departments: [],
  visibility_scope: 'org_wide',
  meeting_type: 'other',
  conference_link: '',
  tags: '',
  agenda_visible_to_participants: true,
};

export default function MeetingFormModal({ isOpen, onClose, onSave, initialData, saving, defaultStart }) {
  const { currentTheme, theme } = useTheme();
  const [form, setForm]             = useState(EMPTY_FORM);
  const [allUsers, setAllUsers]     = useState([]);
  const [allTeams, setAllTeams]     = useState([]);
  const [errors, setErrors]         = useState({});
  const [showAdvanced, setShowAdv]  = useState(false);
  const [conflicts, setConflicts]   = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // ── Populate form ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        ...EMPTY_FORM,
        ...initialData,
        start_time: toLocalInput(initialData.start_time),
        end_time:   toLocalInput(initialData.end_time),
        participant_users: (initialData.participant_users || []).map(u => u._id || u),
        participant_teams: (initialData.participant_teams || []).map(t => t._id || t),
        tags: (initialData.tags || []).join(', '),
        recurrence_rule: initialData.recurrence_rule || EMPTY_FORM.recurrence_rule,
      });
    } else {
      const start = defaultStart || new Date();
      const end   = new Date(start.getTime() + 60 * 60 * 1000);
      setForm({ ...EMPTY_FORM, start_time: toLocalInput(start), end_time: toLocalInput(end) });
    }
    setErrors({});
    setConflicts([]);
  }, [isOpen, initialData, defaultStart]);

  // ── Load users + teams ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/teams').catch(() => ({ data: [] })),
    ]).then(([u, t]) => {
      setAllUsers(Array.isArray(u.data) ? u.data : (u.data?.users || []));
      setAllTeams(Array.isArray(t.data) ? t.data : (t.data?.teams || []));
    });
  }, [isOpen]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const setRecRule = (field, value) =>
    setForm(prev => ({ ...prev, recurrence_rule: { ...prev.recurrence_rule, [field]: value } }));

  const toggleUser = (id) =>
    setForm(prev => ({
      ...prev,
      participant_users: prev.participant_users.includes(id)
        ? prev.participant_users.filter(x => x !== id)
        : [...prev.participant_users, id]
    }));

  const toggleTeam = (id) =>
    setForm(prev => ({
      ...prev,
      participant_teams: prev.participant_teams.includes(id)
        ? prev.participant_teams.filter(x => x !== id)
        : [...prev.participant_teams, id]
    }));

  const toggleDay = (idx) =>
    setRecRule(
      'days_of_week',
      form.recurrence_rule.days_of_week.includes(idx)
        ? form.recurrence_rule.days_of_week.filter(d => d !== idx)
        : [...form.recurrence_rule.days_of_week, idx]
    );

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim())     e.title      = 'Title is required';
    if (!form.start_time)       e.start_time = 'Start time is required';
    if (!form.end_time)         e.end_time   = 'End time is required';
    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time))
      e.end_time = 'End time must be after start time';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      start_time: new Date(form.start_time).toISOString(),
      end_time:   new Date(form.end_time).toISOString(),
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      recurrence_rule: form.is_recurring ? {
        ...form.recurrence_rule,
        interval: parseInt(form.recurrence_rule.interval) || 1,
        end_date: form.recurrence_rule.end_date || null,
        occurrences: form.recurrence_rule.occurrences ? parseInt(form.recurrence_rule.occurrences) : null,
      } : null,
    };

    const result = await onSave(payload);
    if (result?.success) {
      if (result.conflicts?.length) setConflicts(result.conflicts);
      else onClose();
    }
  };

  if (!isOpen) return null;

  const isEdit = !!initialData;
  const inputCls = `w-full px-3 py-2 text-sm rounded-lg border ${
    theme === 'dark'
      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
  } focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors`;

  const labelCls = `block text-xs font-semibold uppercase tracking-wide mb-1 ${currentTheme.textSecondary}`;

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`w-full max-w-xl h-full overflow-y-auto flex flex-col shadow-2xl ${
          theme === 'dark' ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h2 className={`text-lg font-bold ${currentTheme.text}`}>
              {isEdit ? 'Edit Meeting' : 'Schedule Meeting'}
            </h2>
            <p className={`text-xs ${currentTheme.textSecondary}`}>
              {isEdit ? 'Update the fields and save' : 'Fill in the details to create a new meeting'}
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${currentTheme.textSecondary}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1">Scheduling conflict detected</p>
              {conflicts.map(c => (
                <p key={c._id} className="text-xs text-amber-300">
                  "{c.title}" — {new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' '}–{' '}
                  {new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              ))}
              <p className="text-xs text-amber-300 mt-1">Meeting was saved but conflicts exist.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className={labelCls}>Meeting Title *</label>
            <input
              className={`${inputCls} ${errors.title ? 'border-red-500' : ''}`}
              placeholder="e.g. Q1 HR Review"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
          </div>

          {/* Type */}
          <div>
            <label className={labelCls}>Meeting Type</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MEETING_TYPE_LABELS).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('meeting_type', val)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                  style={
                    form.meeting_type === val
                      ? { background: MEETING_TYPE_COLORS[val], color: 'white', borderColor: MEETING_TYPE_COLORS[val] }
                      : { background: 'transparent', color: MEETING_TYPE_COLORS[val], borderColor: MEETING_TYPE_COLORS[val] }
                  }
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Date / time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start *</label>
              <input
                type={form.is_all_day ? 'date' : 'datetime-local'}
                className={`${inputCls} ${errors.start_time ? 'border-red-500' : ''}`}
                value={form.is_all_day ? form.start_time?.slice(0, 10) : form.start_time}
                onChange={e => set('start_time', e.target.value)}
              />
              {errors.start_time && <p className="text-xs text-red-400 mt-1">{errors.start_time}</p>}
            </div>
            <div>
              <label className={labelCls}>End *</label>
              <input
                type={form.is_all_day ? 'date' : 'datetime-local'}
                className={`${inputCls} ${errors.end_time ? 'border-red-500' : ''}`}
                value={form.is_all_day ? form.end_time?.slice(0, 10) : form.end_time}
                onChange={e => set('end_time', e.target.value)}
              />
              {errors.end_time && <p className="text-xs text-red-400 mt-1">{errors.end_time}</p>}
            </div>
          </div>

          {/* All-day + timezone */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_all_day}
                onChange={e => set('is_all_day', e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className={`text-sm ${currentTheme.textSecondary}`}>All-day event</span>
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <Globe className={`w-4 h-4 ${currentTheme.textSecondary}`} />
              <input
                className={`${inputCls} w-40 text-xs`}
                placeholder="UTC"
                value={form.timezone}
                onChange={e => set('timezone', e.target.value)}
              />
            </div>
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={e => set('is_recurring', e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <RefreshCw className={`w-4 h-4 ${currentTheme.textSecondary}`} />
              <span className={`text-sm ${currentTheme.textSecondary}`}>Recurring meeting</span>
            </label>

            {form.is_recurring && (
              <div className={`mt-3 p-3 rounded-lg border space-y-3 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Frequency</label>
                    <select className={inputCls} value={form.recurrence_rule.frequency} onChange={e => setRecRule('frequency', e.target.value)}>
                      {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Every N units</label>
                    <input
                      type="number" min="1" max="52"
                      className={inputCls}
                      value={form.recurrence_rule.interval}
                      onChange={e => setRecRule('interval', e.target.value)}
                    />
                  </div>
                </div>

                {form.recurrence_rule.frequency === 'weekly' && (
                  <div>
                    <label className={labelCls}>Days of week</label>
                    <div className="flex gap-1 flex-wrap">
                      {DAY_LABELS.map((d, i) => (
                        <button
                          key={i} type="button"
                          onClick={() => toggleDay(i)}
                          className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${
                            form.recurrence_rule.days_of_week.includes(i)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : theme === 'dark'
                                ? 'border-slate-600 text-slate-400 hover:border-blue-500'
                                : 'border-slate-300 text-slate-500 hover:border-blue-500'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>End date (optional)</label>
                    <input type="date" className={inputCls} value={form.recurrence_rule.end_date} onChange={e => setRecRule('end_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Max occurrences</label>
                    <input type="number" min="1" className={inputCls} placeholder="No limit" value={form.recurrence_rule.occurrences} onChange={e => setRecRule('occurrences', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className={labelCls}>Visibility Scope</label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map(v => (
                <label key={v.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility_scope"
                    value={v.value}
                    checked={form.visibility_scope === v.value}
                    onChange={() => set('visibility_scope', v.value)}
                    className="mt-1 accent-blue-500"
                  />
                  <div>
                    <p className={`text-sm font-medium ${currentTheme.text}`}>{v.label}</p>
                    <p className={`text-xs ${currentTheme.textSecondary}`}>{v.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Teams */}
          {(form.visibility_scope === 'team' || form.visibility_scope === 'private') && (
            <div>
              <label className={labelCls}>Teams</label>
              <div className={`max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1 ${
                theme === 'dark' ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
              }`}>
                {allTeams.length === 0 && <p className={`text-xs ${currentTheme.textSecondary}`}>No teams found</p>}
                {allTeams.map(t => (
                  <label key={t._id} className="flex items-center gap-2 cursor-pointer hover:opacity-80 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={form.participant_teams.includes(t._id)}
                      onChange={() => toggleTeam(t._id)}
                      className="accent-blue-500"
                    />
                    <span className={`text-sm ${currentTheme.text}`}>{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Individual participants */}
          <div>
            <label className={labelCls}>Individual Participants</label>
            <input
              className={`${inputCls} mb-2`}
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            <div className={`max-h-44 overflow-y-auto rounded-lg border p-2 space-y-1 ${
              theme === 'dark' ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
            }`}>
              {filteredUsers.length === 0 && <p className={`text-xs ${currentTheme.textSecondary}`}>No matches</p>}
              {filteredUsers.map(u => (
                <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:opacity-80 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={form.participant_users.includes(u._id)}
                    onChange={() => toggleUser(u._id)}
                    className="accent-blue-500"
                  />
                  <div>
                    <p className={`text-sm ${currentTheme.text}`}>{u.full_name}</p>
                    <p className={`text-xs ${currentTheme.textSecondary}`}>{u.email}</p>
                  </div>
                </label>
              ))}
            </div>
            {form.participant_users.length > 0 && (
              <p className={`text-xs mt-1 ${currentTheme.textSecondary}`}>
                {form.participant_users.length} participant{form.participant_users.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Brief overview of the meeting..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Advanced section */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdv(v => !v)}
              className={`flex items-center gap-2 text-sm font-medium ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4">
                {/* Agenda */}
                <div>
                  <label className={labelCls}>Agenda</label>
                  <textarea
                    rows={4}
                    className={inputCls}
                    placeholder="1. Status update&#10;2. Blockers&#10;3. Next steps"
                    value={form.agenda}
                    onChange={e => set('agenda', e.target.value)}
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agenda_visible_to_participants}
                      onChange={e => set('agenda_visible_to_participants', e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span className={`text-xs ${currentTheme.textSecondary}`}>Show agenda to participants</span>
                  </label>
                </div>

                {/* Conference link */}
                <div>
                  <label className={labelCls}>
                    <Video className="w-3 h-3 inline mr-1" />
                    Conference Link
                  </label>
                  <input
                    type="url"
                    className={inputCls}
                    placeholder="https://meet.google.com/..."
                    value={form.conference_link}
                    onChange={e => set('conference_link', e.target.value)}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className={labelCls}>
                    <Tag className="w-3 h-3 inline mr-1" />
                    Tags (comma-separated)
                  </label>
                  <input
                    className={inputCls}
                    placeholder="performance, q1, leadership"
                    value={form.tags}
                    onChange={e => set('tags', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`sticky bottom-0 pt-4 pb-2 flex gap-3 border-t ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                theme === 'dark'
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Schedule Meeting'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
