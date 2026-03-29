import { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import api from '@/shared/services/axios';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import useRealtimeSync from '@/shared/hooks/useRealtimeSync';
import { usePageShortcuts } from '@/shared/hooks/usePageShortcuts';
import ShortcutsOverlay from '@/features/tasks/components/ShortcutsOverlay';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import { Plus, X, Calendar as CalendarIcon, Filter, Settings } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const Calendar = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    showMyTasksOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const { isMobile } = useSidebar();

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const calendarShortcuts = [
    { key: 't', label: 'Go to Today',    description: 'Navigate the calendar to today', action: () => setCalendarDate(new Date()) },
    { key: 'f', label: 'Toggle Legend',  description: 'Show/hide the colour legend',    action: () => setShowLegend((v) => !v) },
    { key: 'r', label: 'Refresh',        description: 'Reload all calendar events',     action: () => fetchTasks() },
  ];
  const { showHelp, setShowHelp } = usePageShortcuts(calendarShortcuts);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    transformTasksToEvents();
  }, [tasks, filters]);

  useRealtimeSync({
    onTaskCreated: () => fetchTasks(),
    onTaskUpdated: () => fetchTasks(),
    onTaskDeleted: () => fetchTasks(),
  });

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const transformTasksToEvents = () => {
    let filtered = [...tasks];
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }
    if (filters.showMyTasksOnly) {
      filtered = filtered.filter((t) => {
        if (!t.assigned_to) return false;
        const currentUserId = user?._id || user?.id;
        if (!currentUserId) return false;
        const assignedIds = Array.isArray(t.assigned_to) 
          ? t.assigned_to.map(u => typeof u === 'object' ? u._id : u)
          : [typeof t.assigned_to === 'object' ? t.assigned_to._id : t.assigned_to];
        return assignedIds.includes(currentUserId);
      });
    }
    const calendarEvents = filtered
      .filter(task => task.due_date)
      .map(task => ({
        id: task._id,
        title: task.title,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        resource: task,
        allDay: true,
      }));
    setEvents(calendarEvents);
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: '#6b7280',
      in_progress: '#C4713A',
      review: '#eab308',
      done: '#22c55e',
      archived: '#ef4444',
    };
    return colors[status] || colors.todo;
  };

  const getPriorityBadgeColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#dc2626',
    };
    return colors[priority] || colors.medium;
  };

  const eventStyleGetter = (event) => {
    const task = event.resource;
    const backgroundColor = getStatusColor(task.status);
    const borderColor = getPriorityBadgeColor(task.priority);
    
    return {
      style: {
        backgroundColor,
        borderRadius: '0.125rem',
        opacity: 0.95,
        color: 'white',
        border: `2px solid ${borderColor}`,
        borderLeft: `4px solid ${borderColor}`,
        display: 'block',
        fontWeight: '600',
        fontSize: '0.75rem',
        padding: '2px 6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource);
    setShowDetailModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    navigate(`/tasks?create=true&date=${slotInfo.start.toISOString()}`);
  };

  const mobileEvents = [...events]
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 12);

  return (
    <ResponsivePageLayout title="Calendar" icon={CalendarIcon} noPadding>
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <header className={`border-b border-[var(--border-soft)] bg-[var(--bg-base)] shrink-0`}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div>
              <h2 className={`text-[var(--text-primary)] text-lg sm:text-xl font-bold leading-tight`}>Calendar View</h2>
              <p className={`text-[var(--text-muted)] text-xs mt-1`}>{isMobile ? 'Agenda-first mobile planner' : 'Visualize tasks by due date'}</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className={`flex items-center justify-center rounded h-9 px-3 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] hover:border-[var(--border-mid)] transition-colors`}
                title="Toggle Legend"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => navigate('/tasks?create=true')}
                className="flex items-center justify-center rounded h-9 px-3 sm:px-4 bg-[#C4713A] text-white gap-2 text-sm font-bold hover:bg-[#A35C28] transition-colors shadow-sm shadow-blue-900/20"
              >
                <Plus size={20} />
                <span className={isMobile ? 'hidden' : ''}>Create Task</span>
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="px-4 sm:px-6 pb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-fit">
              <Filter size={16} className={`text-[var(--text-muted)]`} />
              <span className={`text-sm text-[var(--text-primary)] font-medium`}>Filters:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs text-[var(--text-muted)] min-w-fit`}>
                  <span className={`font-medium text-[var(--text-primary)]`}>{events.length}</span> task{events.length !== 1 ? 's' : ''}
                </div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="h-8 px-3 rounded border border-[var(--border-soft)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)]"
                    aria-expanded={showFilters}
                    aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                  >
                    {showFilters ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>

            <div className={`${isMobile && !showFilters ? 'hidden' : 'grid'} grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3`}>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className={`h-9 w-full px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className={`h-9 w-full px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <button
                onClick={() => setFilters({ ...filters, showMyTasksOnly: !filters.showMyTasksOnly })}
                className={`h-9 w-full px-4 rounded text-sm font-medium transition-colors ${
                  filters.showMyTasksOnly
                    ? 'bg-[#C4713A] text-white border-[#C4713A]'
                    : `bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text-primary)]`
                } border`}
              >
                {filters.showMyTasksOnly ? 'My Tasks Only' : 'All Tasks'}
              </button>
            </div>
          </div>
        </header>

        {/* Calendar Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {showLegend && (
            <div className={`bg-[var(--bg-raised)] rounded border border-[var(--border-soft)] p-4 mb-6`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider`}>Legend</h3>
                <button
                  onClick={() => setShowLegend(false)}
                  className={`text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className={`text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2`}>Status (Background)</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#6b7280] rounded"></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>To Do</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#C4713A] rounded"></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#eab308] rounded"></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>Review</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#22c55e] rounded"></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>Done</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className={`text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2`}>Priority (Border)</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#10b981]`}></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#f59e0b]`}></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#f97316]`}></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#dc2626]`}></div>
                      <span className={`text-sm text-[var(--text-muted)]`}>Urgent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isMobile ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-2 calendar-container">
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 560, minHeight: 460 }}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  views={['month', 'agenda']}
                  defaultView="month"
                  date={calendarDate}
                  onNavigate={(date) => setCalendarDate(date)}
                  popup
                  tooltipAccessor={(event) => `${event.title} - ${event.resource.priority}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Visible Tasks</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{events.length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Focus Date</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                    {calendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Upcoming Agenda</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Calendar-first view with quick scan list</p>
                  </div>
                  <button
                    onClick={() => setCalendarDate(new Date())}
                    className="rounded-full border border-[var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Today
                  </button>
                </div>

                {mobileEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-base)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                    No due dates match the current filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileEvents.map((event) => {
                      const task = event.resource;
                      const statusColor = getStatusColor(task.status);
                      const priorityColor = getPriorityBadgeColor(task.priority);

                      return (
                        <button
                          key={event.id}
                          onClick={() => handleSelectEvent(event)}
                          className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-base)] p-4 text-left transition-colors hover:border-[var(--brand)]"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{task.title}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {new Date(task.due_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: statusColor }} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${priorityColor}22`, color: priorityColor }}>
                              {task.priority}
                            </span>
                            {task.team_id?.name && (
                              <span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                                {task.team_id.name}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`bg-[var(--bg-raised)] rounded border border-[var(--border-soft)] p-4 calendar-container`}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700, minHeight: 500 }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
                date={calendarDate}
                onNavigate={(date) => setCalendarDate(date)}
                popup
                tooltipAccessor={(event) => `${event.title} - ${event.resource.priority}`}
              />
            </div>
          )}
        </div>

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`bg-[var(--bg-raised)] rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-soft)]`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold text-[var(--text-primary)]`}>{selectedTask.title}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className={`text-[var(--text-secondary)]`}>{selectedTask.description || 'No description'}</p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <span className={`inline-block px-3 py-1 rounded text-xs font-semibold uppercase ${
                  selectedTask.status === 'todo'        ? 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-mid)]' :
                  selectedTask.status === 'in_progress' ? 'bg-[var(--brand-dim)] text-[var(--brand)]' :
                  selectedTask.status === 'review'      ? 'bg-[var(--warning-dim)] text-[var(--warning)]' :
                  'bg-[var(--success-dim)] text-[var(--success)]'
                }`}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
                <span className={`inline-block px-3 py-1 rounded text-xs font-semibold uppercase ${
                  selectedTask.priority === 'low'    ? 'bg-[var(--success-dim)] text-[var(--success)]' :
                  selectedTask.priority === 'medium' ? 'bg-[var(--warning-dim)] text-[var(--warning)]' :
                  selectedTask.priority === 'high'   ? 'bg-[var(--brand-dim)] text-[var(--brand)]' :
                  'bg-[var(--danger-dim)] text-[var(--danger)]'
                }`}>
                  {selectedTask.priority}
                </span>
              </div>

              <div className={`space-y-3 border-t border-[var(--border-soft)] pt-4`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm text-[var(--text-muted)] mb-1`}>
                      <span className="font-medium">Due Date:</span>
                    </p>
                    <p className={`text-sm text-[var(--text-primary)] flex items-center gap-2`}>
                      <CalendarIcon size={14} />
                      {new Date(selectedTask.due_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {selectedTask.created_by && (
                    <div>
                      <p className={`text-sm text-[var(--text-muted)] mb-1`}>
                        <span className="font-medium">Created by:</span>
                      </p>
                      <p className={`text-sm text-[var(--text-primary)]`}>{selectedTask.created_by.full_name || 'Unknown'}</p>
                    </div>
                  )}
                </div>

                {selectedTask.assigned_to && selectedTask.assigned_to.length > 0 && (
                  <div>
                    <p className={`text-sm text-[var(--text-muted)] mb-2`}>
                      <span className="font-medium">Assigned to:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.assigned_to.map((assignee) => (
                        <span key={assignee._id} className="inline-block text-xs px-2 py-1 rounded border" style={{ background: 'var(--brand-dim)', color: 'var(--brand)', borderColor: 'rgba(196,113,58,0.25)' }}>
                          {assignee.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.team_id && (
                  <div>
                    <p className={`text-sm text-[var(--text-muted)] mb-1`}>
                      <span className="font-medium">Team:</span>
                    </p>
                    <p className={`text-sm text-[var(--text-primary)]`}>{selectedTask.team_id.name}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/tasks')}
                className="w-full px-6 py-2 bg-[var(--brand)] text-white rounded hover:bg-[var(--brand-light)] transition-colors font-semibold"
              >
                View in Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .calendar-container .rbc-calendar {
          font-family: 'Inter', sans-serif;
          color: var(--text-primary);
        }
        .calendar-container .rbc-header {
          padding: 12px;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg-surface);
          color: var(--text-muted);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-today {
          background-color: var(--brand-dim);
        }
        .calendar-container .rbc-off-range-bg {
          background: var(--bg-sunken);
        }
        .calendar-container .rbc-date-cell {
          color: var(--text-secondary);
          padding: 4px;
        }
        .calendar-container .rbc-off-range {
          color: var(--text-muted);
        }
        .calendar-container .rbc-month-view {
          background: var(--bg-base);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-day-bg {
          background: var(--bg-base);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-event {
          transition: all 0.2s ease;
        }
        .calendar-container .rbc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .calendar-container .rbc-toolbar {
          color: var(--text-primary);
          margin-bottom: 20px;
          padding: 12px;
          background: var(--bg-canvas);
          border-radius: 0.125rem;
        }
        .calendar-container .rbc-toolbar button {
          color: var(--text-muted);
          background: var(--bg-raised);
          border: 1px solid var(--border-mid);
          border-radius: 0.125rem;
          padding: 6px 12px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .calendar-container .rbc-toolbar button:hover {
          background: var(--bg-surface);
          color: var(--text-primary);
        }
        .calendar-container .rbc-toolbar button.rbc-active {
          background: var(--brand);
          color: #fff;
          border-color: var(--brand);
        }
        .calendar-container .rbc-agenda-view {
          background: var(--bg-base);
        }
        .calendar-container .rbc-agenda-view table {
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-agenda-table tbody > tr > td {
          color: var(--text-secondary);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-agenda-date-cell,
        .calendar-container .rbc-agenda-time-cell {
          color: var(--text-muted);
        }
        .calendar-container .rbc-time-view {
          background: var(--bg-base);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-time-header-content {
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-time-content {
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-time-slot {
          border-color: var(--border-hair);
        }
        .calendar-container .rbc-current-time-indicator {
          background-color: var(--brand);
        }
      `}</style>

      {/* Keyboard shortcuts help overlay */}
      <ShortcutsOverlay
        show={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={calendarShortcuts}
        pageName="Calendar"
      />
      </div>
    </ResponsivePageLayout>
  );
};

export default Calendar;
