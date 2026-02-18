import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import { projectsApi } from '../api/projectsApi';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import {
  Plus, Share2, Calendar, ChevronRight, Check, Loader, Database,
  Lock, MoreHorizontal, ChevronDown, Filter, Download, FileSpreadsheet, X
} from 'lucide-react';

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
    if (!task.start_date || !task.due_date) return 'N/A';
    const start = new Date(task.start_date);
    const end = new Date(task.due_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getTaskBarColor = (status) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500';
      case 'in_progress':
        return currentColorScheme.primary;
      case 'review':
        return 'bg-purple-500';
      default:
        return 'bg-slate-400/40 border border-slate-400';
    }
  };

  // Calculate timeline range based on tasks
  const getTimelineRange = () => {
    if (filteredTasks.length === 0) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(1); // Start of current month
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 3);
      return { startDate, endDate };
    }

    const dates = filteredTasks
      .filter(t => t.start_date || t.due_date)
      .flatMap(t => [t.start_date, t.due_date].filter(Boolean))
      .map(d => new Date(d));

    if (dates.length === 0) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(1);
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 3);
      return { startDate, endDate };
    }

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Add padding
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 14);

    return { startDate, endDate };
  };

  const timelineRange = getTimelineRange();

  // Get day width based on time scale
  const getDayWidth = () => {
    switch (timeScale) {
      case 'day': return 40;
      case 'week': return 8;
      case 'month': return 3;
      case 'quarter': return 1;
      default: return 8;
    }
  };

  const dayWidth = getDayWidth();

  // Debug: Log filtered tasks
  console.log('Filtered tasks:', filteredTasks.length, filteredTasks);
  console.log('Timeline range:', timelineRange);
  console.log('Day width:', dayWidth);

  const getTaskBarWidth = (task) => {
    if (!task.start_date || !task.due_date) {
      console.log('Task missing dates:', task.title, task);
      return 0;
    }
    const start = new Date(task.start_date);
    const end = new Date(task.due_date);
    const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const width = diffDays * dayWidth;
    console.log('Task bar width:', task.title, 'days:', diffDays, 'width:', width);
    return width;
  };

  const getTaskBarPosition = (task) => {
    if (!task.start_date) {
      console.log('Task missing start_date:', task.title);
      return 0;
    }
    const taskStart = new Date(task.start_date);
    const { startDate } = timelineRange;
    const diffDays = Math.floor((taskStart - startDate) / (1000 * 60 * 60 * 24));
    const position = Math.max(0, diffDays * dayWidth);
    console.log('Task position:', task.title, 'start:', taskStart.toDateString(), 'timeline start:', startDate.toDateString(), 'position:', position);
    return position;
  };

  // Generate timeline headers based on time scale
  const generateTimelineHeaders = () => {
    const { startDate, endDate } = timelineRange;
    const headers = [];
    const dayHeaders = [];

    if (timeScale === 'day') {
      let current = new Date(startDate);
      let currentMonth = null;

      while (current <= endDate) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
        
        if (monthKey !== currentMonth) {
          const monthStart = new Date(current);
          let monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          if (monthEnd > endDate) monthEnd = new Date(endDate);
          
          const daysInView = Math.ceil((monthEnd - monthStart) / (1000 * 60 * 60 * 24)) + 1;
          
          headers.push({
            label: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            width: daysInView * dayWidth,
            start: monthStart
          });
          
          currentMonth = monthKey;
        }

        dayHeaders.push({
          label: current.getDate(),
          day: current.toLocaleDateString('en-US', { weekday: 'short' }),
          isWeekend: current.getDay() === 0 || current.getDay() === 6,
          isToday: current.toDateString() === new Date().toDateString()
        });

        current.setDate(current.getDate() + 1);
      }
    } else if (timeScale === 'week') {
      let current = new Date(startDate);
      let currentMonth = null;

      while (current <= endDate) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
        
        if (monthKey !== currentMonth) {
          const monthStart = new Date(current);
          let monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          if (monthEnd > endDate) monthEnd = new Date(endDate);
          
          const daysInMonth = Math.ceil((monthEnd - monthStart) / (1000 * 60 * 60 * 24)) + 1;
          
          headers.push({
            label: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            width: daysInMonth * dayWidth,
            start: monthStart
          });
          
          currentMonth = monthKey;
        }

        current.setDate(current.getDate() + 1);
      }

      // Generate week day markers (every 7 days)
      current = new Date(startDate);
      while (current <= endDate) {
        dayHeaders.push({
          label: current.getDate(),
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Month or Quarter view
      let current = new Date(startDate);
      current.setDate(1);

      while (current <= endDate) {
        const nextMonth = new Date(current);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const daysInMonth = Math.ceil((nextMonth - current) / (1000 * 60 * 60 * 24));
        
        headers.push({
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          width: daysInMonth * dayWidth,
          start: new Date(current)
        });

        current = nextMonth;
      }
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

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${currentColorScheme.primaryText.replace('text-', 'border-')}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
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
              <h1 className="text-2xl font-bold">{project?.name || 'Project Timeline'}</h1>
              <p className="text-sm text-gray-500 mt-1">
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

        {/* Main Gantt Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={40} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Tasks to Display</h3>
                <p className="text-gray-500 mb-6">
                  {projectId ? 'This project has no tasks yet. Create tasks to see them in the timeline.' : 'No tasks found. Select a project or create tasks to get started.'}
                </p>
                <button 
                  onClick={() => projectId ? navigate(`/projects/${projectId}`) : navigate('/tasks')}
                  className={`px-6 py-3 ${currentColorScheme.primary} text-white rounded-lg font-semibold ${currentColorScheme.primaryHover}`}
                >
                  {projectId ? 'Go to Project' : 'View Tasks'}
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Task List (Left Side) */}
          <div className="w-[420px] shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex flex-col">
            <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="w-64 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Task Name</div>
              <div className="w-28 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700">Start Date</div>
              <div className="w-28 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700">Due Date</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredTasks.map((task, index) => (
                <div key={task._id} className="flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors h-10 group">
                  <div className="w-64 px-4 flex items-center gap-2">
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      task.status === 'done' 
                        ? 'bg-emerald-500' 
                        : task.status === 'in_progress' 
                          ? currentColorScheme.primary
                          : task.status === 'review' 
                            ? 'bg-purple-500' 
                            : 'bg-gray-300'
                    }`} />
                    
                    {/* Task title with priority indicator */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {task.priority === 'urgent' && (
                          <span className="text-red-500 text-xs">🔥</span>
                        )}
                        {task.priority === 'high' && (
                          <span className="text-orange-500 text-xs">⬆️</span>
                        )}
                        <span className="text-sm font-medium truncate text-gray-700 dark:text-gray-300">
                          {task.title}
                        </span>
                      </div>
                      {task.project_id?.name && (
                        <div className="text-[10px] text-gray-400 truncate">
                          {task.project_id.name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-28 px-4 border-l border-gray-100 dark:border-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {task.start_date 
                        ? new Date(task.start_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : '-'
                      }
                    </div>
                  </div>
                  
                  <div className="w-28 px-4 border-l border-gray-100 dark:border-gray-800">
                    <div className={`text-xs ${
                      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                        ? 'text-red-500 font-semibold'
                        : 'text-gray-600 dark:text-gray-400'
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
          <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white dark:bg-[#1a2234]">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20">
              {/* Month Headers */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-8">
                {timelineHeaders.map((header, idx) => (
                  <div 
                    key={idx}
                    className="shrink-0 border-r border-gray-200 dark:border-gray-800 px-4 flex items-center text-xs font-bold text-gray-500"
                    style={{ width: `${header.width}px` }}
                  >
                    {header.label.toUpperCase()}
                  </div>
                ))}
              </div>
              
              {/* Day Headers */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] h-8">
                {timeScale === 'day' ? (
                  dayHeaders.map((day, idx) => (
                    <div 
                      key={idx}
                      className={`shrink-0 flex flex-col items-center justify-center text-[10px] font-medium border-r border-gray-100 dark:border-gray-800 ${
                        day.isToday 
                          ? `${currentColorScheme.primary.replace('bg-', 'bg-')}/10 ${currentColorScheme.primaryText} font-bold` 
                          : day.isWeekend 
                            ? 'bg-gray-50 dark:bg-gray-800/30 text-gray-400'
                            : 'text-gray-500'
                      }`}
                      style={{ width: `${dayWidth}px` }}
                    >
                      <span className="text-[9px] uppercase">{day.day}</span>
                      <span className={day.isToday ? 'font-bold' : ''}>{day.label}</span>
                    </div>
                  ))
                ) : timeScale === 'week' ? (
                  dayHeaders.map((day, idx) => (
                    <div 
                      key={idx}
                      className="shrink-0 flex items-center justify-center text-[10px] text-gray-400 font-medium border-r border-gray-100 dark:border-gray-800"
                      style={{ width: `${dayWidth * 7}px` }}
                    >
                      {day.label}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1">
                    {timelineHeaders.map((header, idx) => {
                      const daysInPeriod = Math.ceil(header.width / dayWidth);
                      const markers = [];
                      for (let i = 1; i <= Math.min(5, daysInPeriod); i += Math.ceil(daysInPeriod / 5)) {
                        markers.push(i);
                      }
                      return (
                        <div 
                          key={idx}
                          className="flex justify-around items-center text-[10px] text-gray-400 font-medium px-2 border-r border-gray-200 dark:border-gray-800"
                          style={{ width: `${header.width}px` }}
                        >
                          {markers.map((day, i) => (
                            <span key={i}>{day}</span>
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
                : 'linear-gradient(to right, #f3f4f6 1px, transparent 1px)',
              backgroundSize: `${timeScale === 'day' ? dayWidth : dayWidth * 7}px 100%`,
              minWidth: `${timelineHeaders.reduce((sum, h) => sum + h.width, 0)}px`
            }}>
              {/* Current Time Indicator */}
              {(() => {
                const today = new Date();
                const { startDate } = timelineRange;
                const daysFromStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                const position = daysFromStart * dayWidth;
                
                if (position >= 0 && position <= timelineHeaders.reduce((sum, h) => sum + h.width, 0)) {
                  return (
                    <div className={`absolute top-0 bottom-0 w-px ${currentColorScheme.primary} z-10`} style={{ left: `${position}px` }}>
                      <div className={`absolute -top-1 -left-1.5 w-3 h-3 ${currentColorScheme.primary} rounded-full ring-4 ${currentColorScheme.primary.replace('bg-', 'ring-')}/20`}></div>
                      <div className={`absolute top-2 -left-8 text-[9px] font-bold ${currentColorScheme.primaryText} bg-white dark:bg-gray-800 px-1 rounded`}>
                        TODAY
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Task Bars */}
              <div className="flex flex-col">
                {filteredTasks.map((task, index) => {
                  const barColor = getTaskBarColor(task.status);
                  const barWidth = getTaskBarWidth(task);
                  const barPosition = getTaskBarPosition(task);
                  const progressWidth = getProgressWidth(task.progress || 0);
                  const hasValidDates = task.start_date && task.due_date;

                  return (
                    <div key={task._id} className="h-10 border-b border-gray-100 dark:border-gray-800 flex items-center relative group hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      {hasValidDates && barWidth > 0 ? (
                        <div
                          className={`absolute h-6 ${barColor} rounded-md shadow-sm flex items-center overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-105 z-20`}
                          style={{ 
                            left: `${barPosition}px`, 
                            width: `${Math.max(barWidth, 30)}px`,
                            minWidth: '30px'
                          }}
                          title={`${task.title} (${task.status})\n${task.start_date ? new Date(task.start_date).toLocaleDateString() : ''} - ${task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}`}
                        >
                          {/* Progress bar for in-progress tasks */}
                          {task.status === 'in_progress' && task.progress && (
                            <div 
                              className="h-full bg-white/20" 
                              style={{ width: progressWidth }}
                            ></div>
                          )}
                          
                          {/* Task info on bar */}
                          <div className="absolute inset-0 flex items-center justify-between px-2">
                            <span className="text-[10px] text-white font-bold truncate">
                              {barWidth > 80 ? task.title : ''}
                            </span>
                            <span className="text-[10px] text-white font-bold">
                              {task.status === 'done' ? '✓' : task.progress ? `${task.progress}%` : ''}
                            </span>
                          </div>

                          {/* Task tooltip on hover */}
                          <div className="absolute hidden group-hover:block bottom-full left-0 mb-2 z-30 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3">
                            <div className="font-bold mb-1">{task.title}</div>
                            {task.description && (
                              <div className="text-gray-300 mb-2 line-clamp-2">{task.description}</div>
                            )}
                            <div className="space-y-1 text-gray-400">
                              <div>Status: <span className="text-white">{task.status}</span></div>
                              <div>Priority: <span className="text-white">{task.priority}</span></div>
                              {task.start_date && (
                                <div>Start: <span className="text-white">{new Date(task.start_date).toLocaleDateString()}</span></div>
                              )}
                              {task.due_date && (
                                <div>Due: <span className="text-white">{new Date(task.due_date).toLocaleDateString()}</span></div>
                              )}
                              {task.project_id?.name && (
                                <div>Project: <span className="text-white">{task.project_id.name}</span></div>
                              )}
                            </div>
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      ) : (
                        /* Show placeholder for tasks without dates */
                        <div className="absolute left-4 flex items-center gap-2">
                          <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-md border border-yellow-300 dark:border-yellow-700">
                            ⚠ No dates set
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Footer Stats */}
        <footer className="h-10 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-500 font-medium">
                Completed: {tasks.filter(t => t.status === 'done').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${currentColorScheme.primary}`}></div>
              <span className="text-xs text-gray-500 font-medium">
                In Progress: {tasks.filter(t => t.status === 'in_progress').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-500 font-medium">
                Critical: {tasks.filter(t => t.priority === 'urgent').length}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 italic">
            Last synced: Just now
          </div>
        </footer>
      </main>
    </div>
  );
};

export default ProjectGantt;
