import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import api from '@/shared/services/axios';
import { projectsApi } from '@/features/projects/services/projectsApi';
import { usePageShortcuts } from '@/shared/hooks/usePageShortcuts';
import ShortcutsOverlay from '@/features/tasks/components/ShortcutsOverlay';
import { useAuth } from '@/features/auth/context/AuthContext';
import { 
  FolderOpen, Calendar, Users, TrendingUp, 
  Filter, Search, ChevronRight, Circle, CheckCircle2,
  Clock, AlertCircle, Briefcase, Plus, X
} from 'lucide-react';

const MyProjects = () => {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const userRole = user?.role || 'member';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const searchInputRef = useRef(null);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const projectShortcuts = [
    { key: 'n', label: 'New Project',    description: 'Open the create project form', action: () => setShowCreateModal(true) },
    { key: '/', label: 'Focus Search',   description: 'Jump to the search input',     action: () => searchInputRef.current?.focus() },
    { key: 'f', label: 'Toggle Filters', description: 'Show/hide the filter panel',   action: () => setShowFilters((v) => !v) },
    { key: 'r', label: 'Refresh',        description: 'Reload all projects',           action: () => fetchMyProjects() },
  ];
  const { showHelp, setShowHelp } = usePageShortcuts(projectShortcuts);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    start_date: '',
    due_date: '',
    budget: { allocated: 0, spent: 0, currency: 'USD' },
    progress: 0
  });

  useEffect(() => {
    fetchMyProjects();
  }, [filters]);

  const fetchMyProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/my-projects', { params: filters });
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} className="text-green-600" />;
      case 'active':
        return <Circle size={20} className="text-blue-600" />;
      case 'on_hold':
        return <Clock size={20} className="text-amber-600" />;
      default:
        return <AlertCircle size={20} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-[#C4713A]/10 dark:bg-[#C4713A]/20 text-[#C4713A] dark:text-[#D4905A] border-[#C4713A]/20 dark:border-[#C4713A]/30',
      completed: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
      on_hold: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      archived: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    };
    return badges[status] || badges.active;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-blue-100 text-blue-700 border-blue-200',
      low: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return badges[priority] || badges.medium;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const getRoleDisplayText = (role) => {
    const roleTexts = {
      member: 'My Assigned Projects',
      team_lead: 'My Team\'s Projects',
      hr: 'All Projects',
      admin: 'All Projects'
    };
    return roleTexts[role] || 'My Projects';
  };

  const canCreateProjects = () => {
    return ['admin', 'hr', 'team_lead'].includes(userRole);
  };

  const handleCreateProject = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      budget: { allocated: 0, spent: 0, currency: 'USD' },
      progress: 0
    });
    setShowCreateModal(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    try {
      await projectsApi.create(formData);
      setShowCreateModal(false);
      fetchMyProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-transparent" style={{ borderBottomColor: 'var(--brand)' }}></div>
      </div>
    );
  }

  return (
    <ResponsivePageLayout
      title="My Projects"
      icon={Briefcase}
      actions={
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
          {canCreateProjects() && (
            <button
              onClick={handleCreateProject}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold bg-[#C4713A] text-white hover:bg-[#A35C28] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Plus size={14} />
              <span>New Project</span>
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--border-hair)] hover:text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Filter size={14} />
            <span>Filters</span>
            {(filters.status || filters.priority || filters.search) && (
              <span className="px-1.5 py-0.5 bg-[#C4713A] text-white text-[10px] font-bold rounded-full">
                On
              </span>
            )}
          </button>
        </div>
      }
    >
        <div className="space-y-6">
          {/* Filter Section */}
          {showFilters && (
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm" data-mobile-filter-panel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" data-mobile-filter-grid>
                <div className="col-span-2 lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Search Projects
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      placeholder="Search by name..."
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                      data-mobile-filter-input
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                    data-mobile-filter-input
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                    data-mobile-filter-input
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Projects Listing */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <FolderOpen size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Projects Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                {userRole === 'member' && 'You haven\'t been assigned to any projects yet.'}
                {userRole === 'team_lead' && 'No projects assigned to your team members yet.'}
                {(userRole === 'hr' || userRole === 'admin') && 'No projects in this workspace yet.'}
              </p>
            </div>
          ) : (
            isMobile ? (
              <div className="space-y-3" role="list" aria-label="Project cards">
                {projects.map((project) => (
                  <article
                    key={project._id}
                    role="listitem"
                    className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1a2234]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {getStatusIcon(project.status)}
                        <span className={`${getStatusBadge(project.status)} text-[10px] font-bold uppercase px-2 py-1 rounded border`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`${getPriorityBadge(project.priority)} text-[10px] font-bold uppercase px-2 py-1 rounded border`}>
                        {project.priority}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">{project.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {project.description || 'No description provided'}
                    </p>

                    <div className="mt-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="font-bold text-gray-900 dark:text-white">{project.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`${getProgressColor(project.progress)} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{project.team_members?.length || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(project.due_date)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/projects/${project._id}`)}
                        className="min-h-[48px] rounded-xl bg-[#C4713A] px-3 text-sm font-bold text-white hover:bg-[#A35C28]"
                        aria-label={`Open project ${project.name}`}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => navigate(`/projects/gantt?project=${project._id}`)}
                        className="min-h-[48px] rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                        aria-label={`View timeline for ${project.name}`}
                      >
                        Timeline
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(project.status)}
                        <span className={`${getStatusBadge(project.status)} text-xs font-bold uppercase px-2 py-1 rounded border`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`${getPriorityBadge(project.priority)} text-xs font-bold uppercase px-2 py-1 rounded border`}>
                        {project.priority}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#C4713A] transition-colors line-clamp-1">
                      {project.name}
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                      {project.description || 'No description provided'}
                    </p>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${getProgressColor(project.progress)} h-full rounded-full transition-all duration-300`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex -space-x-2">
                        {project.team_members?.slice(0, 3).map((member, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1a2234] bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
                            title={member.user?.full_name}
                          >
                            {getUserInitials(member.user?.full_name)}
                          </div>
                        ))}
                        {project.team_members?.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-[#1a2234] flex items-center justify-center text-xs font-bold text-gray-500">
                            +{project.team_members.length - 3}
                          </div>
                        )}
                        {(!project.team_members || project.team_members.length === 0) && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No team assigned</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar size={14} />
                        <span>{formatDate(project.due_date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-sm font-semibold text-[#C4713A] group-hover:gap-2 flex items-center gap-1 transition-all">
                        View Details
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Summary Stats */}
          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C4713A]/10 dark:bg-[#C4713A]/20 flex items-center justify-center">
                    <FolderOpen size={20} className="text-[#C4713A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projects.length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Projects</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projects.filter(p => p.status === 'active').length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <TrendingUp size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Progress</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <Users size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projects.reduce((sum, p) => sum + (p.team_members?.length || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Team Members</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isMobile && canCreateProjects() && (
            <button
              onClick={handleCreateProject}
              className="fixed bottom-24 right-4 z-40 min-h-[56px] rounded-2xl bg-[#C4713A] px-5 text-sm font-bold text-white shadow-lg shadow-[#C4713A]/30"
              aria-label="Create project"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New Project
              </span>
            </button>
          )}
        </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[var(--z-modal)]">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10 md:sticky md:top-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  placeholder="Enter project description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Budget Allocated
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.budget.allocated}
                    onChange={(e) => setFormData({ ...formData, budget: { ...formData.budget, allocated: parseFloat(e.target.value) || 0 }})}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#C4713A] focus:border-[#C4713A]"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#C4713A] text-white rounded-lg font-bold hover:bg-[#A35C28] transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help overlay */}
      <ShortcutsOverlay
        show={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={projectShortcuts}
        pageName="My Projects"
      />
    </ResponsivePageLayout>
  );
};

export default MyProjects;
