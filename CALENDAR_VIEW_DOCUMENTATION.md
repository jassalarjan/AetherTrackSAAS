# 📅 Calendar View Feature Documentation

## Overview

The **Calendar View** is a proposed feature for TaskFlow that will provide users with a visual, date-based representation of tasks, making it easier to manage deadlines, schedule work, and track task distribution across time periods.

## Current Status

❌ **Not Implemented** - TaskFlow currently displays tasks in:
- **List View** (`/tasks`) - Card-based grid layout with filters
- **Kanban Board** (`/kanban`) - Column-based status workflow
- **Dashboard** (`/`) - Overview with recent tasks

## Proposed Calendar View Features

### 📋 Core Features

1. **Monthly Calendar Grid**
   - Display full month view with all dates
   - Show tasks on their due dates
   - Color-coded by priority or status
   - Navigate between months (previous/next)
   - Jump to today's date

2. **Task Display on Calendar**
   - Task title shown on due date
   - Multiple tasks per day supported
   - Overflow indicator (e.g., "+3 more")
   - Visual priority indicators
   - Status badges

3. **Interactive Task Management**
   - Click task to view details
   - Edit task directly from calendar
   - Drag-and-drop to reschedule (advanced feature)
   - Quick create task on specific date
   - Filter by status, priority, team

4. **Multiple Calendar Views**
   - **Month View** - Full month grid (default)
   - **Week View** - 7-day detailed view
   - **Day View** - Single day with hourly breakdown
   - **Agenda View** - List of upcoming tasks

5. **Integration with Existing Features**
   - Filter by "My Tasks Only"
   - Team-based filtering
   - Real-time updates via Socket.IO
   - Responsive design for mobile/tablet

---

## Implementation Guide

### Step 1: Install Calendar Library

**Recommended: React Big Calendar**

```bash
cd frontend
npm install react-big-calendar moment
```

**Alternative: FullCalendar**
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
```

### Step 2: Create Calendar Component

**File**: `frontend/src/pages/Calendar.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import api from '../api/axios';
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

    // Apply filters
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

    // Transform tasks to calendar events
    const calendarEvents = filtered
      .filter(task => task.due_date)
      .map(task => ({
        id: task._id,
        title: task.title,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        resource: task, // Store full task data
        allDay: true,
      }));

    setEvents(calendarEvents);
  };

  const eventStyleGetter = (event) => {
    const task = event.resource;
    let backgroundColor = '#3174ad'; // default blue

    // Color by priority
    switch (task.priority) {
      case 'urgent':
        backgroundColor = '#dc2626'; // red
        break;
      case 'high':
        backgroundColor = '#f97316'; // orange
        break;
      case 'medium':
        backgroundColor = '#eab308'; // yellow
        break;
      case 'low':
        backgroundColor = '#22c55e'; // green
        break;
    }

    // Dim completed tasks
    if (task.status === 'done') {
      backgroundColor = '#9ca3af'; // gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource);
    setShowDetailModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    // Open create task modal with pre-filled due date
    console.log('Create task on:', slotInfo.start);
    // Navigate to tasks page with create modal and date
    window.location.href = `/tasks?create=true&date=${slotInfo.start.toISOString()}`;
  };

  return (
    <div className={`min-h-screen ${currentTheme.background}`}>
      <div className="flex">
        <Navbar />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Header */}
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

          {/* Filters */}
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

          {/* Legend */}
          <div className={`${currentTheme.surface} rounded-lg shadow-md p-4 mb-6`}>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className={currentTheme.textSecondary}>Urgent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className={currentTheme.textSecondary}>High</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className={currentTheme.textSecondary}>Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className={currentTheme.textSecondary}>Low</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className={currentTheme.textSecondary}>Completed</span>
              </div>
            </div>
          </div>

          {/* Calendar */}
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

          {/* Task Detail Modal (reuse from Tasks.jsx) */}
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

      {/* Custom CSS for Calendar */}
      <style jsx>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }
        .calendar-container .rbc-header {
          padding: 10px;
          font-weight: 600;
        }
        .calendar-container .rbc-today {
          background-color: ${currentTheme === 'light' ? '#e0f2fe' : '#1e40af'};
        }
        .calendar-container .rbc-off-range-bg {
          background: ${currentTheme === 'light' ? '#f3f4f6' : '#1f2937'};
        }
      `}</style>
    </div>
  );
};

export default Calendar;
```

### Step 3: Add Calendar Route

**File**: `frontend/src/App.jsx` (or wherever routes are defined)

```jsx
import Calendar from './pages/Calendar';

// Add to routes
<Route path="/calendar" element={<Calendar />} />
```

### Step 4: Add Calendar Link to Navbar

**File**: `frontend/src/components/Navbar.jsx`

```jsx
import { Calendar } from 'lucide-react';

// Add to navigation items
<Link
  to="/calendar"
  className={`nav-link ${location.pathname === '/calendar' ? 'active' : ''}`}
>
  <Calendar className="w-5 h-5" />
  <span>Calendar</span>
</Link>
```

### Step 5: Add Custom Calendar Styling

**File**: `frontend/src/index.css`

```css
/* Calendar View Custom Styles */
.rbc-calendar {
  font-family: inherit;
}

.rbc-header {
  padding: 12px 10px;
  font-weight: 600;
  border-bottom: 2px solid #e5e7eb;
}

.rbc-month-view {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.rbc-day-bg {
  border-left: 1px solid #e5e7eb;
}

.rbc-today {
  background-color: #dbeafe !important;
}

.dark .rbc-today {
  background-color: #1e3a8a !important;
}

.rbc-off-range-bg {
  background: #f9fafb;
}

.dark .rbc-off-range-bg {
  background: #1f2937;
}

.rbc-event {
  padding: 2px 5px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.rbc-event:hover {
  opacity: 1 !important;
}

.rbc-toolbar button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.rbc-toolbar button:hover {
  background: #f3f4f6;
}

.rbc-toolbar button.rbc-active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.dark .rbc-toolbar button {
  background: #374151;
  color: #f3f4f6;
  border-color: #4b5563;
}

.dark .rbc-toolbar button:hover {
  background: #4b5563;
}

.dark .rbc-toolbar button.rbc-active {
  background: #3b82f6;
  color: white;
}
```

---

## Feature Specifications

### User Stories

1. **As a user**, I want to see all my tasks on a calendar so I can visualize my workload over time.

2. **As a team lead**, I want to see team tasks on a calendar to identify busy periods and distribute work evenly.

3. **As a user**, I want to click on a task in the calendar to view its details without leaving the calendar view.

4. **As a user**, I want to filter calendar tasks by status and priority to focus on specific work items.

5. **As a user**, I want to drag tasks to different dates to reschedule them easily.

6. **As a user**, I want to switch between month, week, and day views to see different levels of detail.

---

## Database Schema

**No changes needed** - Calendar view uses existing Task model with `due_date` field.

### Task Model (Already exists)
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  status: String, // todo, in_progress, review, done
  priority: String, // low, medium, high, urgent
  due_date: Date, // Used for calendar display
  created_by: ObjectId,
  assigned_to: [ObjectId],
  team_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
```

---

## API Endpoints

**No new endpoints needed** - Use existing `/api/tasks` endpoint.

### GET /api/tasks
```javascript
// Returns all tasks with due_date field
// Calendar component filters and transforms on frontend
```

---

## Responsive Design

### Desktop (≥1024px)
- Full calendar grid (7 columns)
- Month view as default
- All views available

### Tablet (768px - 1023px)
- Condensed calendar grid
- Week view recommended as default
- Event titles may truncate

### Mobile (≤767px)
- Agenda view as default (list format)
- Month view shows limited events
- Swipe to change months
- Tap date to see all events

---

## Advanced Features (Future Enhancements)

### 1. Drag-and-Drop Rescheduling
```jsx
const handleEventDrop = async ({ event, start, end }) => {
  try {
    await api.patch(`/tasks/${event.id}`, {
      due_date: start
    });
    fetchTasks(); // Refresh calendar
  } catch (error) {
    console.error('Error rescheduling task:', error);
    alert('Failed to reschedule task');
  }
};

// Add to BigCalendar props
<BigCalendar
  {...otherProps}
  draggableAccessor={() => canEditTask(event.resource)}
  onEventDrop={handleEventDrop}
  resizable={false}
/>
```

### 2. Recurring Tasks
```javascript
// Task Model Enhancement
{
  recurrence: {
    type: String, // daily, weekly, monthly, yearly
    interval: Number, // every 2 days, every 3 weeks, etc.
    end_date: Date, // when recurrence stops
    days_of_week: [Number], // for weekly: [1,3,5] = Mon, Wed, Fri
  }
}
```

### 3. Color Coding Options
- By priority (default)
- By status
- By team
- By assigned user

### 4. Export Calendar
- Export as iCal (.ics)
- Sync with Google Calendar
- Sync with Outlook Calendar

### 5. Time-based Tasks
- Add start_time and end_time to tasks
- Show hourly breakdown in day view
- Duration indicator on calendar

---

## Testing Checklist

- [ ] Calendar loads all tasks with due dates
- [ ] Filters work correctly (status, priority, my tasks)
- [ ] Click task opens detail modal
- [ ] Click empty date opens create task modal with pre-filled date
- [ ] Month navigation works (previous/next)
- [ ] Today button jumps to current date
- [ ] Week view displays correctly
- [ ] Day view displays correctly
- [ ] Agenda view shows upcoming tasks
- [ ] Color coding by priority works
- [ ] Responsive design on mobile
- [ ] Dark mode styling works
- [ ] Real-time updates via Socket.IO

---

## Performance Considerations

1. **Pagination for Large Datasets**
   - Load only current month's tasks initially
   - Lazy load adjacent months on demand

2. **Memoization**
   - Use `useMemo` for event transformation
   - Prevent unnecessary re-renders

3. **Debounce Filters**
   - Delay filter application to reduce API calls

4. **Virtual Scrolling**
   - For agenda view with many tasks

---

## Accessibility (A11y)

- [ ] Keyboard navigation (arrow keys)
- [ ] Screen reader support
- [ ] ARIA labels for calendar controls
- [ ] Focus indicators
- [ ] Color-blind friendly colors
- [ ] High contrast mode support

---

## Dependencies

```json
{
  "react-big-calendar": "^1.8.5",
  "moment": "^2.29.4"
}
```

**Alternative Libraries:**
- `@fullcalendar/react` - More features, larger bundle
- `react-calendar` - Lightweight, simpler
- `tui-calendar` - Modern, feature-rich

---

## Implementation Timeline

| Phase | Task | Duration | Priority |
|-------|------|----------|----------|
| **Phase 1** | Install dependencies | 0.5 hours | High |
| | Create basic Calendar component | 2 hours | High |
| | Add route and navigation | 0.5 hours | High |
| | Test basic functionality | 1 hour | High |
| **Phase 2** | Add filters | 1 hour | Medium |
| | Implement task detail modal | 1 hour | Medium |
| | Add color coding | 0.5 hours | Medium |
| | Responsive design | 2 hours | Medium |
| **Phase 3** | Drag-and-drop rescheduling | 3 hours | Low |
| | Multiple views (week/day/agenda) | 2 hours | Low |
| | Export functionality | 2 hours | Low |
| **Total** | | **15.5 hours** | |

---

## Screenshots (Mockups)

### Month View
```
┌──────────────────────────────────────────────┐
│  Calendar View                    [+] Create  │
├──────────────────────────────────────────────┤
│ Filters: [All Status] [All Priority] [My Tasks] │
├──────────────────────────────────────────────┤
│      November 2025                            │
│ ┌────┬────┬────┬────┬────┬────┬────┐         │
│ │ Sun│Mon │Tue │Wed │Thu │Fri │Sat │         │
│ ├────┼────┼────┼────┼────┼────┼────┤         │
│ │    │    │    │    │    │ 1  │ 2  │         │
│ │    │    │    │    │    │[H] │[M] │         │
│ ├────┼────┼────┼────┼────┼────┼────┤         │
│ │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │         │
│ │    │[U] │    │[M] │    │[L] │    │         │
│ │    │[H] │    │    │    │    │    │         │
│ └────┴────┴────┴────┴────┴────┴────┘         │
│ Legend: [U]=Urgent [H]=High [M]=Medium [L]=Low│
└──────────────────────────────────────────────┘
```

---

## Conclusion

The Calendar View feature will significantly enhance TaskFlow's task management capabilities by providing a visual, time-based interface for planning and tracking work. This documentation provides a complete implementation guide that can be followed step-by-step to add this feature to the application.

### Benefits:
- ✅ Better deadline visualization
- ✅ Improved workload planning
- ✅ Enhanced team coordination
- ✅ Intuitive task scheduling
- ✅ Professional appearance

### Next Steps:
1. Review and approve this documentation
2. Install dependencies
3. Create Calendar component
4. Test thoroughly
5. Deploy to production

---

**Document Version**: 1.0  
**Last Updated**: November 2, 2025  
**Author**: TaskFlow Development Team
