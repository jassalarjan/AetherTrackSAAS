import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/shared/services/axios';
import { usePageShortcuts } from '@/shared/hooks/usePageShortcuts';
import ShortcutsOverlay from '@/features/tasks/components/ShortcutsOverlay';
import { PageLoader } from '@/shared/components/ui/Spinner';
import { projectsApi } from '@/features/projects/services/projectsApi';
import useRealtimeSync from '@/shared/hooks/useRealtimeSync';
import { useTheme } from '@/app/providers/ThemeProvider';
import { Plus, X, Edit2, Trash2, MessageSquare, Search, ChevronDown, MoreHorizontal, CheckSquare, BarChart3, Bell, HelpCircle, Download, Grid3x3, Filter, Menu } from 'lucide-react';
import { ResponsivePageLayout, ResponsiveModal, ResponsiveCard, ResponsiveGrid } from '@/shared/components/responsive';
import TaskCard from '@/features/tasks/components/TaskCard';
import ProjectLabel from '@/features/projects/components/ProjectLabel';
import TeamLabel from '@/shared/components/layout/TeamLabel';
import SprintLabel from '@/features/projects/components/SprintLabel';
import ProgressBar from '@/shared/components/ui/ProgressBar';
import { useSidebar } from '@/features/workspace/context/SidebarContext';

const Tasks = () => {
  const { user, socket } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const selectedTaskRef = useRef(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    showMyTasksOnly: false,
    project: '',
    team: '',
    assigned_to: '',
    dueDateFrom: '',
    dueDateTo: '',
    search: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    project_id: '',
    team_id: '',
    sprint_id: '',
    progress: 0,
    assigned_to: [],
  });
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const searchInputRef = useRef(null);
  const currentUserId = user?._id || user?.id || null;
  const { isMobile } = useSidebar();

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const taskShortcuts = [
    { key: 'n', label: 'New Task',       description: 'Open the create task form',   action: () => setShowCreateModal(true) },
    { key: 'f', label: 'Toggle Filters', description: 'Show/hide the filter drawer', action: () => setShowFilterDrawer((v) => !v) },
    { key: '/', label: 'Focus Search',   description: 'Jump to the search input',    action: () => searchInputRef.current?.focus() },
    { key: 'r', label: 'Refresh',        description: 'Reload all tasks',            action: () => fetchTasks() },
  ];
  const { showHelp, setShowHelp } = usePageShortcuts(taskShortcuts);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchSprints();
    if (['admin', 'hr', 'team_lead'].includes(user?.role)) {
      fetchUsers();
      fetchTeams();
    }

    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
      searchParams.delete('create');
      setSearchParams(searchParams);
    }

    if (socket) {
      socket.on('task:created', (task) => {
        setTasks((prev) => [task, ...prev]);
      });

      socket.on('task:updated', (task) => {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? task : t))
        );
      });

      socket.on('comment:added', ({ taskId, comment }) => {
        // Update comments if the detail modal is open for this task
        if (selectedTaskRef.current && selectedTaskRef.current._id === taskId) {
          setComments((prev) => {
            // Avoid duplicates
            const exists = prev.some(c => c._id === comment._id);
            if (!exists) {
              return [comment, ...prev];
            }
            return prev;
          });
        }
        
        // Update the task's latest_comment in the task list
        setTasks((prev) =>
          prev.map((t) => {
            if (t._id === taskId) {
              return { ...t, latest_comment: comment };
            }
            return t;
          })
        );
      });

      return () => {
        socket.off('task:created');
        socket.off('task:updated');
        socket.off('comment:added');
      };
    }
  }, [socket]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  useRealtimeSync({
    onTaskCreated: () => fetchTasks(),
    onTaskUpdated: () => fetchTasks(),
    onTaskDeleted: () => fetchTasks(),
    onCommentAdded: () => fetchTasks(),
  });

  const applyFilters = useCallback(() => {
    let filtered = [...tasks];
    if (filters.project) {
      filtered = filtered.filter((t) => t.project_id && (t.project_id._id === filters.project || t.project_id === filters.project));
    }
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }
    if (filters.team) {
      filtered = filtered.filter((t) => t.team_id && (t.team_id._id === filters.team || t.team_id === filters.team));
    }
    if (filters.assigned_to) {
      filtered = filtered.filter((t) => t.assigned_to && t.assigned_to.some(u => (u._id || u) === filters.assigned_to));
    }
    if (filters.dueDateFrom) {
      filtered = filtered.filter((t) => t.due_date && new Date(t.due_date) >= new Date(filters.dueDateFrom));
    }
    if (filters.dueDateTo) {
      filtered = filtered.filter((t) => t.due_date && new Date(t.due_date) <= new Date(filters.dueDateTo));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    if (filters.showMyTasksOnly) {
      filtered = filtered.filter((t) => {
        if (!t.assigned_to) return false;
        const assignedIds = Array.isArray(t.assigned_to)
          ? t.assigned_to.map(u => typeof u === 'object' ? u._id : u)
          : [typeof t.assigned_to === 'object' ? t.assigned_to._id : t.assigned_to];
        const isAssignedToUser = currentUserId ? assignedIds.includes(currentUserId) : false;
        if (user?.role === 'member') {
          const belongsToUserTeam = user.team_id && t.team_id &&
            (t.team_id._id === user.team_id || t.team_id === user.team_id);
          return isAssignedToUser && belongsToUserTeam;
        }
        return isAssignedToUser;
      });
    }
    setFilteredTasks(filtered);
  }, [tasks, filters, currentUserId, user?.role, user?.team_id]);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.tasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const endpoint = user?.role === 'team_lead' ? '/users/team-members' : '/users';
      const response = await api.get(endpoint);
      setUsers(response.data.users);
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching users:', error);
      }
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchSprints = async () => {
    try {
      const response = await api.get('/sprints');
      setSprints(response.data.sprints || []);
    } catch (error) {
      console.error('Error fetching sprints:', error);
      setSprints([]);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        due_date: '',
        project_id: '',
        team_id: '',
        sprint_id: '',
        progress: 0,
        assigned_to: [],
      });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, ...updates } : t))
    );

    try {
      const response = await api.patch(`/tasks/${taskId}`, updates);
      const updatedTask = response.data.task;

      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? updatedTask : t))
      );

      if (selectedTask?._id === taskId) {
        setSelectedTask(updatedTask);
        selectedTaskRef.current = updatedTask;
      }
      if (editingTask?._id === taskId) {
        setEditingTask(updatedTask);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert(error.response?.data?.message || 'Failed to update task');
      fetchTasks();
    }
  };

  const openEditModal = (task) => {
    const taskTeam = teams.find(t => t._id === (task.team_id?._id || task.team_id));
    let members = taskTeam ? taskTeam.members : [];

    if (taskTeam && user?.role === 'team_lead') {
      const teamLeadAlreadyIncluded = currentUserId ? members.some(member => member._id === currentUserId) : false;
      if (!teamLeadAlreadyIncluded && taskTeam.lead_id?._id === currentUserId) {
        members = [
          ...members,
          {
            _id: currentUserId,
            full_name: user.full_name || user.username || user.email,
            role: user.role,
            email: user.email
          }
        ];
      }
    }

    setSelectedTeamMembers(members);
    setEditingTask({
      ...task,
      assigned_to: task.assigned_to ? (Array.isArray(task.assigned_to) ? task.assigned_to.map(u => u._id || u) : [task.assigned_to._id || task.assigned_to]) : [],
      team_id: task.team_id?._id || task.team_id || '',
    });
    setShowEditModal(true);
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        status: editingTask.status,
        due_date: editingTask.due_date,
        team_id: editingTask.team_id,
        assigned_to: editingTask.assigned_to,
      };

      await api.patch(`/tasks/${editingTask._id}`, updates);
      setShowEditModal(false);
      setEditingTask(null);
      setSelectedTeamMembers([]);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleTeamChange = (teamId) => {
    const selectedTeam = teams.find(team => team._id === teamId);
    let members = selectedTeam ? selectedTeam.members : [];

    if (selectedTeam && user?.role === 'team_lead') {
      const teamLeadAlreadyIncluded = currentUserId ? members.some(member => member._id === currentUserId) : false;
      if (!teamLeadAlreadyIncluded && selectedTeam.lead_id?._id === currentUserId) {
        members = [
          ...members,
          {
            _id: currentUserId,
            full_name: user.full_name || user.username || user.email,
            role: user.role,
            email: user.email
          }
        ];
      }
    }

    setSelectedTeamMembers(members);
    const memberIds = members.map(m => m._id);
    const currentAssigned = editingTask.assigned_to || [];
    const validAssignments = currentAssigned.filter(id => memberIds.includes(id));

    setEditingTask({
      ...editingTask,
      team_id: teamId,
      assigned_to: validAssignments
    });
  };

  const handleMemberToggle = (memberId) => {
    const currentAssigned = editingTask.assigned_to || [];
    const isSelected = currentAssigned.includes(memberId);

    if (isSelected) {
      setEditingTask({
        ...editingTask,
        assigned_to: currentAssigned.filter(id => id !== memberId)
      });
    } else {
      setEditingTask({
        ...editingTask,
        assigned_to: [...currentAssigned, memberId]
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      setShowDetailModal(false);
      setSelectedTask(null);
      selectedTaskRef.current = null;
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const viewTaskDetails = async (task) => {
    setSelectedTask(task);
    selectedTaskRef.current = task;
    setShowDetailModal(true);

    try {
      const response = await api.get(`/comments/${task._id}/comments`);
      setComments(response.data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await api.post(`/comments/${selectedTask._id}/comments`, {
        content: newComment,
      });
      setNewComment('');

      // Add the new comment to the list immediately
      if (response.data.comment) {
        setComments((prev) => [response.data.comment, ...prev]);
        
        // Update the task's latest_comment
        setTasks((prev) =>
          prev.map((t) => {
            if (t._id === selectedTask._id) {
              return { ...t, latest_comment: response.data.comment };
            }
            return t;
          })
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      todo: 'bg-[#282f39] text-[#9da8b9] border-[#4b5563]/30',
      in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      archived: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return badges[status] || badges.todo;
  };

  const getStatusLabel = (status) => {
    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
      archived: 'Archived',
    };
    return labels[status] || 'Unknown';
  };

  const getPriorityDot = (priority) => {
    const dots = {
      low: 'bg-slate-500',
      medium: 'bg-orange-400',
      high: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
      urgent: 'bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.6)]',
    };
    return dots[priority] || dots.medium;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    };
    return labels[priority] || 'Medium';
  };

  const canEditTask = (task) => {
    if (['admin', 'hr', 'team_lead'].includes(user?.role)) return true;

    const createdById = task?.created_by?._id || task?.created_by;
    const assignedIds = Array.isArray(task?.assigned_to)
      ? task.assigned_to.map((u) => (typeof u === 'object' ? u._id : u))
      : (task?.assigned_to ? [typeof task.assigned_to === 'object' ? task.assigned_to._id : task.assigned_to] : []);

    return currentUserId ? (createdById === currentUserId || assignedIds.includes(currentUserId)) : false;
  };

  const canDeleteTask = (task) => {
    if (['admin', 'hr', 'team_lead'].includes(user?.role)) return true;
    const createdById = task?.created_by?._id || task?.created_by;
    return currentUserId ? createdById === currentUserId : false;
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Status popover state for inline table status change
  const [statusPopover, setStatusPopover] = useState(null); // { taskId, anchorRect }

  // Derived pagination values — reset to page 1 whenever filters / rowsPerPage change
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTasks = filteredTasks.slice(
    (safeCurrentPage - 1) * rowsPerPage,
    safeCurrentPage * rowsPerPage
  );

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.team,
    filters.assigned_to,
    filters.project,
    filters.dueDateFrom,
    filters.dueDateTo,
    filters.search,
  ].filter(Boolean).length;
  const taskSummary = {
    total: filteredTasks.length,
    mine: filteredTasks.filter((task) => Array.isArray(task.assigned_to) && task.assigned_to.some((u) => (u._id || u) === currentUserId)).length,
    inProgress: filteredTasks.filter((task) => task.status === 'in_progress').length,
    overdue: filteredTasks.filter((task) => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done').length,
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <ResponsivePageLayout
        title="Tasks"
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 h-11 bg-[#C4713A] hover:bg-[#A35C28] text-white text-sm font-semibold px-4 rounded-lg transition-colors shadow-md shadow-[#C4713A]/25 focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        }
      >
        {/* Search and Filters */}
        <div className="mb-6 space-y-3" data-mobile-filter-shell>
          <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible" data-mobile-filter-row>
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search tasks..."
                className="w-full h-10 pl-9 pr-4 bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:border-transparent focus:ring-offset-0 transition-[border-color,box-shadow]"
                data-mobile-filter-input
              />
            </div>
            <button
              onClick={() => setShowFilterDrawer(true)}
              className="lg:hidden inline-flex items-center justify-center gap-2 h-10 px-4 bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg hover:border-[#C4713A] transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 flex-shrink-0"
              data-mobile-filter-input
            >
              <Filter size={16} />
              <span className="text-sm">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 bg-[#C4713A] text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {isMobile && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Visible Tasks</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{taskSummary.total}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Mine</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{taskSummary.mine}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">In Progress</p>
                <p className="mt-2 text-2xl font-bold text-[var(--brand)]">{taskSummary.inProgress}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Overdue</p>
                <p className="mt-2 text-2xl font-bold text-[var(--danger)]">{taskSummary.overdue}</p>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="h-10 px-3 bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="h-10 px-3 bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {projects.length > 0 && (
              <select
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                className={`h-10 px-3 border rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow] ${
                  filters.project
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 font-medium'
                    : 'bg-[var(--bg-raised)] border-[var(--border-soft)] text-[var(--text-primary)]'
                }`}
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            )}

            {['admin', 'hr', 'team_lead'].includes(user?.role) && teams.length > 0 && (
              <select
                value={filters.team}
                onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                className="h-10 px-3 bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
              >
                <option value="">All Teams</option>
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>{team.name}</option>
                ))}
              </select>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ ...filters, status: '', priority: '', project: '', team: '', assigned_to: '', dueDateFrom: '', dueDateTo: '', search: '' })}
                className="h-10 px-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <X size={14} />
                Clear filters
                <span className="min-w-[18px] h-[18px] px-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[10px] font-bold rounded-full inline-flex items-center justify-center">{activeFilterCount}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Card Grid (< 1025px) */}
        <div style={{ display: isMobile ? 'block' : 'none' }} className="w-full">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-[var(--border-soft)]">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-raised)] flex items-center justify-center mb-4">
                <CheckSquare size={24} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No tasks found</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4 max-w-[240px]">Adjust your filters or create a new task to get started.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#C4713A] hover:bg-[#A35C28] text-white text-sm font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
              >
                <Plus size={15} />
                Create your first task
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-20">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onClick={() => viewTaskDetails(task)}
                  onEdit={() => openEditModal(task)}
                  onDelete={() => handleDeleteTask(task._id)}
                  onStatusChange={(status) => handleUpdateTask(task._id, { status })}
                  canEdit={canEditTask(task)}
                  canDelete={canDeleteTask(task)}
                  getUserInitials={getUserInitials}
                  className="min-h-[200px]"
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table (>= 1025px) */}
        <div style={{ display: !isMobile ? 'block' : 'none' }}>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-base)]">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-raised)] flex items-center justify-center mb-4">
                <CheckSquare size={28} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No tasks found</h3>
              <p className="text-sm text-[var(--text-muted)] mb-5 max-w-xs">Your filter returned no results, or no tasks have been created yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 h-10 px-5 bg-[#C4713A] hover:bg-[#A35C28] text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-[#C4713A]/25 focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
              >
                <Plus size={16} />
                Create your first task
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[var(--bg-raised)] shadow-[0_1px_0_var(--border-soft)]">
                  <tr>
                    <th className="py-3 pl-5 pr-3 w-10">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-[var(--border-soft)] bg-transparent text-[#C4713A] focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider cursor-pointer group hover:text-[var(--text-primary)] transition-colors">
                      <div className="flex items-center gap-1">
                        Task
                        <ChevronDown size={13} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-28">Project</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-28">Team</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-28">Sprint</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-24">Priority</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-32">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-36">Progress</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-36">Assignee</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-28">Due Date</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-16 text-center">
                      <MessageSquare size={13} className="inline" />
                    </th>
                    <th className="py-3 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task, index) => (
                    <tr
                      key={task._id}
                      className={`group transition-colors cursor-pointer hover:bg-[var(--bg-surface)] ${
                        index % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : 'bg-transparent'
                      }`}
                      onClick={() => viewTaskDetails(task)}
                    >
                      <td className="py-0 pl-5 pr-3 h-12" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="size-4 rounded border-[var(--border-soft)] bg-transparent text-[#C4713A] focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-0 px-4 h-12">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-[var(--text-primary)] leading-snug">{task.title}</span>
                          {task.description && (
                            <span className="text-xs text-[var(--text-muted)] line-clamp-1 leading-snug">{task.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-0 px-4 h-12">
                        {task.project_id
                          ? <ProjectLabel project={task.project_id} size="sm" showIcon={false} />
                          : <span className="text-xs text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="py-0 px-4 h-12">
                        {task.team_id
                          ? <TeamLabel team={task.team_id} size="sm" showIcon={false} />
                          : <span className="text-xs text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="py-0 px-4 h-12">
                        {task.sprint_id
                          ? <SprintLabel sprint={task.sprint_id} size="sm" showIcon={false} />
                          : <span className="text-xs text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="py-0 px-4 h-12">
                        <div className="flex items-center gap-1.5">
                          <div className={`size-2 rounded-full flex-shrink-0 ${getPriorityDot(task.priority)}`} />
                          <span className="text-xs text-[var(--text-secondary)]">{getPriorityLabel(task.priority)}</span>
                        </div>
                      </td>
                      {/* Status pill — click opens a small popover overlay */}
                      <td className="py-0 px-4 h-12" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setStatusPopover(statusPopover?.taskId === task._id ? null : { taskId: task._id, rect });
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 ${getStatusBadge(task.status)}`}
                        >
                          {getStatusLabel(task.status)}
                          <ChevronDown size={11} className="opacity-60" />
                        </button>
                      </td>
                      <td className="py-0 px-4 h-12">
                        <div className="w-full min-w-[100px]">
                          <ProgressBar progress={task.progress || 0} size="sm" showPercentage={false} animated={false} />
                        </div>
                      </td>
                      <td className="py-0 px-4 h-12">
                        {task.assigned_to && task.assigned_to.length > 0 ? (
                          <div className="flex items-center">
                            <div className="flex -space-x-1.5">
                              {task.assigned_to.slice(0, 3).map((assignee, i) => (
                                <div
                                  key={assignee._id || i}
                                  title={assignee.full_name}
                                  className="size-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border-2 border-[var(--bg-base)] flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0"
                                >
                                  {getUserInitials(assignee.full_name)}
                                </div>
                              ))}
                            </div>
                            {task.assigned_to.length > 3 && (
                              <span className="ml-1.5 text-[10px] text-[var(--text-muted)] font-medium">+{task.assigned_to.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-0 px-4 h-12">
                        <span className={`text-xs ${
                          task.due_date && new Date(task.due_date) < new Date()
                            ? 'text-red-400 font-medium'
                            : 'text-[var(--text-muted)]'
                        }`}>
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'No date'}
                        </span>
                      </td>
                      <td className="py-0 px-4 h-12 text-center">
                        {task.latest_comment ? (
                          <div
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-raised)] text-[var(--text-secondary)]"
                            title={`Latest: ${task.latest_comment.content.slice(0, 60)}`}
                          >
                            <MessageSquare size={11} />
                            <span className="text-[10px] font-semibold">1</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-0 px-4 h-12" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                          {canEditTask(task) && (
                            <button
                              onClick={() => openEditModal(task)}
                              className="w-11 h-11 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDeleteTask(task) && (
                            <button
                              onClick={() => handleDeleteTask(task._id)}
                              className="w-11 h-11 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => viewTaskDetails(task)}
                            className="w-11 h-11 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
                            title="More"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between text-sm text-[var(--text-muted)] flex-wrap gap-3">
          <span className="text-xs">
            Showing{' '}
            <span className="font-medium text-[var(--text-primary)]">
              {filteredTasks.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1}–{Math.min(safeCurrentPage * rowsPerPage, filteredTasks.length)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-[var(--text-primary)]">{filteredTasks.length}</span>{' '}
            task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 px-2 text-xs bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[var(--bg-raised)] transition-colors"
                aria-label="Previous page"
              >
                <ChevronDown size={14} className="rotate-90" />
              </button>
              <span className="text-xs px-2">{safeCurrentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[var(--bg-raised)] transition-colors"
                aria-label="Next page"
              >
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </ResponsivePageLayout>

      {/* Status popover */}
      {statusPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setStatusPopover(null)}
          />
          <div
            className="fixed z-50 min-w-[140px] bg-[var(--bg-raised)] border border-[var(--border-soft)] rounded-xl shadow-xl overflow-hidden"
            style={{
              top: statusPopover.rect.bottom + 6,
              left: statusPopover.rect.left,
            }}
          >
            {['todo', 'in_progress', 'review', 'done', 'archived'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  handleUpdateTask(statusPopover.taskId, { status: s });
                  setStatusPopover(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--bg-surface)] transition-colors text-left ${
                  s === filteredTasks.find((t) => t._id === statusPopover.taskId)?.status
                    ? 'font-semibold text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(s)}`}>
                  {getStatusLabel(s)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mobile Filter Drawer */}
      {showFilterDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setShowFilterDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-[var(--bg-raised)] shadow-2xl z-50 lg:hidden flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Filters</h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                  >
                    <option value="">All Status</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {projects.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Project</label>
                    <select
                      value={filters.project}
                      onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                      className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                    >
                      <option value="">All Projects</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {['admin', 'hr', 'team_lead'].includes(user?.role) && teams.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Team</label>
                    <select
                      value={filters.team}
                      onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                      className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                    >
                      <option value="">All Teams</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {['admin', 'hr', 'team_lead'].includes(user?.role) && users.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Assigned To</label>
                    <select
                      value={filters.assigned_to}
                      onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}
                      className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                    >
                      <option value="">All Users</option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Due Date From</label>
                  <input
                    type="date"
                    value={filters.dueDateFrom}
                    onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value })}
                    className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-[var(--text-primary)] mb-2`}>Due Date To</label>
                  <input
                    type="date"
                    value={filters.dueDateTo}
                    onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value })}
                    className={`w-full px-3 py-2 bg-[var(--bg-base)] border-[var(--border-soft)] text-[var(--text-primary)] border rounded-lg focus:ring-2 focus:ring-[#C4713A] focus:border-transparent`}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-[var(--border-soft)] space-y-2.5">
                <button
                  onClick={() => {
                    setFilters({ ...filters, status: '', priority: '', project: '', team: '', assigned_to: '', dueDateFrom: '', dueDateTo: '', search: '' });
                    setShowFilterDrawer(false);
                  }}
                  className="w-full min-h-[44px] px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-raised)] rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="w-full min-h-[44px] px-4 py-2 bg-[#C4713A] text-white rounded-lg hover:bg-[#A35C28] transition-colors text-sm font-semibold focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
                >
                  Apply Filters
                </button>
              </div>
          </div>
        </>
      )}
      <ResponsiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
        size="large"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
              required
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow] resize-none"
              rows="3"
              placeholder="Add a description (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Project *</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Due Date *</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Sprint (Optional)</label>
            <select
              value={formData.sprint_id}
              onChange={(e) => setFormData({ ...formData, sprint_id: e.target.value })}
              className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
            >
              <option value="">No Sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint._id} value={sprint._id}>{sprint.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Progress: {formData.progress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#C4713A]"
            />
          </div>

          {['admin', 'hr', 'team_lead'].includes(user?.role) && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Select Team</label>
                <select
                  value={formData.team_id}
                  onChange={(e) => {
                    const teamId = e.target.value;
                    const selectedTeam = teams.find(team => team._id === teamId);
                    let members = selectedTeam ? selectedTeam.members : [];

                    if (selectedTeam && user?.role === 'team_lead') {
                      const teamLeadAlreadyIncluded = currentUserId ? members.some(member => member._id === currentUserId) : false;
                      if (!teamLeadAlreadyIncluded && selectedTeam.lead_id?._id === currentUserId) {
                        members = [
                          ...members,
                          {
                            _id: currentUserId,
                            full_name: user.full_name || user.username || user.email,
                            role: user.role,
                            email: user.email
                          }
                        ];
                      }
                    }

                    setSelectedTeamMembers(members);
                    setFormData({ ...formData, team_id: teamId, assigned_to: [] });
                  }}
                  className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                >
                  <option value="">No Team</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>{team.name}</option>
                  ))}
                </select>
              </div>

              {formData.team_id && selectedTeamMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Assign Team Members</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-[var(--border-soft)] bg-[var(--bg-base)] rounded-lg p-2">
                    {selectedTeamMembers.map((member) => (
                      <label key={member._id} className="flex items-center gap-2.5 min-h-[40px] cursor-pointer hover:bg-[var(--bg-raised)] rounded-lg px-2 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.assigned_to.includes(member._id)}
                          onChange={() => {
                            const currentAssigned = formData.assigned_to;
                            const isSelected = currentAssigned.includes(member._id);
                            if (isSelected) {
                              setFormData({ ...formData, assigned_to: currentAssigned.filter(id => id !== member._id) });
                            } else {
                              setFormData({ ...formData, assigned_to: [...currentAssigned, member._id] });
                            }
                          }}
                          className="rounded border-[var(--border-soft)] text-[#C4713A] focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 w-4 h-4"
                        />
                        <span className="text-sm text-[var(--text-primary)]">
                          {member.full_name} <span className="text-[var(--text-muted)] text-xs">({member.role})</span>
                          {member._id === currentUserId && <span className="text-[#C4713A] font-medium text-xs"> (You)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </form>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 mt-4 border-t border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="w-full sm:w-auto h-10 px-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm font-medium rounded-lg transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleCreateTask}
            className="w-full sm:w-auto h-10 px-6 bg-[#C4713A] hover:bg-[#A35C28] text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-[#C4713A]/25 focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
          >
            Create Task
          </button>
        </div>
      </ResponsiveModal>

      {/* Edit Task Modal */}
      <ResponsiveModal
        isOpen={showEditModal && editingTask}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        title="Edit Task"
        size="large"
      >
        {editingTask && (
          <form onSubmit={handleEditTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Title *</label>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
              <textarea
                value={editingTask.description}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow] resize-none"
                rows="4"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Priority</label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Project *</label>
              <select
                value={editingTask.project_id?._id || editingTask.project_id || ''}
                onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                required
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Due Date *</label>
              <input
                type="date"
                value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                required
              />
            </div>

            {['admin', 'hr', 'team_lead'].includes(user?.role) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Select Team</label>
                  <select
                    value={editingTask.team_id || ''}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                  >
                    <option value="">No Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                {editingTask.team_id && selectedTeamMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Assign Team Members</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-[var(--border-soft)] bg-[var(--bg-base)] rounded-lg p-2">
                      {selectedTeamMembers.map((member) => (
                        <label key={member._id} className="flex items-center gap-2.5 min-h-[40px] cursor-pointer hover:bg-[var(--bg-raised)] rounded-lg px-2 transition-colors">
                          <input
                            type="checkbox"
                            checked={editingTask.assigned_to.includes(member._id)}
                            onChange={() => handleMemberToggle(member._id)}
                            className="rounded border-[var(--border-soft)] text-[#C4713A] focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 w-4 h-4"
                          />
                          <span className="text-sm text-[var(--text-primary)]">
                            {member.full_name} <span className="text-[var(--text-muted)] text-xs">({member.role})</span>
                            {member._id === currentUserId && <span className="text-[#C4713A] font-medium text-xs"> (You)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </form>
        )}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 mt-4 border-t border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => { setShowEditModal(false); setEditingTask(null); }}
            className="w-full sm:w-auto h-10 px-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] border border-[var(--border-soft)] text-[var(--text-primary)] text-sm font-medium rounded-lg transition-colors focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleEditTask}
            className="w-full sm:w-auto h-10 px-6 bg-[#C4713A] hover:bg-[#A35C28] text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-[#C4713A]/25 focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
          >
            Update Task
          </button>
        </div>
      </ResponsiveModal>

      {/* Task Detail Modal */}
      <ResponsiveModal
        isOpen={showDetailModal && selectedTask}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTask(null);
          selectedTaskRef.current = null;
          setComments([]);
        }}
        title={selectedTask?.title || 'Task Details'}
        size="large"
      >
        {selectedTask && (
          <div className="space-y-5">
            {/* Description */}
            {selectedTask.description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{selectedTask.description}</p>
            )}

            {/* Status + Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Status</label>
                {canEditTask(selectedTask) ? (
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTask(selectedTask._id, { status: e.target.value })}
                    className="w-full h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent transition-[border-color,box-shadow]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="archived">Archived</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedTask.status)}`}>
                    {getStatusLabel(selectedTask.status)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Priority</label>
                <div className="flex items-center gap-2 h-10">
                  <div className={`size-3 rounded-full flex-shrink-0 ${getPriorityDot(selectedTask.priority)}`} />
                  <span className="text-sm text-[var(--text-secondary)] font-medium">{getPriorityLabel(selectedTask.priority)}</span>
                </div>
              </div>
            </div>

            {/* Metadata info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-soft)]">
                <div className="w-7 h-7 rounded-md bg-[var(--bg-raised)] flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Created by</p>
                  <p className="text-sm text-[var(--text-primary)] font-medium truncate">{selectedTask.created_by?.full_name || 'Unknown'}</p>
                </div>
              </div>

              {selectedTask.team_id && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-soft)]">
                  <div className="w-7 h-7 rounded-md bg-[var(--bg-raised)] flex items-center justify-center flex-shrink-0">
                    <Grid3x3 size={14} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Team</p>
                    <p className="text-sm text-[var(--text-primary)] font-medium truncate">{selectedTask.team_id.name}</p>
                  </div>
                </div>
              )}

              {selectedTask.due_date && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-soft)]">
                  <div className="w-7 h-7 rounded-md bg-[var(--bg-raised)] flex items-center justify-center flex-shrink-0">
                    <Bell size={14} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Due Date</p>
                    <p className={`text-sm font-medium ${new Date(selectedTask.due_date) < new Date() ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                      {new Date(selectedTask.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-soft)]">
                <div className="w-7 h-7 rounded-md bg-[var(--bg-raised)] flex items-center justify-center flex-shrink-0">
                  <CheckSquare size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Created</p>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{new Date(selectedTask.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Assigned to */}
            {selectedTask.assigned_to && selectedTask.assigned_to.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Assigned To</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.assigned_to.map((u) => (
                    <div key={u._id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-base)] border border-[var(--border-soft)] rounded-lg">
                      <div className="size-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                        {getUserInitials(u.full_name)}
                      </div>
                      <span className="text-xs text-[var(--text-primary)] font-medium">{u.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="border-t border-[var(--border-soft)] pt-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-4">
                <MessageSquare size={15} />
                Comments
                {comments.length > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-[var(--bg-raised)] text-[var(--text-muted)] text-[10px] font-bold rounded-full inline-flex items-center justify-center">{comments.length}</span>
                )}
              </h3>

              <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-4 text-center">No comments yet — be the first to comment.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment._id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-[#C4713A] flex items-center justify-center text-[11px] text-white font-bold flex-shrink-0 mt-0.5">
                        {getUserInitials(comment.author_id?.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.author_id?.full_name || 'Unknown'}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{new Date(comment.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 h-10 px-3 bg-[var(--bg-base)] border border-[var(--border-soft)] border-r-0 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-l-lg text-sm focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0 focus:border-transparent focus:z-10 transition-[border-color,box-shadow]"
                />
                <button
                  type="submit"
                  className="h-10 px-4 bg-[#C4713A] hover:bg-[#A35C28] text-white text-sm font-semibold rounded-r-lg transition-colors flex-shrink-0 focus:ring-2 focus:ring-[#C4713A] focus:ring-offset-0"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* Keyboard shortcuts help overlay */}
      <ShortcutsOverlay
        show={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={taskShortcuts}
        pageName="Tasks"
      />
    </>
  );
};

export default Tasks;
