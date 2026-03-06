import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import { projectsApi } from '../api/projectsApi';
import api from '../api/axios';
import { PageLoader } from '../components/Spinner';
import * as XLSX from 'xlsx';
import {
  Plus, Share2, Calendar, ChevronRight, Check, Loader, Database,
  Lock, MoreHorizontal, ChevronDown, Filter, Download, FileSpreadsheet, X, History, AlertCircle
} from 'lucide-react';
import { normalizeGanttData, recalculateForZoom, buildDependencyArrows } from '../utils/ganttNormalization.js';
import { formatDate, isToday, isWeekend } from '../utils/dateNormalization.js';
import { DebugOverlay, logNormalizedDataSummary } from '../utils/ganttDebugger.jsx';

const ProjectGantt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const { theme, currentColorScheme } = useTheme();
  
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [timeScale, setTimeScale] = useState('week'); // day, week, month, quarter
  const [showMilestones, setShowMilestones] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    search: ''
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }
    if (filters.assignee) {
      filtered = filtered.filter(t => 
        t.assigned_to && t.assigned_to.some(u => (u._id || u) === filters.assignee)
      );
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTasks(filtered);
  };

  // Get pixels per day based on time scale
  const getPixelsPerDay = () => {
    switch (timeScale) {
      case 'day': return 40;
      case 'week': return 8;
      case 'month': return 3;
      case 'quarter': return 1;
      default: return 8;
    }
  };

  // Main normalization pipeline - runs when tasks or zoom level changes
  const ganttData = useMemo(() => {
    if (filteredTasks.length === 0) {
      return {
        scheduledTasks: [],
        unscheduledTasks: [],
        timelineRange: { startDate: new Date(), endDate: new Date() },
        pixelsPerDay: getPixelsPerDay(),
        todayMarker: { position: 0, visible: false, date: new Date() },
        metadata: { totalTasks: 0, scheduledCount: 0, unscheduledCount: 0, validationErrors: [], hasErrors: false }
      };
    }

    const normalized = normalizeGanttData(filteredTasks, {
      pixelsPerDay: getPixelsPerDay()
    });

    // Log debug summary if enabled
    logNormalizedDataSummary(normalized);

    return normalized;
  }, [filteredTasks, timeScale]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all projects for dropdown
      const allProjectsResponse = await projectsApi.getAll();
      setProjects(allProjectsResponse || []);
      
      if (projectId) {
        // Fetch specific project with populated tasks
        const projectData = await projectsApi.getById(projectId);
        setProject(projectData);
        
        // Fetch tasks for this project with populated fields
        const tasksResponse = await api.get(`/tasks?project=${projectId}`);
        const projectTasks = tasksResponse.data.tasks || [];
        
        // Ensure tasks have proper project reference
        const enrichedTasks = projectTasks.map(task => ({
          ...task,
          project_id: projectData
        }));
        
        setTasks(enrichedTasks);
      } else {
        // Fetch all tasks across projects with populated project info
        const response = await api.get('/tasks');
        const allTasks = response.data.tasks || [];
        
        // Sort tasks by start_date for better visualization
        const sortedTasks = allTasks.sort((a, b) => {
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return new Date(a.start_date) - new Date(b.start_date);
        });
        
        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('Error fetching gantt data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      navigate(`/projects/gantt?project=${selectedId}`);
    } else {
      navigate('/projects/gantt');
    }
  };

  const getDuration = (task) => {
    // Use pre-computed duration from normalized data
    if (task.duration_days) {
      return `${task.duration_days} days`;
    }
    return 'N/A';
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getTaskBarColor = (task) => {
    if (task.is_critical && showCriticalPath) return 'bg-rose-600';
    switch (task.status) {
      case 'done':        return 'bg-emerald-500';
      case 'in_progress': return currentColorScheme.primary;
      case 'review':      return 'bg-purple-500';
      default:            return 'bg-slate-400/40 border border-slate-400';
    }
  };

  // Build dependency arrows for SVG overlay
  const dependencyArrows = useMemo(
    () => buildDependencyArrows(ganttData.scheduledTasks ?? [], 48),
    [ganttData.scheduledTasks]
  );

  // Extract normalized data (already computed in useMemo above)
  const { scheduledTasks, unscheduledTasks, timelineRange, pixelsPerDay, todayMarker } = ganttData;

  // Generate timeline headers based on time scale.
  // All arithmetic is UTC to match task bar pixel positions.
  const generateTimelineHeaders = () => {
    if (!timelineRange?.startDate || !timelineRange?.endDate) {
      return { headers: [], dayHeaders: [] };
    }

    const MS  = 86_400_000; // ms per day
    const rangeStart = timelineRange.startDate;
    const rangeEnd   = timelineRange.endDate;

    // Pixel offset for any UTC-midnight date (same formula as buildRenderModel)
    const toPixel = (d) =>
      Math.max(0, Math.floor((d.getTime() - rangeStart.getTime()) / MS) * pixelsPerDay);

    // First day of the month containing d (UTC)
    const utcMonthStart = (d) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

    // First day of the NEXT month (UTC)
    const utcNextMonth = (d) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const headers    = [];
    const dayHeaders = [];

    // ── shared: build one header entry per month spanning the range ──
    const buildMonthHeaders = (labelFmt) => {
      let mStart = utcMonthStart(rangeStart);
      while (mStart <= rangeEnd) {
        const mEnd    = new Date(utcNextMonth(mStart).getTime() - MS); // last day of month
        // Clamp to visible range
        const visStart = mStart < rangeStart ? rangeStart : mStart;
        const visEnd   = mEnd   > rangeEnd   ? rangeEnd   : mEnd;

        // Width = pixels from start of this month slice to start of next day after end
        const widthPx = toPixel(new Date(visEnd.getTime() + MS)) - toPixel(visStart);

        if (widthPx > 0) {
          headers.push({
            label: visStart.toLocaleDateString('en-US', { ...labelFmt, timeZone: 'UTC' }),
            width: widthPx,
            start: visStart
          });
        }

        mStart = utcNextMonth(mStart);
      }
    };

    if (timeScale === 'day') {
      buildMonthHeaders({ month: 'long', year: 'numeric' });

      // One cell per calendar day
      let d = new Date(rangeStart);
      while (d <= rangeEnd) {
        const dow = d.getUTCDay();
        dayHeaders.push({
          label:     d.getUTCDate(),
          day:       DOW[dow],
          isWeekend: dow === 0 || dow === 6,
          isToday:   isToday(d)
        });
        d = new Date(d.getTime() + MS);
      }

    } else if (timeScale === 'week') {
      buildMonthHeaders({ month: 'long', year: 'numeric' });

      // One cell per week — label shows "MMM D" of the week's Monday (or range start)
      let w = new Date(rangeStart);
      while (w <= rangeEnd) {
        const dow = w.getUTCDay();
        dayHeaders.push({
          label:     w.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
          isWeekend: dow === 0 || dow === 6,
          date:      new Date(w)
        });
        w = new Date(w.getTime() + 7 * MS);
      }

    } else if (timeScale === 'month') {
      buildMonthHeaders({ month: 'short', year: 'numeric' });

    } else {
      // Quarter view — month cells in top row, quarter label above (use month abbreviations)
      buildMonthHeaders({ month: 'short' });
    }

    return { headers, dayHeaders };
  };

  const { headers: timelineHeaders, dayHeaders } = generateTimelineHeaders();

  const getProgressWidth = (progress) => {
    return `${progress || 0}%`;
  };

  const handleExportExcel = () => {
    const taskData = filteredTasks.map(task => ({
      'Task Name': task.title,
      'Status': task.status,
      'Priority': task.priority,
      'Progress': `${task.progress || 0}%`,
      'Start Date': task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
      'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
      'Duration': getDuration(task),
      'Assigned To': task.assigned_to?.map(u => u.full_name || u.username).join(', ') || '',
      'Project': project?.name || 'All Projects'
    }));

    const worksheet = XLSX.utils.json_to_sheet(taskData);
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 30 },
      { wch: 25 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gantt Chart');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = project?.name ? `${project.name}-gantt-${timestamp}.xlsx` : `gantt-chart-${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    const headers = ['Task Name', 'Status', 'Priority', 'Progress', 'Start Date', 'Due Date', 'Duration', 'Assigned To', 'Project'];
    const csvData = filteredTasks.map(task => [
      task.title,
      task.status,
      task.priority,
      `${task.progress || 0}%`,
      task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
      task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
      getDuration(task),
      task.assigned_to?.map(u => u.full_name || u.username).join('; ') || '',
      project?.name || 'All Projects'
    ]);

    const csvString = [
      headers.join(','),
      ...csvData.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = project?.name ? `${project.name}-gantt-${timestamp}.csv` : `gantt-chart-${timestamp}.csv`;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  if (loading) return <PageLoader label="Loading Gantt chart…" />;

  return (
    <ResponsivePageLayout title={project?.name || 'Gantt Chart'} icon={Calendar} noPadding>
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <button onClick={() => navigate('/projects')} className={`${currentColorScheme.primaryText.replace('text-', 'hover:text-')} transition-colors`}>
                Projects
              </button>
              {project && (
                <>
                  <ChevronRight size={16} className="text-gray-400" />
                  <span className="text-[#0d121b] dark:text-white font-medium">{project.name}</span>
                </>
              )}
            </nav>
            <select 
              value={projectId || ''}
              onChange={handleProjectChange}
              className={`ml-4 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent`}
            >
              <option value="">All Projects</option>
              {projects.map(proj => (
                <option key={proj._id} value={proj._id}>{proj.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
            >
              <Filter size={18} />
              Filters
              {(filters.status || filters.priority || filters.assignee || filters.search) && (
                <span className={`ml-1 px-2 py-0.5 ${currentColorScheme.primary} text-white text-xs rounded-full`}>
                  Active
                </span>
              )}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
              >
                <Share2 size={18} />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                  >
                    <FileSpreadsheet size={16} />
                    Export to Excel
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
                  >
                    <Download size={16} />
                    Export to CSV
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/changelog')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
            >
              <History size={18} />
              View History
            </button>
            <button className={`${currentColorScheme.primary} text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm ${currentColorScheme.primaryHover}`}>
              <Plus size={18} />
              New Task
            </button>
          </div>
        </header>

        {/* Filter Section */}
        {showFilters && (
          <div className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Search Tasks
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by name..."
                  className={`w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} ${currentColorScheme.primaryText.replace('text-', 'focus:border-')}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={`w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} ${currentColorScheme.primaryText.replace('text-', 'focus:border-')}`}
                >
                  <option value="">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className={`w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} ${currentColorScheme.primaryText.replace('text-', 'focus:border-')}`}
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Assignee
                </label>
                <select
                  value={filters.assignee}
                  onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                  className={`w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} ${currentColorScheme.primaryText.replace('text-', 'focus:border-')}`}
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.full_name || user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setFilters({ status: '', priority: '', assignee: '', search: '' })}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
              <div className="flex items-center gap-2">
                {filters.status && (
                  <span className={`flex items-center gap-1 px-3 py-1 ${currentColorScheme.primaryLight} dark:${currentColorScheme.primary.replace('bg-', 'bg-')}/30 ${currentColorScheme.primaryText} rounded-full text-xs font-medium`}>
                    Status: {filters.status}
                    <X size={14} className="cursor-pointer" onClick={() => setFilters({ ...filters, status: '' })} />
                  </span>
                )}
                {filters.priority && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                    Priority: {filters.priority}
                    <X size={14} className="cursor-pointer" onClick={() => setFilters({ ...filters, priority: '' })} />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Project Header & Controls */}
        <div className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 px-8 py-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold dark:text-white">{project?.name || 'Project Timeline'}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Showing {filteredTasks.length} tasks | 
                {filteredTasks.filter(t => t.start_date && t.due_date).length} with dates | 
                Timeline: {timelineRange.startDate.toLocaleDateString()} - {timelineRange.endDate.toLocaleDateString()}
              </p>
            </div>
            {filteredTasks.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${currentColorScheme.primary}`}></div>
                  <span className="text-gray-600 dark:text-gray-400">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-purple-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-slate-400/40 border border-slate-400"></div>
                  <span className="text-gray-600 dark:text-gray-400">To Do</span>
                </div>
                {ganttData.metadata?.criticalPathCount > 0 && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                    <div className="w-3 h-3 rounded-sm bg-rose-600"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Critical Path ({ganttData.metadata.criticalPathCount})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            {/* Time Scale Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {['day', 'week', 'month', 'quarter'].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeScale === scale
                      ? `bg-white dark:bg-gray-700 ${currentColorScheme.primaryText} shadow-sm font-semibold`
                      : 'text-gray-600 dark:text-gray-400 hover:text-[#0d121b] dark:hover:text-white'
                  }`}
                >
                  {scale.charAt(0).toUpperCase() + scale.slice(1)}
                </button>
              ))}
            </div>

            {/* View Options */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-4">
                <button 
                  onClick={() => {
                    const today = new Date();
                    // This would scroll to today's position - implementation depends on scroll container ref
                  }}
                  className={`flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 ${currentColorScheme.primaryText.replace('text-', 'hover:text-')} transition-colors`}
                >
                  <Calendar size={18} />
                  Today
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMilestones}
                  onChange={(e) => setShowMilestones(e.target.checked)}
                  className={`w-4 h-4 ${currentColorScheme.primaryText} rounded border-gray-300 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')}`}
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Milestones</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCriticalPath}
                  onChange={(e) => setShowCriticalPath(e.target.checked)}
                  className="w-4 h-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Path</span>
              </label>
            </div>
          </div>
        </div>

        {/* Main Gantt Content Area — horizontally scrollable on mobile */}
        <div className="flex-1 flex overflow-x-auto overflow-y-hidden min-w-0">
          {scheduledTasks.length === 0 && unscheduledTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={40} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Tasks to Display</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {projectId ? 'This project has no tasks yet. Create tasks to see them in the timeline.' : 'No tasks found. Select a project or create tasks to get started.'}
                </p>
                <button 
                  className={`${currentColorScheme.primary} text-white text-sm font-semibold px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm ${currentColorScheme.primaryHover} mx-auto`}
                >
                  <Plus size={18} />
                  Create First Task
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Warning Banner for Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <div className="absolute top-0 left-0 right-0 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-2 flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  {unscheduledTasks.length} task(s) without dates won't appear on the timeline
                </span>
              </div>
              <button 
                onClick={() => navigate('/tasks')}
                className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 underline"
              >
                Edit Tasks
              </button>
            </div>
          )}
          {/* Task List (Left Side) */}
          <div className="w-[240px] sm:w-[320px] lg:w-[420px] shrink-0 border-r-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2234] flex flex-col shadow-sm">
            <div className="flex border-b-2 border-gray-300 dark:border-gray-700 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
              <div className="w-64 px-4 py-2.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Task Name</div>
              <div className="w-28 px-4 py-2.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-l border-gray-300 dark:border-gray-600">Start</div>
              <div className="w-28 px-4 py-2.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-l border-gray-300 dark:border-gray-600">Due</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {scheduledTasks.map((task, index) => (
                <div key={task._id} className="flex items-center border-b border-gray-100 dark:border-gray-800/50 hover:bg-[#C4713A]/5 dark:hover:bg-[#C4713A]/10 transition-colors h-12 group cursor-pointer">
                  <div className="w-64 px-4 flex items-center gap-2.5">
                    {/* Enhanced status indicator */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ${
                      task.status === 'done' 
                        ? 'bg-emerald-500 ring-emerald-200 dark:ring-emerald-900' 
                        : task.status === 'in_progress' 
                          ? `${currentColorScheme.primary} ${currentColorScheme.primary.replace('bg-', 'ring-')}/30`
                          : task.status === 'review' 
                            ? 'bg-purple-500 ring-purple-200 dark:ring-purple-900' 
                            : 'bg-gray-400 ring-gray-200 dark:ring-gray-700'
                    }`} />
                    
                    {/* Task title with priority indicator */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {task.priority === 'urgent' && (
                          <span className="text-red-500 text-xs" title="Urgent">🔥</span>
                        )}
                        {task.priority === 'high' && (
                          <span className="text-orange-500 text-xs" title="High">⬆️</span>
                        )}
                        <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">
                          {task.title}
                        </span>
                        {task.status === 'in_progress' && task.progress > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 ml-1">
                            {task.progress}%
                          </span>
                        )}
                      </div>
                      {/* Progress bar for in-progress tasks */}
                      {task.status === 'in_progress' && task.progress > 0 && (
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-0.5">
                          <div 
                            className={`h-full ${currentColorScheme.primary} transition-all duration-300`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                      {task.project_id?.name && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          📁 {task.project_id.name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-28 px-4 border-l border-gray-100 dark:border-gray-800/50">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {task.start_date 
                        ? new Date(task.start_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : '-'
                      }
                    </div>
                  </div>
                  
                  <div className="w-28 px-4 border-l border-gray-100 dark:border-gray-800/50">
                    <div className={`text-xs font-medium ${
                      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                        ? 'text-red-600 dark:text-red-400 font-bold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {task.due_date 
                        ? new Date(task.due_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : '-'
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Grid (Right Side) */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-[#1a2234]">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 shadow-sm">
              {/* Month Headers */}
              <div className="flex border-b-2 border-gray-300 dark:border-gray-700 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 h-10">
                {timelineHeaders.map((header, idx) => (
                  <div 
                    key={idx}
                    className="shrink-0 border-r border-gray-200 dark:border-gray-700 px-4 flex items-center text-[11px] font-bold tracking-wide text-gray-700 dark:text-gray-300"
                    style={{ width: `${header.width}px` }}
                  >
                    {header.label.toUpperCase()}
                  </div>
                ))}
              </div>
              
              {/* Day Headers */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-[#1a2234]/80 backdrop-blur-sm h-9">
                {timeScale === 'day' ? (
                  dayHeaders.map((day, idx) => (
                    <div 
                      key={idx}
                      className={`shrink-0 flex flex-col items-center justify-center text-[10px] font-medium border-r border-gray-200 dark:border-gray-700 transition-colors ${
                        day.isToday 
                          ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/20 ${currentColorScheme.primaryText} font-bold border-x-2 ${currentColorScheme.primary.replace('bg-', 'border-')}` 
                          : day.isWeekend 
                            ? 'bg-gray-100/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-500'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/20'
                      }`}
                      style={{ width: `${pixelsPerDay}px` }}
                    >
                      <span className="text-[9px] uppercase tracking-wider">{day.day}</span>
                      <span className={`${day.isToday ? 'font-bold text-sm' : ''}`}>{day.label}</span>
                    </div>
                  ))
                ) : timeScale === 'week' ? (
                  dayHeaders.map((day, idx) => (
                    <div 
                      key={idx}
                      className="shrink-0 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 font-medium border-r border-gray-100 dark:border-gray-800"
                      style={{ width: `${pixelsPerDay * 7}px` }}
                    >
                      {day.label}
                    </div>
                  ))
                ) : (
                  // Month / Quarter view sub-row: week-start day markers within each month band
                  <div className="flex flex-1">
                    {timelineHeaders.map((header, idx) => {
                      const MS_D = 86_400_000;
                      const weekMarkers = [];
                      let w = new Date(header.start);
                      const bandEnd = new Date(header.start.getTime() + (header.width / pixelsPerDay) * MS_D);
                      while (w < bandEnd) {
                        const offsetPx = Math.round((w.getTime() - header.start.getTime()) / MS_D * pixelsPerDay);
                        weekMarkers.push({ label: w.getUTCDate(), offsetPx });
                        w = new Date(w.getTime() + 7 * MS_D);
                      }
                      return (
                        <div
                          key={idx}
                          className="relative border-r border-gray-200 dark:border-gray-800 shrink-0"
                          style={{ width: `${header.width}px` }}
                        >
                          {weekMarkers.map((wm, i) => (
                            <span
                              key={i}
                              className="absolute top-1/2 -translate-y-1/2 text-[10px] text-gray-500 dark:text-gray-400 font-medium"
                              style={{ left: `${wm.offsetPx + 2}px` }}
                            >
                              {wm.label}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Grid & Bars */}
            <div className="relative" style={{
              backgroundImage: timeScale === 'day' 
                ? 'linear-gradient(to right, #e5e7eb 1px, transparent 1px)'
                : 'linear-gradient(to right, #d1d5db 1px, transparent 1px)',
              backgroundSize: `${timeScale === 'day' ? pixelsPerDay : pixelsPerDay * 7}px 100%`,
              minWidth: `${timelineHeaders.reduce((sum, h) => sum + h.width, 0)}px`
            }}>
              {/* Weekend Highlighting */}
              {timeScale === 'day' && dayHeaders.map((day, idx) => 
                day.isWeekend ? (
                  <div 
                    key={`weekend-${idx}`}
                    className="absolute top-0 bottom-0 bg-gray-100/40 dark:bg-gray-800/20 pointer-events-none"
                    style={{
                      left: `${idx * pixelsPerDay}px`,
                      width: `${pixelsPerDay}px`
                    }}
                  />
                ) : null
              )}
              {/* Current Time Indicator (using normalized data) */}
              {todayMarker.visible && (
                <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: `${todayMarker.position}px` }}>
                  {/* Vertical line */}
                  <div className={`absolute top-0 bottom-0 w-0.5 ${currentColorScheme.primary} opacity-70`} />
                  {/* Top marker */}
                  <div className={`absolute -top-2 -left-2 w-4 h-4 ${currentColorScheme.primary} rounded-full ring-4 ring-white dark:ring-gray-900 shadow-lg`}>
                    <div className={`absolute inset-0.5 bg-white dark:bg-gray-900 rounded-full`} />
                  </div>
                  {/* Label */}
                  <div className={`absolute top-6 -left-10 text-[10px] font-bold ${currentColorScheme.primaryText} bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full shadow-sm border ${currentColorScheme.primary.replace('bg-', 'border-')}`}>
                    TODAY
                  </div>
                </div>
              )}

              {/* Task Bars (using pre-computed positions) */}
              <div className="flex flex-col">
                {scheduledTasks.map((task, index) => {
                  const barColor = getTaskBarColor(task);
                  const barWidth    = task.bar_width    || 0;
                  const barPosition = task.position_x   || 0;
                  const slackWidth  = task.slack_width  || 0;
                  const progressWidth = getProgressWidth(task.progress || 0);
                  const isMilestone = task.task_type === 'milestone';

                  return (
                    <div key={task._id || task.id} className="h-12 border-b border-gray-100 dark:border-gray-800/50 flex items-center relative group hover:bg-[#C4713A]/5 dark:hover:bg-[#C4713A]/10 transition-colors">

                      {/* Slack / float zone */}
                      {showCriticalPath && slackWidth > 2 && (
                        <div
                          className="absolute h-3 rounded-r-full bg-amber-300/30 dark:bg-amber-500/20 border-t border-b border-r border-dashed border-amber-400/50"
                          style={{ left: `${barPosition + barWidth}px`, width: `${slackWidth}px`, top: '50%', transform: 'translateY(-50%)' }}
                          title={`Float: ${task.total_float} working day(s)`}
                        />
                      )}

                      {/* Milestone diamond */}
                      {isMilestone ? (
                        <div
                          className={`absolute w-5 h-5 rotate-45 shadow-lg cursor-pointer z-10 transition-transform hover:scale-125 ${
                            task.is_critical && showCriticalPath ? 'bg-rose-600 ring-2 ring-rose-400' : 'bg-amber-500 ring-2 ring-amber-300'
                          }`}
                          style={{ left: `${barPosition - 2}px`, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }}
                          title={`Milestone: ${task.title}\n${task.effective_start ? new Date(task.effective_start).toLocaleDateString() : ''}`}
                        />
                      ) : (
                      <div
                          className={`absolute h-7 ${barColor} rounded-lg shadow-md flex items-center overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:z-30 ${
                            task.is_critical && showCriticalPath ? 'ring-2 ring-rose-400 ring-inset' : 'border border-white/20 dark:border-black/20'
                          } ${
                            task.is_overdue ? 'opacity-90' : ''
                          }`}
                          style={{ 
                            left: `${barPosition}px`, 
                            width: `${Math.max(barWidth, 40)}px`,
                            minWidth: '40px',
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}
                          title={`${task.title} (${task.status})\n${formatDate(task.start_date, 'short')} - ${formatDate(task.end_date, 'short')}\nDuration: ${task.duration_days} days`}
                        >
                          {/* Progress bar for in-progress tasks */}
                          {task.status === 'in_progress' && task.progress && (
                            <div 
                              className="h-full bg-white/30 backdrop-blur-sm" 
                              style={{ width: progressWidth }}
                            >
                              <div className="h-1 bg-white/50 absolute top-0 left-0 right-0" />
                            </div>
                          )}
                          
                          {/* Task info on bar */}
                          <div className="absolute inset-0 flex items-center justify-between px-2.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {/* Priority indicator */}
                              {task.priority === 'urgent' && barWidth > 50 && (
                                <span className="text-xs">🔥</span>
                              )}
                              <span className="text-[11px] text-white font-semibold truncate drop-shadow-sm">
                                {barWidth > 60 ? task.title : barWidth > 40 ? task.title.substring(0, 15) + '...' : ''}
                              </span>
                            </div>
                            <span className="text-[11px] text-white font-bold ml-1 drop-shadow-sm">
                              {task.status === 'done' ? '✓' : task.progress ? `${task.progress}%` : ''}
                            </span>
                          </div>
                          
                          {/* Overdue diagonal stripe overlay */}
                          {task.is_overdue && (
                            <div
                              className="absolute inset-0 pointer-events-none rounded-lg"
                              style={{
                                background: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(0,0,0,0.15) 4px, rgba(0,0,0,0.15) 8px)'
                              }}
                            />
                          )}

                          {/* At-risk indicator dot */}
                          {task.is_at_risk && !task.is_overdue && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full ring-2 ring-white dark:ring-gray-900 z-10" title="At risk: low float" />
                          )}

                          {/* Enhanced Task tooltip on hover */}
                          <div className="absolute hidden group-hover:block bottom-full left-0 mb-3 z-50 w-72 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-xs rounded-xl shadow-2xl p-4 border border-gray-700">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-700">
                              <div className="flex-1">
                                <div className="font-bold text-sm mb-1">{task.title}</div>
                                {task.project_id?.name && (
                                  <div className="text-gray-400 text-[10px]">{task.project_id.name}</div>
                                )}
                              </div>
                              {/* Status badge */}
                              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                task.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                                task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                                task.status === 'review' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {task.status.replace('_', ' ')}
                              </div>
                            </div>
                            
                            {task.description && (
                              <div className="text-gray-300 mb-3 text-[11px] line-clamp-2">{task.description}</div>
                            )}
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <div className="text-gray-500 uppercase tracking-wide text-[9px] mb-0.5">Priority</div>
                                <div className={`font-semibold ${
                                  task.priority === 'urgent' ? 'text-red-400' :
                                  task.priority === 'high' ? 'text-orange-400' :
                                  task.priority === 'medium' ? 'text-yellow-400' :
                                  'text-gray-400'
                                }`}>
                                  {task.priority === 'urgent' && '🔥 '}
                                  {task.priority?.toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 uppercase tracking-wide text-[9px] mb-0.5">Duration</div>
                                <div className="text-white font-semibold">{task.duration_days} day{task.duration_days !== 1 ? 's' : ''}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 uppercase tracking-wide text-[9px] mb-0.5">Start</div>
                                <div className="text-white font-semibold">{formatDate(task.start_date, 'short')}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 uppercase tracking-wide text-[9px] mb-0.5">Due</div>
                                <div className="text-white font-semibold">{formatDate(task.end_date, 'short')}</div>
                              </div>
                            </div>
                            
                            {/* Schedule intelligence */}
                            {(task.is_critical || task.total_float != null || task.is_overdue || task.is_at_risk) && (
                              <div className="mt-3 pt-2 border-t border-gray-700 flex flex-wrap gap-1.5">
                                {task.is_critical && showCriticalPath && (
                                  <span className="px-2 py-0.5 bg-rose-600/25 text-rose-300 text-[9px] font-bold uppercase rounded-full">⚠ Critical Path</span>
                                )}
                                {task.is_overdue && (
                                  <span className="px-2 py-0.5 bg-red-600/25 text-red-300 text-[9px] font-bold uppercase rounded-full">Overdue</span>
                                )}
                                {task.is_at_risk && !task.is_overdue && (
                                  <span className="px-2 py-0.5 bg-orange-500/25 text-orange-300 text-[9px] font-bold uppercase rounded-full">At Risk</span>
                                )}
                                {task.total_float != null && (
                                  <span className="px-2 py-0.5 bg-gray-600/40 text-gray-300 text-[9px] rounded-full">Float: {task.total_float}d</span>
                                )}
                              </div>
                            )}

                            {/* Progress */}
                            {task.status === 'in_progress' && task.progress > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-700">
                                <div className="flex items-center justify-between text-[10px] mb-1">
                                  <span className="text-gray-400">Progress</span>
                                  <span className="text-white font-bold">{task.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Assignees */}
                            {task.assigned_to && task.assigned_to.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-gray-500 uppercase tracking-wide text-[9px] mb-1">Assigned to</div>
                                <div className="flex flex-wrap gap-1">
                                  {task.assigned_to.slice(0, 3).map((user, idx) => (
                                    <div key={idx} className="px-2 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-300">
                                      {user.full_name || user.username || 'Unknown'}
                                    </div>
                                  ))}
                                  {task.assigned_to.length > 3 && (
                                    <div className="px-2 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-400">
                                      +{task.assigned_to.length - 3}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-6 -mt-1">
                              <div className="border-8 border-transparent border-t-gray-800" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dependency Arrows — SVG overlay */}
              {dependencyArrows.length > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none z-20"
                  style={{
                    width: `${timelineHeaders.reduce((sum, h) => sum + h.width, 0)}px`,
                    height: `${scheduledTasks.length * 48}px`
                  }}
                >
                  <defs>
                    <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                    </marker>
                    <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#f43f5e" />
                    </marker>
                  </defs>
                  {dependencyArrows.map(arrow => {
                    const isCrit = arrow.isCritical && showCriticalPath;
                    const color  = isCrit ? '#f43f5e' : '#94a3b8';
                    const stroke = isCrit ? 1.5 : 1;
                    const midX   = Math.max(arrow.startX + 16, (arrow.startX + arrow.endX) / 2);
                    const d = `M ${arrow.startX} ${arrow.startY} H ${midX} V ${arrow.endY} H ${arrow.endX}`;
                    return (
                      <path
                        key={arrow.id}
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeDasharray={isCrit ? undefined : '4 2'}
                        markerEnd={isCrit ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
                        opacity={0.7}
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
            </>
          )}
        </div>

        {/* Footer Stats */}
        <footer className="h-10 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Scheduled: {scheduledTasks.length} / {filteredTasks.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Completed: {tasks.filter(t => t.status === 'done').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${currentColorScheme.primary}`}></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                In Progress: {tasks.filter(t => t.status === 'in_progress').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Critical: {tasks.filter(t => t.priority === 'urgent').length}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            Last synced: Just now
          </div>
        </footer>
      </main>
      
      {/* Debug Overlay (only visible with ?debug=gantt or localStorage.gantt_debug=true) */}
      <DebugOverlay normalizedData={ganttData} />
    </ResponsivePageLayout>
  );
};

export default ProjectGantt;
