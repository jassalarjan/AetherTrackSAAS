/**
 * HRCalendar â€” HR Calendar with native Meeting Management integration.
 *
 * Architecture:
 *  - Attendance / leave / holiday data  â†’ existing /api/hr/calendar endpoint
 *  - Meetings                           â†’ /api/hr/meetings via useMeetings hook
 *  - Both layers merged into BigCalendar events
 *  - RBAC enforced at UI layer: only admin/hr roles see write controls
 *  - Drag-to-reschedule supported for admin/hr
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import api from '@/shared/services/axios';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import MeetingFormModal from '@/shared/components/ui/MeetingFormModal';
import MeetingDetailPanel from '@/shared/components/ui/MeetingDetailPanel';
import useMeetings, { MEETING_TYPE_COLORS, MEETING_TYPE_LABELS } from '@/shared/hooks/useMeetings';
import {
  Calendar as CalendarIcon, CheckCircle, XCircle,
  AlertCircle, X, Plus, RefreshCw, Video, ChevronDown
} from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer   = momentLocalizer(moment);

// â”€â”€ Roles with write access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MANAGER_ROLES = ['admin', 'hr'];

// â”€â”€ Colour map for non-meeting events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ATTENDANCE_COLORS = {
  present:  '#22c55e',
  absent:   '#dc2626',
  half_day: '#eab308',
  leave:    '#C4713A',
  holiday:  '#9333ea',
};

// â”€â”€ Legend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LEGEND = [
  { color: '#22c55e', label: 'Present' },
  { color: '#dc2626', label: 'Absent' },
  { color: '#eab308', label: 'Half Day' },
  { color: '#C4713A', label: 'Leave' },
  { color: '#9333ea', label: 'Holiday' },
  ...Object.entries(MEETING_TYPE_COLORS).map(([k, v]) => ({
    color: v, label: `Mtg: ${MEETING_TYPE_LABELS[k]}`, isDot: true
  })),
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HRCalendar({ embedded = false }) {
  const { user }                = useAuth();
  const { theme, currentTheme } = useTheme();
  const { isMobile, isMobileOpen, closeMobileSidebar } = useSidebar();
  const canManage               = MANAGER_ROLES.includes(user?.role);

  // â”€â”€ Attendance / leave / holiday state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [hrEvents, setHrEvents]     = useState([]);
  const [hrLoading, setHrLoading]   = useState(true);

  // â”€â”€ Calendar navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  // â”€â”€ Meeting hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const {
    calendarEvents: meetingEvents,
    loading: meetingLoading,
    saving,
    fetchMeetings,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    deleteMeeting,
  } = useMeetings();

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedDay,      setSelectedDay]      = useState(null);
  const [selectedMeeting,  setSelectedMeeting]  = useState(null);
  const [showForm,         setShowForm]          = useState(false);
  const [editingMeeting,   setEditingMeeting]    = useState(null);
  const [formDefaultStart, setFormDefaultStart]  = useState(null);
  const [typeFilter,       setTypeFilter]        = useState('');
  const [showLegend,       setShowLegend]        = useState(false);

  // â”€â”€ Date range helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getRangeFromView = useCallback((date, view) => {
    const m = moment(date);
    if (view === 'week')  return { start: m.clone().startOf('week').toDate(),  end: m.clone().endOf('week').toDate() };
    if (view === 'day')   return { start: m.clone().startOf('day').toDate(),   end: m.clone().endOf('day').toDate() };
    return { start: m.clone().startOf('month').toDate(), end: m.clone().endOf('month').toDate() };
  }, []);

  // â”€â”€ Load HR events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchHRData = useCallback(async (date) => {
    try {
      setHrLoading(true);
      const month = date.getMonth() + 1;
      const year  = date.getFullYear();
      const [calRes, attRes] = await Promise.all([
        api.get('/hr/calendar', { params: { month, year } }),
        api.get('/hr/attendance'),
      ]);

      const byDate = {};
      (attRes.data.records || []).forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = { present: 0, absent: 0, half_day: 0, leave: 0, holiday: 0 };
        byDate[r.date][r.status]++;
      });

      const events = [];
      Object.entries(byDate).forEach(([ds, counts]) => {
        const d = new Date(ds);
        Object.entries(counts).forEach(([type, count]) => {
          if (count > 0 && ATTENDANCE_COLORS[type]) {
            events.push({ id: `att-${type}-${ds}`, title: `${type.replace('_', ' ')}: ${count}`, start: d, end: d, allDay: true, resource: { type, data: { count, total: counts } } });
          }
        });
      });

      (calRes.data.events || []).forEach(ev => {
        if (ev.type === 'holiday') {
          events.push({ id: `holiday-${ev.date}`, title: ev.name || 'Holiday', start: new Date(ev.date), end: new Date(ev.date), allDay: true, resource: { type: 'holiday', data: ev } });
        }
      });

      setHrEvents(events);
    } catch (err) {
      console.error('HRCalendar fetchHRData:', err);
    } finally {
      setHrLoading(false);
    }
  }, []);

  // â”€â”€ Sync loads on navigation / filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    fetchHRData(currentDate);
    const { start, end } = getRangeFromView(currentDate, currentView);
    fetchMeetings({ start, end, type: typeFilter || undefined });
  }, [currentDate, currentView, typeFilter]);

  useEffect(() => {
    if (isMobile && isMobileOpen) {
      closeMobileSidebar();
    }
  }, [isMobile, isMobileOpen, closeMobileSidebar]);

  useEffect(() => {
    // Close any global overlays (shortcuts/command palette/modals) that may intercept clicks.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const neutralizeBackdrop = () => {
      document.querySelectorAll('.sidebar-backdrop').forEach((el) => {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0';
      });
    };

    neutralizeBackdrop();
    const observer = new MutationObserver(neutralizeBackdrop);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll('.sidebar-backdrop').forEach((el) => {
        el.style.pointerEvents = '';
        el.style.opacity = '';
      });
    };
  }, []);

  // â”€â”€ Merged event stream â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allEvents = [...hrEvents, ...meetingEvents];

  const toDayKey = useCallback((value) => moment(value).format('YYYY-MM-DD'), []);

  const getDayDetails = useCallback((date) => {
    const dayKey = toDayKey(date);

    const attendanceCounts = { present: 0, absent: 0, half_day: 0, leave: 0, holiday: 0 };
    const holidays = [];

    hrEvents.forEach((event) => {
      if (toDayKey(event.start) !== dayKey) return;
      if (event.resource?.type === 'holiday') {
        holidays.push(event.resource?.data);
      } else if (attendanceCounts[event.resource?.type] !== undefined) {
        attendanceCounts[event.resource.type] += Number(event.resource?.data?.count || 0);
      }
    });

    const meetings = meetingEvents
      .filter((event) => toDayKey(event.start) === dayKey)
      .map((event) => event.resource?.data)
      .filter(Boolean);

    return { date: new Date(date), attendanceCounts, holidays, meetings };
  }, [hrEvents, meetingEvents, toDayKey]);

  const openDayDetails = useCallback((date) => {
    setSelectedDay(getDayDetails(date));
    setSelectedMeeting(null);
  }, [getDayDetails]);

  // â”€â”€ Event colour getter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const eventStyleGetter = (event) => {
    const bg = event.resource?.type === 'meeting'
      ? (MEETING_TYPE_COLORS[event.resource.subtype] || '#6b7280')
      : (ATTENDANCE_COLORS[event.resource?.type]     || '#6b7280');
    return {
      style: {
        backgroundColor: bg,
        borderRadius: '4px',
        opacity: 0.95,
        color: 'white',
        border: 'none',
        fontWeight: '600',
        fontSize: '0.7rem',
        padding: '2px 6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      },
    };
  };

  // â”€â”€ Click handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSelectEvent = (event) => {
    if (event.resource?.type === 'meeting') {
      setSelectedMeeting(event.resource.data);
      return;
    }
    openDayDetails(event.start);
  };

  const handleSelectSlot = ({ start }) => {
    openDayDetails(start);
  };

  // â”€â”€ Drag-to-reschedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€ Form save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveMeeting = async (payload) => {
    if (editingMeeting) return updateMeeting(editingMeeting._id, payload);
    const result = await createMeeting(payload);
    if (result.success) {
      const { start, end } = getRangeFromView(currentDate, currentView);
      fetchMeetings({ start, end });
    }
    return result;
  };

  const loading = hrLoading || meetingLoading;

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const calendarContent = (
    <div className="space-y-4 relative pointer-events-auto isolate">

      {/* Toolbar */}
      <div className={`relative flex flex-wrap items-center gap-3 p-3 rounded-xl border ${currentTheme.surface} ${currentTheme.border}`}>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className={`pl-3 pr-8 py-2 text-sm rounded-lg border appearance-none cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-700'} focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            <option value="">All meeting types</option>
            {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${currentTheme.textSecondary}`} />
        </div>

        <button
          onClick={() => setShowLegend(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          <div className="flex gap-1">
            {Object.values(ATTENDANCE_COLORS).slice(0, 3).map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />)}
          </div>
          Legend
        </button>

        <div className="flex-1" />

        <button
          onClick={() => { fetchHRData(currentDate); const r = getRangeFromView(currentDate, currentView); fetchMeetings({ start: r.start, end: r.end }); }}
          className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => openDayDetails(currentDate)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          Day Details
        </button>

        {canManage && (
          <button
            onClick={() => { setEditingMeeting(null); setFormDefaultStart(new Date()); setShowForm(true); }}
            className="aether-btn aether-btn-primary"
          >
            <Plus className="w-4 h-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className={`p-4 rounded-xl border ${currentTheme.surface} ${currentTheme.border}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${currentTheme.textSecondary}`}>Calendar Legend</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGEND.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={item.isDot ? 'w-2.5 h-2.5 rounded-full' : 'w-3 h-3 rounded-sm'} style={{ background: item.color }} />
                <span className={`text-xs ${currentTheme.textSecondary}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      {loading ? (
        <div className={`rounded-xl border ${currentTheme.surface} ${currentTheme.border} py-4`}>
          <div className="flex min-h-[180px] items-center justify-center">
            <p className={`text-sm ${currentTheme.textSecondary}`}>Loading calendar...</p>
          </div>
        </div>
      ) : (
        <div className={`relative calendar-container ${currentTheme.surface} rounded-xl border ${currentTheme.border} p-4`}>
          <BigCalendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            allDayAccessor="allDay"
            style={{ height: embedded ? 520 : 720, minHeight: embedded ? 420 : 540 }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onDoubleClickEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onDrillDown={openDayDetails}
            onShowMore={(events, date) => openDayDetails(date)}
            selectable={canManage ? 'ignoreEvents' : true}
            views={['month', 'week', 'day', 'agenda']}
            view={currentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onView={setCurrentView}
            popup
            tooltipAccessor={e => e.resource?.type === 'meeting' ? `${e.title} Â· ${e.resource.data?.organizer_role?.toUpperCase()}` : e.title}
            components={{
              event: CalendarEventComponent,
              dateCellWrapper: (props) => (
                <DateCellWrapper {...props} onOpenDay={openDayDetails} />
              ),
            }}
          />
        </div>
      )}

      {/* Day detail modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[var(--z-modal)] p-4" onClick={() => setSelectedDay(null)}>
          <div
            className={`${currentTheme.surface} rounded-xl p-7 max-w-lg w-full border ${currentTheme.border} shadow-2xl max-h-[85vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-xl font-bold ${currentTheme.text}`}>Attendance of the Day</h2>
              <button onClick={() => setSelectedDay(null)} className={`${currentTheme.textSecondary} p-1`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              <p className={`text-sm flex items-center gap-2 ${currentTheme.text}`}>
                <CalendarIcon size={14} />
                {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg border ${currentTheme.border} p-2 text-sm flex items-center gap-2 ${currentTheme.text}`}>
                  <CheckCircle className="w-4 h-4 text-green-400" /> Present: {selectedDay.attendanceCounts.present}
                </div>
                <div className={`rounded-lg border ${currentTheme.border} p-2 text-sm flex items-center gap-2 ${currentTheme.text}`}>
                  <XCircle className="w-4 h-4 text-red-400" /> Absent: {selectedDay.attendanceCounts.absent}
                </div>
                <div className={`rounded-lg border ${currentTheme.border} p-2 text-sm flex items-center gap-2 ${currentTheme.text}`}>
                  <AlertCircle className="w-4 h-4 text-yellow-400" /> Half Day: {selectedDay.attendanceCounts.half_day}
                </div>
                <div className={`rounded-lg border ${currentTheme.border} p-2 text-sm flex items-center gap-2 ${currentTheme.text}`}>
                  <CalendarIcon className="w-4 h-4 text-blue-400" /> Leave: {selectedDay.attendanceCounts.leave}
                </div>
              </div>

              {selectedDay.holidays.length > 0 && (
                <div className={`rounded-lg border ${currentTheme.border} p-3`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${currentTheme.textSecondary}`}>Holiday</p>
                  {selectedDay.holidays.map((holiday, idx) => (
                    <p key={`${holiday?.name || 'holiday'}-${idx}`} className={`text-sm ${currentTheme.text}`}>
                      {holiday?.name || 'Public Holiday'}
                    </p>
                  ))}
                </div>
              )}

              <div className={`rounded-lg border ${currentTheme.border} p-3`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${currentTheme.textSecondary}`}>Meetings Info</p>
                {selectedDay.meetings.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDay.meetings.map((meeting) => (
                      <button
                        key={meeting._id}
                        onClick={() => { setSelectedDay(null); setSelectedMeeting(meeting); }}
                        className={`w-full text-left rounded-lg border ${currentTheme.border} px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                      >
                        <p className={`text-sm font-semibold ${currentTheme.text}`}>{meeting.title}</p>
                        <p className={`text-xs ${currentTheme.textSecondary}`}>
                          {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${currentTheme.textSecondary}`}>No meetings scheduled for this day.</p>
                )}
              </div>

              {canManage && (
                <button
                  onClick={() => {
                    setFormDefaultStart(selectedDay.date);
                    setEditingMeeting(null);
                    setSelectedDay(null);
                    setShowForm(true);
                  }}
                  className="aether-btn aether-btn-primary w-full"
                >
                  <Plus className="w-4 h-4" /> Schedule Meeting For This Day
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meeting detail panel */}
      <MeetingDetailPanel
        meeting={selectedMeeting}
        isOpen={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        canManage={canManage}
        saving={saving}
        onEdit={(m) => { setEditingMeeting(m); setSelectedMeeting(null); setShowForm(true); }}
        onCancel={async (id, reason) => { const r = await cancelMeeting(id, reason); if (r.success) setSelectedMeeting(null); return r; }}
        onDelete={async (id) => { const r = await deleteMeeting(id); if (r.success) setSelectedMeeting(null); return r; }}
      />

      {/* Meeting form */}
      {canManage && (
        <MeetingFormModal
          isOpen={showForm}
          initialData={editingMeeting}
          defaultStart={formDefaultStart}
          saving={saving}
          onClose={() => { setShowForm(false); setEditingMeeting(null); }}
          onSave={handleSaveMeeting}
        />
      )}

      <style>{calendarStyles()}</style>
    </div>
  );

  if (embedded) return calendarContent;

  return (
    <ResponsivePageLayout title="HR Calendar" subtitle="Attendance, leaves, holidays and meetings">
      {calendarContent}
    </ResponsivePageLayout>
  );
}

// â”€â”€ Custom event â€” recurring + video icons for meetings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CalendarEventComponent({ event }) {
  const isMeeting   = event.resource?.type === 'meeting';
  const isRecurring = isMeeting && event.resource.data?.is_recurring;
  const hasLink     = isMeeting && event.resource.data?.conference_link;
  return (
    <div className="flex items-center gap-1 w-full overflow-hidden">
      {isRecurring && <RefreshCw className="w-2.5 h-2.5 flex-shrink-0 opacity-80" />}
      {hasLink     && <Video     className="w-2.5 h-2.5 flex-shrink-0 opacity-80" />}
      <span className="truncate text-[0.68rem] font-semibold leading-tight">{event.title}</span>
    </div>
  );
}

function DateCellWrapper({ value, children, onOpenDay }) {
  return (
    <div
      onClick={(e) => {
        if (!e?.target?.closest) return;
        if (e.target.closest('.rbc-event') || e.target.closest('.rbc-show-more')) return;
        onOpenDay?.(value);
      }}
    >
      {children}
    </div>
  );
}

// â”€â”€ Theme-aware calendar CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function calendarStyles() {
  return `
    .calendar-container .rbc-calendar { font-family: 'Inter', sans-serif; color: var(--text-primary); }
    .calendar-container .rbc-header { padding: 10px; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; background: var(--bg-surface); color: var(--text-muted); border-color: var(--border-soft); }
    .calendar-container .rbc-today { background-color: var(--brand-dim); }
    .calendar-container .rbc-off-range-bg { background: var(--bg-sunken); }
    .calendar-container .rbc-day-bg { background: var(--bg-base); border-color: var(--border-soft); }
    .calendar-container .rbc-month-view { background: var(--bg-base); border-color: var(--border-soft); }
    .calendar-container .rbc-date-cell { color: var(--text-secondary); padding: 4px; font-size: 0.78rem; }
    .calendar-container .rbc-off-range { color: var(--text-muted); }
    .calendar-container .rbc-event { transition: transform 0.15s, box-shadow 0.15s; }
    .calendar-container .rbc-event:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .calendar-container .rbc-toolbar { color: var(--text-primary); margin-bottom: 16px; }
    .calendar-container .rbc-toolbar button { color: var(--text-muted); background: var(--bg-raised); border: 1px solid var(--border-mid); border-radius: 0.375rem; padding: 6px 14px; font-size: 0.83rem; font-weight: 500; transition: all 0.15s; }
    .calendar-container .rbc-toolbar button:hover { background: var(--bg-surface); }
    .calendar-container .rbc-toolbar button.rbc-active { background: var(--brand); color: #fff; border-color: var(--brand); }
    .calendar-container .rbc-time-view { background: var(--bg-base); border-color: var(--border-soft); }
    .calendar-container .rbc-time-header { background: var(--bg-surface); border-color: var(--border-soft); }
    .calendar-container .rbc-time-content { border-color: var(--border-soft); }
    .calendar-container .rbc-time-slot { color: var(--text-muted); border-color: var(--border-hair); }
    .calendar-container .rbc-current-time-indicator { background: var(--brand); height: 2px; }
    .calendar-container .rbc-agenda-view table.rbc-agenda-table { border-color: var(--border-soft); }
    .calendar-container .rbc-agenda-view table.rbc-agenda-table tbody > tr { color: var(--text-secondary); }
    .calendar-container .rbc-agenda-view table.rbc-agenda-table tbody > tr > td { border-color: var(--border-soft); }
    .rbc-addons-dnd .rbc-addons-dnd-drag-preview { opacity: 0.75; }
  `;
}
