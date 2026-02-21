/**
 * ShiftManagement.jsx â€” Shift-wise Attendance Configuration
 *
 * Tabs: Shifts Â· Org Policy Â· Assignments Â· Rotations
 */
import React, { useState, useEffect } from 'react';
import {
  Layers, Settings, UserCheck, RefreshCw, Plus, Pencil, Trash2,
  Clock, Sun, Moon, Sunset, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Save, X, ArrowRight, Users, Calendar,
  Zap, Shield, RotateCcw, Timer, Coffee,
} from 'lucide-react';
import useShifts from '../hooks/useShifts';
import { useTheme } from '../context/ThemeContext';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import axios from 'axios';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SHIFT_TYPES = [
  { value: 'morning',   label: 'Morning',   icon: Sun,      color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { value: 'afternoon', label: 'Afternoon', icon: Sun,      color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { value: 'evening',   label: 'Evening',   icon: Sunset,   color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { value: 'night',     label: 'Night',     icon: Moon,     color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { value: 'flexible',  label: 'Flexible',  icon: Zap,      color: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-900/20' },
  { value: 'custom',    label: 'Custom',    icon: Layers,   color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
];

const HOUR_OPTIONS = [8, 10, 12];

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280',
];

const ASSIGNMENT_TYPE_COLORS = {
  fixed:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rotated:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  temporary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatTime(t) {
  if (!t) return 'â€”';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

/** Convert HH:MM to fraction-of-day (0â€“1) for the timeline bar */
function timeFraction(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h * 60 + m) / (24 * 60);
}

// â”€â”€â”€ Empty form factories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyShift = () => ({
  shift_name: '', shift_type: 'custom',
  start_time: '09:00', end_time: '17:00', total_hours: 8,
  grace_period_minutes: 10, early_exit_threshold_minutes: 15,
  min_hours_for_present: '', min_hours_for_half_day: '',
  is_night_shift: false, shift_color: '#3b82f6',
  break_policy: { break_duration_minutes: 30, paid_break: true, max_breaks: 1, break_after_hours: 4 },
  notes: '',
});

const emptyAssignment = () => ({
  user_id: '', shift_id: '',
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: '', assignment_type: 'fixed', notes: '',
});

const emptyRotation = () => ({
  rule_name: '', cadence: 'weekly',
  rotation_start: new Date().toISOString().slice(0, 10),
  rotation_end: '', user_ids: [], shift_sequence: [], notes: '',
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SHARED UI PRIMITIVES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1 leading-relaxed">{message}</span>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"><X size={14} /></button>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5 gap-3">
      <div>
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
        {subtitle && <p className="text-xs mt-0.5 opacity-60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
        <Icon size={22} className="text-gray-400 dark:text-gray-500" />
      </div>
      <p className="font-medium text-sm mb-1">{title}</p>
      <p className="text-xs opacity-50 mb-4 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c} type="button"
          onClick={() => onChange(c)}
          className="relative w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
          style={{ backgroundColor: c }}
        >
          {value === c && (
            <span className="absolute inset-0 flex items-center justify-center">
              <CheckCircle size={14} className="text-white drop-shadow" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Visual 24-hour bar showing where a shift falls in the day */
function ShiftTimeBar({ startTime, endTime, isNight, color }) {
  const start = timeFraction(startTime);
  const end = timeFraction(endTime);
  const width = isNight
    ? (1 - start + end) * 100
    : Math.max(2, (end - start) * 100);
  const left = start * 100;

  return (
    <div className="relative h-1.5 rounded-full bg-gray-200 dark:bg-white/10 mt-2 overflow-hidden">
      <div
        className="absolute top-0 h-full rounded-full opacity-80"
        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Shared input / label classes builder
function useFormStyles(theme) {
  return {
    input: `w-full px-3 py-2 rounded-lg border text-sm transition-colors
      ${theme.border} ${theme.surface} ${theme.text}
      focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`,
    label: `block text-xs font-medium mb-1.5 ${theme.textSecondary}`,
    section: `p-4 rounded-xl border ${theme.border} bg-black/[0.02] dark:bg-white/[0.02]`,
  };
}

// â”€â”€â”€ Primary action button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PrimaryBtn({ children, onClick, type = 'button', disabled, loading: isLoading }) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled || isLoading}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, type = 'button', theme }) {
  return (
    <button
      type={type} onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${theme.border} ${theme.text} hover:bg-black/5 dark:hover:bg-white/5`}
    >
      {children}
    </button>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SHIFT FORM MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function ShiftFormModal({ shift, onSave, onClose, theme }) {
  const [form, setForm] = useState(shift ? { ...shift } : emptyShift());
  const [saving, setSaving] = useState(false);
  const { input, label, section } = useFormStyles(theme);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setBreak = (k, v) => setForm((f) => ({ ...f, break_policy: { ...f.break_policy, [k]: v } }));

  const selectedType = SHIFT_TYPES.find((t) => t.value === form.shift_type) || SHIFT_TYPES[5];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        min_hours_for_present: form.min_hours_for_present === '' ? null : Number(form.min_hours_for_present),
        min_hours_for_half_day: form.min_hours_for_half_day === '' ? null : Number(form.min_hours_for_half_day),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl ${theme.surface} border ${theme.border} max-h-[92vh] flex flex-col`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${selectedType.bg}`}>
              <selectedType.icon size={16} className={selectedType.color} />
            </div>
            <div>
              <h2 className={`font-semibold text-base ${theme.text}`}>{shift ? 'Edit Shift' : 'New Shift Template'}</h2>
              <p className={`text-xs ${theme.textSecondary}`}>{shift ? 'Update shift configuration' : 'Define a reusable shift pattern'}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${theme.textSecondary}`}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={label}>Shift Name *</label>
              <input className={input} value={form.shift_name} onChange={(e) => set('shift_name', e.target.value)} required placeholder="e.g. Morning Shift A" />
            </div>
            <div>
              <label className={label}>Shift Type</label>
              <select className={input} value={form.shift_type} onChange={(e) => set('shift_type', e.target.value)}>
                {SHIFT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Duration *</label>
              <div className="flex gap-2">
                {HOUR_OPTIONS.map((h) => (
                  <button key={h} type="button"
                    onClick={() => set('total_hours', h)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.total_hours === h
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : `${theme.border} ${theme.text} hover:bg-black/5 dark:hover:bg-white/5`
                    }`}
                  >{h}h</button>
                ))}
              </div>
            </div>
          </div>

          {/* Time range */}
          <div className={section}>
            <p className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${theme.textSecondary}`}>
              <Timer size={12} /> Schedule Window
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Start Time *</label>
                <input type="time" className={input} value={form.start_time} onChange={(e) => set('start_time', e.target.value)} required />
              </div>
              <div>
                <label className={label}>End Time *</label>
                <input type="time" className={input} value={form.end_time} onChange={(e) => set('end_time', e.target.value)} required />
              </div>
            </div>
            <ShiftTimeBar startTime={form.start_time} endTime={form.end_time} isNight={form.is_night_shift} color={form.shift_color} />
            <div className="flex items-center gap-2 mt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => set('is_night_shift', !form.is_night_shift)}
                  className={`relative w-8 h-4.5 rounded-full transition-colors ${form.is_night_shift ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-white/20'}`}
                  style={{ height: '18px', width: '34px' }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${form.is_night_shift ? 'translate-x-4' : ''}`} style={{ width: '14px', height: '14px' }} />
                </div>
                <span className={`text-xs ${theme.text}`}>Night shift â€” spans midnight</span>
              </label>
            </div>
          </div>

          {/* Tolerance */}
          <div className={section}>
            <p className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${theme.textSecondary}`}>
              <Shield size={12} /> Tolerance Rules
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Grace Period (min)</label>
                <input type="number" min={0} max={60} className={input} value={form.grace_period_minutes} onChange={(e) => set('grace_period_minutes', Number(e.target.value))} />
                <p className={`text-xs mt-1 ${theme.textSecondary}`}>Late arrival forgiveness</p>
              </div>
              <div>
                <label className={label}>Early Exit (min)</label>
                <input type="number" min={0} className={input} value={form.early_exit_threshold_minutes} onChange={(e) => set('early_exit_threshold_minutes', Number(e.target.value))} />
                <p className={`text-xs mt-1 ${theme.textSecondary}`}>Minutes before end that flags early exit</p>
              </div>
              <div>
                <label className={label}>Present threshold (h)</label>
                <input type="number" step="0.5" min={0} className={input} value={form.min_hours_for_present} onChange={(e) => set('min_hours_for_present', e.target.value)} placeholder={`â‰ˆ ${(form.total_hours * 0.9).toFixed(1)}h`} />
              </div>
              <div>
                <label className={label}>Half-day threshold (h)</label>
                <input type="number" step="0.5" min={0} className={input} value={form.min_hours_for_half_day} onChange={(e) => set('min_hours_for_half_day', e.target.value)} placeholder={`â‰ˆ ${(form.total_hours * 0.5).toFixed(1)}h`} />
              </div>
            </div>
          </div>

          {/* Break Policy */}
          <div className={section}>
            <p className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${theme.textSecondary}`}>
              <Coffee size={12} /> Break Policy
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Duration per break (min)</label>
                <input type="number" min={0} className={input} value={form.break_policy.break_duration_minutes} onChange={(e) => setBreak('break_duration_minutes', Number(e.target.value))} />
              </div>
              <div>
                <label className={label}>Max breaks / day</label>
                <input type="number" min={0} className={input} value={form.break_policy.max_breaks} onChange={(e) => setBreak('max_breaks', Number(e.target.value))} />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" className="rounded" checked={form.break_policy.paid_break} onChange={(e) => setBreak('paid_break', e.target.checked)} />
                  <span className={`text-sm ${theme.text}`}>Paid break <span className={`font-normal ${theme.textSecondary}`}>(not deducted from working hours)</span></span>
                </label>
              </div>
            </div>
          </div>

          {/* Colour + notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Shift Colour</label>
              <ColorPicker value={form.shift_color} onChange={(c) => set('shift_color', c)} />
            </div>
            <div>
              <label className={label}>Notes</label>
              <textarea className={`${input} resize-none`} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-1 border-t border-inherit">
            <GhostBtn type="button" onClick={onClose} theme={theme}>Cancel</GhostBtn>
            <PrimaryBtn type="submit" loading={saving}>
              <Save size={14} />{saving ? 'Savingâ€¦' : (shift ? 'Update Shift' : 'Create Shift')}
            </PrimaryBtn>
          </div>

        </form>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TAB: SHIFTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function ShiftsTab({ hooks, theme }) {
  const { shifts, createShift, updateShift, deleteShift, loading, error, setError } = hooks;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = async (payload) => {
    if (editing) await updateShift(editing._id, payload);
    else await createShift(payload);
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div>
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SectionHeader
        title="Shift Templates"
        subtitle="Define reusable shift patterns. These become the building blocks for assignments and rotations."
        action={
          <PrimaryBtn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Shift
          </PrimaryBtn>
        }
      />

      {shifts.length === 0 && !loading ? (
        <EmptyState
          icon={Clock}
          title="No shifts defined yet"
          description="Create your first shift template to get started with shift-wise attendance tracking."
          action={
            <PrimaryBtn onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={14} /> Create First Shift
            </PrimaryBtn>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shifts.map((s) => {
            const typeInfo = SHIFT_TYPES.find((t) => t.value === s.shift_type) || SHIFT_TYPES[5];
            const TypeIcon = typeInfo.icon;
            return (
              <div
                key={s._id}
                className={`group rounded-2xl border ${theme.border} ${theme.surface} p-5 hover:shadow-md transition-shadow relative overflow-hidden`}
              >
                {/* Color accent strip */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: s.shift_color }} />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${typeInfo.bg} shrink-0`}>
                      <TypeIcon size={15} className={typeInfo.color} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm leading-tight ${theme.text}`}>{s.shift_name}</p>
                      <p className={`text-xs capitalize mt-0.5 ${theme.textSecondary}`}>{s.shift_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(s); setShowForm(true); }}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${theme.textSecondary} transition-colors`}
                    ><Pencil size={13} /></button>
                    <button
                      onClick={() => deleteShift(s._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    ><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Time display */}
                <div className={`flex items-center gap-1.5 text-sm font-medium ${theme.text}`}>
                  <span>{formatTime(s.start_time)}</span>
                  <ArrowRight size={13} className={theme.textSecondary} />
                  <span>{formatTime(s.end_time)}</span>
                </div>
                <ShiftTimeBar startTime={s.start_time} endTime={s.end_time} isNight={s.is_night_shift} color={s.shift_color} />

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge color="blue">{s.total_hours}h shift</Badge>
                  {s.is_night_shift && <Badge color="indigo">Night</Badge>}
                  <Badge color="gray">{s.grace_period_minutes}m grace</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ShiftFormModal
          shift={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          theme={theme}
        />
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TAB: ORG POLICY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function PolicyTab({ hooks, theme }) {
  const { shifts, policy, allPolicies, fetchPolicy, fetchAllPolicies, savePolicy, loading, error, setError } = hooks;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    policy_name: '', shift_mode: 'single', allowed_hours: [8], shift_slots: [],
    overtime_enabled: false, overtime_threshold_hours: 0, overtime_rate_multiplier: 1.5,
    rotation_enabled: false, notes: '',
  });
  const { input, label, section } = useFormStyles(theme);

  useEffect(() => { fetchPolicy(); fetchAllPolicies(); }, []);

  const toggleHour = (h) => setForm((f) => ({
    ...f,
    allowed_hours: f.allowed_hours.includes(h) ? f.allowed_hours.filter((x) => x !== h) : [...f.allowed_hours, h],
  }));

  const modeConfig = {
    single: { slots: 1, icon: Clock,   color: 'blue',   desc: 'All employees share one shift' },
    double: { slots: 2, icon: Users,   color: 'purple', desc: 'Day & evening split shifts' },
    triple: { slots: 3, icon: Layers,  color: 'amber',  desc: 'Round-the-clock three-shift system' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await savePolicy(form);
    setShowForm(false);
    fetchPolicy();
    fetchAllPolicies();
  };

  return (
    <div>
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SectionHeader
        title="Organisation Shift Policy"
        subtitle="Set how many concurrent shifts your org runs and which hour presets are allowed."
        action={
          <PrimaryBtn onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> New Policy
          </PrimaryBtn>
        }
      />

      {/* Active policy */}
      {policy ? (
        <div className={`mb-6 rounded-2xl border-2 border-green-200 dark:border-green-800/50 p-5 bg-green-50/50 dark:bg-green-950/20`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle size={15} className="text-green-600 dark:text-green-400" />
            </div>
            <span className={`font-semibold text-sm ${theme.text}`}>{policy.policy_name}</span>
            <Badge color="green">Active</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Mode',       value: policy.shift_mode,                                    icon: Layers },
              { label: 'Hours',      value: policy.allowed_hours?.join(', ') + 'h',               icon: Clock },
              { label: 'Overtime',   value: policy.overtime_enabled ? 'Enabled' : 'Disabled',     icon: Zap },
              { label: 'Rotation',   value: policy.rotation_enabled ? 'Enabled' : 'Disabled',     icon: RefreshCw },
            ].map(({ label: lbl, value, icon: Icon }) => (
              <div key={lbl} className={`rounded-xl p-3 ${theme.surface} border ${theme.border}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className={theme.textSecondary} />
                  <span className={`text-xs ${theme.textSecondary}`}>{lbl}</span>
                </div>
                <p className={`font-semibold text-sm capitalize ${theme.text}`}>{value}</p>
              </div>
            ))}
          </div>

          {policy.shift_slots?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {policy.shift_slots.map((slot) => (
                <div key={slot.slot_label} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${theme.border} ${theme.surface}`}>
                  <span className={`font-medium ${theme.text}`}>Slot {slot.slot_label}</span>
                  <ArrowRight size={10} className={theme.textSecondary} />
                  <span className={theme.textSecondary}>{slot.shift_id?.shift_name || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !showForm ? (
        <div className={`mb-6 rounded-2xl border-2 border-dashed ${theme.border} p-6 text-center`}>
          <p className={`text-sm ${theme.textSecondary}`}>No active policy. Create one to govern shift assignments.</p>
        </div>
      ) : null}

      {/* New policy form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`mb-6 rounded-2xl border ${theme.border} overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${theme.border} ${theme.surface} flex items-center justify-between`}>
            <div>
              <h4 className={`font-semibold text-sm ${theme.text}`}>New Policy Draft</h4>
              <p className={`text-xs ${theme.textSecondary}`}>Will deactivate the current active policy on save</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${theme.textSecondary}`}><X size={15} /></button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className={label}>Policy Name *</label>
              <input className={input} required value={form.policy_name} onChange={(e) => setForm((f) => ({ ...f, policy_name: e.target.value }))} placeholder="e.g. Q2 2026 Double Shift" />
            </div>

            {/* Mode selector â€” cards */}
            <div>
              <label className={label}>Shift Mode *</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(modeConfig).map(([mode, cfg]) => {
                  const ModeIcon = cfg.icon;
                  const isSelected = form.shift_mode === mode;
                  return (
                    <button
                      key={mode} type="button"
                      onClick={() => setForm((f) => ({ ...f, shift_mode: mode, shift_slots: [] }))}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : `${theme.border} hover:border-blue-300 dark:hover:border-blue-700`
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2">
                          <CheckCircle size={13} className="text-blue-500" />
                        </span>
                      )}
                      <ModeIcon size={18} className={isSelected ? 'text-blue-500' : theme.textSecondary} />
                      <div>
                        <p className={`text-xs font-semibold capitalize ${isSelected ? 'text-blue-600 dark:text-blue-400' : theme.text}`}>{mode}</p>
                        <p className={`text-xs mt-0.5 ${theme.textSecondary}`}>{cfg.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hour presets */}
            <div>
              <label className={label}>Allowed Hour Presets</label>
              <div className="flex gap-2">
                {HOUR_OPTIONS.map((h) => (
                  <button key={h} type="button"
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.allowed_hours.includes(h)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : `${theme.border} ${theme.text} hover:bg-black/5 dark:hover:bg-white/5`
                    }`}
                    onClick={() => toggleHour(h)}>{h}h</button>
                ))}
              </div>
            </div>

            {/* Slot assignments */}
            <div>
              <label className={label}>Shift Slot Assignments</label>
              <div className="space-y-2">
                {['A', 'B', 'C'].slice(0, modeConfig[form.shift_mode].slots).map((slotLabel) => {
                  const slot = form.shift_slots.find((s) => s.slot_label === slotLabel);
                  return (
                    <div key={slotLabel} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-14 shrink-0 ${theme.textSecondary}`}>Slot {slotLabel}</span>
                      <select
                        className={`${input} flex-1`}
                        value={slot?.shift_id || ''}
                        onChange={(e) => {
                          const updated = form.shift_slots.filter((s) => s.slot_label !== slotLabel);
                          if (e.target.value) updated.push({ slot_label: slotLabel, shift_id: e.target.value });
                          setForm((f) => ({ ...f, shift_slots: updated }));
                        }}
                      >
                        <option value="">â€” Select shift â€”</option>
                        {shifts.map((s) => <option key={s._id} value={s._id}>{s.shift_name}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'overtime_enabled', label: 'Overtime Tracking', icon: Zap },
                { key: 'rotation_enabled', label: 'Shift Rotation',   icon: RefreshCw },
              ].map(({ key, label: lbl, icon: Icon }) => (
                <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${theme.border} ${form[key] ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50' : ''}`}>
                  <div className={`p-1.5 rounded-lg ${form[key] ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-white/5'}`}>
                    <Icon size={13} className={form[key] ? 'text-blue-500' : theme.textSecondary} />
                  </div>
                  <span className={`text-sm flex-1 ${theme.text}`}>{lbl}</span>
                  <input type="checkbox" className="rounded" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <GhostBtn type="button" onClick={() => setShowForm(false)} theme={theme}>Cancel</GhostBtn>
              <PrimaryBtn type="submit" loading={loading}>
                <CheckCircle size={14} />{loading ? 'Savingâ€¦' : 'Activate Policy'}
              </PrimaryBtn>
            </div>
          </div>
        </form>
      )}

      {/* Policy history */}
      {allPolicies.length > 0 && (
        <div>
          <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${theme.textSecondary}`}>Policy History</h4>
          <div className="space-y-2">
            {allPolicies.map((p) => (
              <div key={p._id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${theme.border} ${p.is_active ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2.5">
                  {p.is_active
                    ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                    : <XCircle size={14} className="text-gray-400 shrink-0" />}
                  <span className={`text-sm ${theme.text}`}>{p.policy_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={p.shift_mode === 'single' ? 'blue' : p.shift_mode === 'double' ? 'purple' : 'amber'}>
                    {p.shift_mode}
                  </Badge>
                  {p.is_active && <Badge color="green">Active</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TAB: ASSIGNMENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function AssignmentsTab({ hooks, theme }) {
  const { shifts, assignments, fetchAssignments, assignShift, updateAssignment, deleteAssignment, loading, error, setError } = hooks;
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAssignment());
  const [search, setSearch] = useState('');
  const { input, label } = useFormStyles(theme);

  useEffect(() => {
    fetchAssignments();
    axios.get('/api/users', { withCredentials: true })
      .then((r) => setUsers(r.data?.users || r.data || []))
      .catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...form, effective_to: form.effective_to || null };
    if (editing) await updateAssignment(editing._id, payload);
    else await assignShift(payload);
    setShowForm(false);
    setEditing(null);
    setForm(emptyAssignment());
  };

  const filtered = assignments.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (a.user_id?.full_name || a.user_id?.name || '').toLowerCase().includes(s) ||
      (a.shift_id?.shift_name || '').toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SectionHeader
        title="Employee Shift Assignments"
        subtitle="Link employees to specific shifts with effective date ranges."
        action={
          <PrimaryBtn onClick={() => { setEditing(null); setForm(emptyAssignment()); setShowForm(true); }}>
            <Plus size={14} /> Assign Shift
          </PrimaryBtn>
        }
      />

      {/* Inline form */}
      {showForm && (
        <div className={`mb-6 rounded-2xl border ${theme.border} overflow-hidden`}>
          <div className={`px-5 py-3.5 border-b ${theme.border} flex items-center justify-between ${theme.surface}`}>
            <span className={`text-sm font-semibold ${theme.text}`}>{editing ? 'Edit Assignment' : 'New Assignment'}</span>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${theme.textSecondary}`}><X size={15} /></button>
          </div>
          <form onSubmit={handleSave} className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Employee *</label>
                <select className={input} required value={form.user_id} onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}>
                  <option value="">â€” Select employee â€”</option>
                  {users.map((u) => <option key={u._id} value={u._id}>{u.full_name || u.name} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Shift *</label>
                <select className={input} required value={form.shift_id} onChange={(e) => setForm((f) => ({ ...f, shift_id: e.target.value }))}>
                  <option value="">â€” Select shift â€”</option>
                  {shifts.map((s) => <option key={s._id} value={s._id}>{s.shift_name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Effective From *</label>
                <input type="date" className={input} required value={form.effective_from} onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Effective To <span className={theme.textSecondary}>(blank = open-ended)</span></label>
                <input type="date" className={input} value={form.effective_to} onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Assignment Type</label>
                <select className={input} value={form.assignment_type} onChange={(e) => setForm((f) => ({ ...f, assignment_type: e.target.value }))}>
                  <option value="fixed">Fixed</option>
                  <option value="rotated">Rotated</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
              <div>
                <label className={label}>Notes</label>
                <input className={input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional noteâ€¦" />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-4">
              <GhostBtn type="button" onClick={() => { setShowForm(false); setEditing(null); }} theme={theme}>Cancel</GhostBtn>
              <PrimaryBtn type="submit" loading={loading}><Save size={14} />{loading ? 'Savingâ€¦' : 'Save Assignment'}</PrimaryBtn>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      {assignments.length > 0 && (
        <div className="mb-3">
          <input
            className={`${input} max-w-xs`}
            placeholder="Search employee or shiftâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      {assignments.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No assignments yet"
          description="Assign shifts to employees so the system knows when to expect them."
          action={
            <PrimaryBtn onClick={() => { setEditing(null); setForm(emptyAssignment()); setShowForm(true); }}>
              <Plus size={14} /> Create First Assignment
            </PrimaryBtn>
          }
        />
      ) : (
        <div className={`rounded-2xl border ${theme.border} overflow-hidden`}>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className={`border-b ${theme.border}`}>
                {['Employee', 'Shift', 'Period', 'Type', ''].map((h) => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className={`px-4 py-8 text-center text-sm ${theme.textSecondary}`}>No results for "{search}"</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a._id} className={`${theme.hover} group`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(a.user_id?.full_name || a.user_id?.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${theme.text}`}>{a.user_id?.full_name || a.user_id?.name || 'â€”'}</p>
                          <p className={`text-xs ${theme.textSecondary}`}>{a.user_id?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.shift_id?.shift_color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.shift_id.shift_color }} />}
                        <span className={`text-sm ${theme.text}`}>{a.shift_id?.shift_name || 'â€”'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm ${theme.text}`}>
                        {a.effective_from ? new Date(a.effective_from).toLocaleDateString() : 'â€”'}
                        <span className={theme.textSecondary}> â†’ </span>
                        {a.effective_to ? new Date(a.effective_to).toLocaleDateString() : <span className="text-green-600 dark:text-green-400">Open</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ASSIGNMENT_TYPE_COLORS[a.assignment_type] || 'bg-gray-100 text-gray-600'}`}>
                        {a.assignment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditing(a); setForm({ user_id: a.user_id?._id||'', shift_id: a.shift_id?._id||'', effective_from: a.effective_from?.slice(0,10)||'', effective_to: a.effective_to?.slice(0,10)||'', assignment_type: a.assignment_type, notes: a.notes||'' }); setShowForm(true); }}
                          className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${theme.textSecondary}`}
                        ><Pencil size={12} /></button>
                        <button
                          onClick={() => deleteAssignment(a._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        ><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TAB: ROTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function RotationsTab({ hooks, theme }) {
  const { shifts, rotations, fetchRotations, createRotation, deleteRotation, loading, error, setError } = hooks;
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyRotation());
  const [expanded, setExpanded] = useState(null);
  const { input, label } = useFormStyles(theme);

  useEffect(() => {
    fetchRotations();
    axios.get('/api/users', { withCredentials: true })
      .then((r) => setUsers(r.data?.users || r.data || []))
      .catch(() => {});
  }, []);

  const addSlot = () => setForm((f) => ({
    ...f,
    shift_sequence: [...f.shift_sequence, { slot_order: f.shift_sequence.length, shift_id: '', slot_label: '' }],
  }));
  const removeSlot = (i) => setForm((f) => ({
    ...f,
    shift_sequence: f.shift_sequence.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, slot_order: idx })),
  }));
  const updateSlot = (i, key, val) => setForm((f) => ({
    ...f,
    shift_sequence: f.shift_sequence.map((s, idx) => idx === i ? { ...s, [key]: val } : s),
  }));
  const toggleUser = (id) => setForm((f) => ({
    ...f,
    user_ids: f.user_ids.includes(id) ? f.user_ids.filter((u) => u !== id) : [...f.user_ids, id],
  }));

  const handleSave = async (e) => {
    e.preventDefault();
    await createRotation(form);
    setShowForm(false);
    setForm(emptyRotation());
  };

  const cadenceColors = { daily: 'blue', weekly: 'purple', monthly: 'amber' };

  return (
    <div>
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SectionHeader
        title="Rotation Rules"
        subtitle="Automate shift cycling for employees on a daily, weekly, or monthly cadence."
        action={
          <PrimaryBtn onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> New Rotation
          </PrimaryBtn>
        }
      />

      {/* New rotation form */}
      {showForm && (
        <form onSubmit={handleSave} className={`mb-6 rounded-2xl border ${theme.border} overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${theme.border} flex items-center justify-between ${theme.surface}`}>
            <div>
              <h4 className={`font-semibold text-sm ${theme.text}`}>New Rotation Rule</h4>
              <p className={`text-xs ${theme.textSecondary}`}>Define the cycle and assign employees</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${theme.textSecondary}`}><X size={15} /></button>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={label}>Rule Name *</label>
                <input className={input} required value={form.rule_name} onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))} placeholder="e.g. 3-week rotating cycle" />
              </div>
              <div>
                <label className={label}>Rotation Cadence *</label>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly'].map((c) => (
                    <button key={c} type="button"
                      onClick={() => setForm((f) => ({ ...f, cadence: c }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                        form.cadence === c
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : `${theme.border} ${theme.text} hover:bg-black/5 dark:hover:bg-white/5`
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label}>Rotation Starts *</label>
                <input type="date" className={input} required value={form.rotation_start} onChange={(e) => setForm((f) => ({ ...f, rotation_start: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Rotation Ends <span className={theme.textSecondary}>(optional)</span></label>
                <input type="date" className={input} value={form.rotation_end} onChange={(e) => setForm((f) => ({ ...f, rotation_end: e.target.value }))} />
              </div>
            </div>

            {/* Shift sequence builder */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={label + ' mb-0'}>Shift Cycle Sequence</label>
                <button type="button" onClick={addSlot} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  <Plus size={12} /> Add slot
                </button>
              </div>

              {form.shift_sequence.length === 0 ? (
                <div className={`rounded-xl border-2 border-dashed ${theme.border} p-4 text-center`}>
                  <p className={`text-xs ${theme.textSecondary}`}>Add at least 2 shifts to build the rotation cycle</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.shift_sequence.map((slot, i) => {
                    const shiftInfo = shifts.find((s) => s._id === slot.shift_id);
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${theme.border}`}>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <select
                          className={`${input} flex-1`}
                          value={slot.shift_id}
                          onChange={(e) => updateSlot(i, 'shift_id', e.target.value)}
                        >
                          <option value="">â€” Select shift â€”</option>
                          {shifts.map((s) => <option key={s._id} value={s._id}>{s.shift_name}</option>)}
                        </select>
                        {shiftInfo && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: shiftInfo.shift_color }} />
                            <span className={`text-xs ${theme.textSecondary}`}>{formatTime(shiftInfo.start_time)}</span>
                          </div>
                        )}
                        <input
                          className={`${input} w-24 shrink-0`}
                          placeholder="Label"
                          value={slot.slot_label}
                          onChange={(e) => updateSlot(i, 'slot_label', e.target.value)}
                        />
                        <button type="button" onClick={() => removeSlot(i)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 shrink-0"><X size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              {form.shift_sequence.length > 0 && form.shift_sequence.length < 2 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle size={11} /> Add at least 2 slots for a valid rotation.
                </p>
              )}
              {/* Visual cycle preview */}
              {form.shift_sequence.filter((s) => s.shift_id).length >= 2 && (
                <div className={`mt-3 flex items-center gap-1.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30 overflow-x-auto`}>
                  {form.shift_sequence.map((slot, i) => {
                    const s = shifts.find((sh) => sh._id === slot.shift_id);
                    return (
                      <React.Fragment key={i}>
                        <div className="flex items-center gap-1.5 shrink-0 text-xs">
                          {s && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.shift_color }} />}
                          <span className="font-medium text-blue-700 dark:text-blue-300">{s?.shift_name || '?'}</span>
                        </div>
                        {i < form.shift_sequence.length - 1 && <ArrowRight size={11} className="text-blue-400 shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                  <RotateCcw size={11} className="text-blue-400 shrink-0 ml-0.5" />
                </div>
              )}
            </div>

            {/* Employee selection */}
            <div>
              <label className={label}>Employees in this rotation ({form.user_ids.length} selected)</label>
              <div className={`max-h-40 overflow-y-auto rounded-xl border ${theme.border} divide-y divide-inherit`}>
                {users.length === 0 ? (
                  <p className={`px-3 py-4 text-center text-xs ${theme.textSecondary}`}>Loading employeesâ€¦</p>
                ) : (
                  users.map((u) => {
                    const checked = form.user_ids.includes(u._id);
                    return (
                      <label key={u._id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}`}>
                        <input type="checkbox" className="rounded shrink-0" checked={checked} onChange={() => toggleUser(u._id)} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${theme.text}`}>{u.full_name || u.name}</p>
                          <p className={`text-xs truncate ${theme.textSecondary}`}>{u.email}</p>
                        </div>
                        {checked && <CheckCircle size={13} className="text-blue-500 shrink-0" />}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <GhostBtn type="button" onClick={() => setShowForm(false)} theme={theme}>Cancel</GhostBtn>
              <PrimaryBtn type="submit" loading={loading} disabled={form.shift_sequence.filter((s) => s.shift_id).length < 2}>
                <RefreshCw size={14} />{loading ? 'Savingâ€¦' : 'Create Rule'}
              </PrimaryBtn>
            </div>
          </div>
        </form>
      )}

      {/* Rotation cards */}
      {rotations.length === 0 && !loading ? (
        <EmptyState
          icon={RefreshCw}
          title="No rotation rules yet"
          description="Rotation rules automatically cycle employees through shifts on a daily, weekly, or monthly schedule."
          action={
            <PrimaryBtn onClick={() => setShowForm(true)}>
              <Plus size={14} /> Create First Rotation
            </PrimaryBtn>
          }
        />
      ) : (
        <div className="space-y-3">
          {rotations.map((r) => {
            const isExpanded = expanded === r._id;
            return (
              <div key={r._id} className={`rounded-2xl border ${theme.border} ${theme.surface} overflow-hidden`}>
                <div
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer ${theme.hover} transition-colors`}
                  onClick={() => setExpanded(isExpanded ? null : r._id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl ${r.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-white/5'}`}>
                      <RefreshCw size={14} className={r.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${theme.text}`}>{r.rule_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge color={cadenceColors[r.cadence] || 'gray'}>{r.cadence}</Badge>
                        <span className={`text-xs ${theme.textSecondary}`}>{r.user_ids?.length || 0} employees Â· {r.shift_sequence?.length || 0} shifts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRotation(r._id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    ><Trash2 size={13} /></button>
                    <div className={`p-1 ${theme.textSecondary}`}>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className={`border-t ${theme.border} px-5 pb-5 pt-4 space-y-4`}>
                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar size={12} className={theme.textSecondary} />
                      <span className={theme.textSecondary}>
                        {new Date(r.rotation_start).toLocaleDateString()}
                        {r.rotation_end ? ` â†’ ${new Date(r.rotation_end).toLocaleDateString()}` : ' â†’ ongoing'}
                      </span>
                    </div>

                    {/* Shift cycle */}
                    {r.shift_sequence?.length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold mb-2 ${theme.textSecondary}`}>Cycle</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[...r.shift_sequence].sort((a, b) => a.slot_order - b.slot_order).map((slot, i) => (
                            <React.Fragment key={i}>
                              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${theme.border}`}>
                                {slot.shift_id?.shift_color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slot.shift_id.shift_color }} />}
                                <span className={theme.text}>{slot.shift_id?.shift_name || slot.slot_label || '?'}</span>
                                {slot.shift_id?.start_time && <span className={theme.textSecondary}>{formatTime(slot.shift_id.start_time)}</span>}
                              </div>
                              {i < r.shift_sequence.length - 1 && <ArrowRight size={11} className={theme.textSecondary} />}
                            </React.Fragment>
                          ))}
                          <RotateCcw size={11} className={theme.textSecondary} />
                        </div>
                      </div>
                    )}

                    {/* Employees */}
                    {r.user_ids?.length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold mb-2 ${theme.textSecondary}`}>Employees</p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.user_ids.map((u) => (
                            <span key={u._id || u} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${theme.border}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {u.full_name || u.name || 'Unknown'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  MAIN PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const TABS = [
  { id: 'shifts',      label: 'Shifts',       icon: Clock,      desc: 'Define templates' },
  { id: 'policy',      label: 'Org Policy',   icon: Shield,     desc: 'Global config' },
  { id: 'assignments', label: 'Assignments',  icon: UserCheck,  desc: 'Employee â†” shift' },
  { id: 'rotations',   label: 'Rotations',    icon: RefreshCw,  desc: 'Cycle rules' },
];

/** Embeddable panel — used inside AttendancePage's "Shift Config" tab */
export function ShiftConfigPanel() {
  const { currentTheme: theme } = useTheme();
  const [activeTab, setActiveTab] = useState('shifts');
  const hooks = useShifts();

  return (
    <div>
      {/* Sub-tab bar */}
      <div className={`flex gap-1 p-1 rounded-xl border ${theme.border} mb-6 overflow-x-auto bg-black/[0.02] dark:bg-white/[0.02]`}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                isActive
                  ? `bg-white dark:bg-white/10 shadow-sm ${theme.text}`
                  : `${theme.textSecondary} hover:bg-black/5 dark:hover:bg-white/5`
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className={`rounded-2xl border ${theme.border} ${theme.surface} p-6`}>
        {activeTab === 'shifts'      && <ShiftsTab      hooks={hooks} theme={theme} />}
        {activeTab === 'policy'      && <PolicyTab      hooks={hooks} theme={theme} />}
        {activeTab === 'assignments' && <AssignmentsTab hooks={hooks} theme={theme} />}
        {activeTab === 'rotations'   && <RotationsTab   hooks={hooks} theme={theme} />}
      </div>
    </div>
  );
}

export default function ShiftManagement() {
  const { currentTheme: theme } = useTheme();
  const [activeTab, setActiveTab] = useState('shifts');
  const hooks = useShifts();

  const activeTabInfo = TABS.find((t) => t.id === activeTab);

  return (
    <ResponsivePageLayout
      title="Shift Management"
      subtitle="Configure shifts, org policy, employee assignments, and rotation rules"
    >
      <div className="max-w-5xl mx-auto">

        {/* Tab bar */}
        <div className={`flex gap-1 p-1 rounded-xl border ${theme.border} mb-6 overflow-x-auto bg-black/[0.02] dark:bg-white/[0.02]`}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                  isActive
                    ? `bg-white dark:bg-white/10 shadow-sm ${theme.text}`
                    : `${theme.textSecondary} hover:bg-black/5 dark:hover:bg-white/5`
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content card */}
        <div className={`rounded-2xl border ${theme.border} ${theme.surface} p-6`}>
          {activeTab === 'shifts'      && <ShiftsTab      hooks={hooks} theme={theme} />}
          {activeTab === 'policy'      && <PolicyTab      hooks={hooks} theme={theme} />}
          {activeTab === 'assignments' && <AssignmentsTab hooks={hooks} theme={theme} />}
          {activeTab === 'rotations'   && <RotationsTab   hooks={hooks} theme={theme} />}
        </div>

      </div>
    </ResponsivePageLayout>
  );
}
