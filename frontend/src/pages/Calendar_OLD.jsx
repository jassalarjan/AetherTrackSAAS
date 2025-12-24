import { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import useRealtimeSync from '../hooks/useRealtimeSync';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, Filter, Calendar as CalendarIcon } from 'lucide-react';

const localizer = momentLocalizer(moment);

const Calendar = () => {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    showMyTasksOnly: false,
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    transformTasksToEvents();
  }, [tasks, filters]);

  // Real-time synchronization
  useRealtimeSync({
    onTaskCreated: () => {
      fetchTasks();
    },
    onTaskUpdated: () => {
      fetchTasks();
    },
    onTaskDeleted: () => {
      fetchTasks();
    },
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
        const assignedIds = Array.isArray(t.assigned_to) 
          ? t.assigned_to.map(u => typeof u === 'object' ? u._id : u)
          : [typeof t.assigned_to === 'object' ? t.assigned_to._id : t.assigned_to];
        return assignedIds.includes(user?.id);
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
      todo: '#6b7280',        // gray
      in_progress: '#3b82f6', // blue
      review: '#eab308',      // yellow
      done: '#22c55e',        // green
      archived: '#ef4444',    // red
    };
    return colors[status] || colors.todo;
  };

  const getPriorityBadgeColor = (priority) => {
    const colors = {
      low: '#10b981',     // emerald
      medium: '#f59e0b',  // amber
      high: '#f97316',    // orange
      urgent: '#dc2626',  // red
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
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: `3px solid ${borderColor}`,
        borderLeft: `6px solid ${borderColor}`,
        display: 'block',
        fontWeight: '600',
        padding: '2px 6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource);
    setShowDetailModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    window.location.href = `/tasks?create=true&date=${slotInfo.start.toISOString()}`;
  };

  return (
    <div className={`min-h-screen ${currentTheme.background}`}>
      <div className="flex">
        <Navbar />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className={`text-3xl font-bold ${currentTheme.text}`}>
                <CalendarIcon className="inline w-8 h-8 mr-2 mb-1" />
                Calendar View
              </h1>
              <p className={`${currentTheme.textSecondary} mt-2`}>
                Visualize your tasks by due date
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/tasks?create=true'}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Task</span>
            </button>
          </div>
          <div className={`${currentTheme.surface} rounded-lg shadow-md p-4 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                  <Filter className="inline w-4 h-4 mr-1" />
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input"
                >
                  <option value="">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="input"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                  Assignment
                </label>
                <button
                  onClick={() => setFilters({ ...filters, showMyTasksOnly: !filters.showMyTasksOnly })}
                  className={`w-full px-4 py-2 rounded-md font-medium ${
                    filters.showMyTasksOnly
                      ? 'bg-blue-600 text-white'
                      : `${currentTheme.surface} border ${currentTheme.border}`
                  }`}
                >
                  {filters.showMyTasksOnly ? 'My Tasks Only' : 'All Tasks'}
                </button>
              </div>
              <div>
                <label className={`block text-sm font-medium ${currentTheme.text} mb-2`}>
                  Summary
                </label>
                <div className={`text-sm ${currentTheme.textSecondary}`}>
                  {events.length} task{events.length !== 1 ? 's' : ''} with due dates
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend - Updated to show Status with Priority border indicator */}
          <div className={`${currentTheme.surface} rounded-lg shadow-md p-4 mb-6`}>
            <h3 className={`text-sm font-semibold ${currentTheme.text} mb-3`}>Legend</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs font-medium ${currentTheme.textSecondary} mb-2`}>Status (Background)</p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-500 rounded border-2 border-gray-600"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>To Do</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-600"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>In Progress</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded border-2 border-yellow-600"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>Review</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-600"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>Done</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-600"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>Archived</span>
                  </div>
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium ${currentTheme.textSecondary} mb-2`}>Priority (Border)</p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded border-4 border-emerald-500"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>Low</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded border-4 border-amber-500"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>Medium</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded border-4 border-orange-500"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>High</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded border-4 border-red-600"></div>
                    <span className={`text-sm ${currentTheme.textSecondary}`}>Urgent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`${currentTheme.surface} rounded-lg shadow-md p-6 calendar-container`}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              views={['month', 'week', 'day', 'agenda']}
              defaultView="month"
              popup
              tooltipAccessor={(event) => `${event.title} - ${event.resource.priority}`}
            />
          </div>
          {showDetailModal && selectedTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`${currentTheme.surface} rounded-lg p-8 max-w-2xl w-full mx-4`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-2xl font-bold ${currentTheme.text}`}>
                    {selectedTask.title}
                  </h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className={`${currentTheme.textSecondary} hover:${currentTheme.text}`}
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <p className={currentTheme.textSecondary}>{selectedTask.description}</p>
                  <div className="flex gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm bg-${selectedTask.priority}-100`}>
                      {selectedTask.priority}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm`}>
                      {selectedTask.status}
                    </span>
                  </div>
                  <div>
                    <strong>Due:</strong> {new Date(selectedTask.due_date).toLocaleDateString()}
                  </div>
                  {selectedTask.assigned_to && (
                    <div>
                      <strong>Assigned to:</strong> {selectedTask.assigned_to.map(u => u.full_name).join(', ')}
                    </div>
                  )}
                  <button
                    onClick={() => window.location.href = `/tasks`}
                    className="btn btn-primary w-full mt-4"
                  >
                    View in Tasks
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }
        .calendar-container .rbc-header {
          padding: 12px;
          font-weight: 600;
          background: ${currentTheme.background === 'bg-gray-900' ? '#1f2937' : '#f9fafb'};
          color: ${currentTheme.background === 'bg-gray-900' ? '#f9fafb' : '#111827'};
          border-color: ${currentTheme.background === 'bg-gray-900' ? '#374151' : '#e5e7eb'};
        }
        .calendar-container .rbc-today {
          background-color: ${currentTheme.background === 'bg-gray-900' ? '#1e3a8a' : '#dbeafe'};
        }
        .calendar-container .rbc-off-range-bg {
          background: ${currentTheme.background === 'bg-gray-900' ? '#111827' : '#f9fafb'};
        }
        .calendar-container .rbc-date-cell {
          color: ${currentTheme.background === 'bg-gray-900' ? '#d1d5db' : '#374151'};
        }
        .calendar-container .rbc-off-range {
          color: ${currentTheme.background === 'bg-gray-900' ? '#4b5563' : '#9ca3af'};
        }
        .calendar-container .rbc-month-view {
          background: ${currentTheme.background === 'bg-gray-900' ? '#1f2937' : '#ffffff'};
          border-color: ${currentTheme.background === 'bg-gray-900' ? '#374151' : '#e5e7eb'};
        }
        .calendar-container .rbc-day-bg {
          background: ${currentTheme.background === 'bg-gray-900' ? '#1f2937' : '#ffffff'};
          border-color: ${currentTheme.background === 'bg-gray-900' ? '#374151' : '#e5e7eb'};
        }
        .calendar-container .rbc-event {
          transition: all 0.2s ease;
        }
        .calendar-container .rbc-event:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }
        .calendar-container .rbc-toolbar {
          color: ${currentTheme.background === 'bg-gray-900' ? '#f9fafb' : '#111827'};
          margin-bottom: 20px;
        }
        .calendar-container .rbc-toolbar button {
          color: ${currentTheme.background === 'bg-gray-900' ? '#f9fafb' : '#111827'};
          background: ${currentTheme.background === 'bg-gray-900' ? '#374151' : '#f3f4f6'};
          border-color: ${currentTheme.background === 'bg-gray-900' ? '#4b5563' : '#d1d5db'};
        }
        .calendar-container .rbc-toolbar button:hover {
          background: ${currentTheme.background === 'bg-gray-900' ? '#4b5563' : '#e5e7eb'};
        }
        .calendar-container .rbc-toolbar button.rbc-active {
          background: ${currentTheme.background === 'bg-gray-900' ? '#2563eb' : '#3b82f6'};
          color: white;
        }
        .calendar-container .rbc-agenda-view {
          background: ${currentTheme.background === 'bg-gray-900' ? '#1f2937' : '#ffffff'};
        }
        .calendar-container .rbc-agenda-view table {
          border-color: ${currentTheme.background === 'bg-gray-900' ? '#374151' : '#e5e7eb'};
        }
        .calendar-container .rbc-agenda-table tbody > tr > td {
          color: ${currentTheme.background === 'bg-gray-900' ? '#d1d5db' : '#374151'};
          border-color: ${currentTheme.background === 'bg-gray-900' ? '#374151' : '#e5e7eb'};
        }
      `}} />
    </div>
  );
};

export default Calendar;
