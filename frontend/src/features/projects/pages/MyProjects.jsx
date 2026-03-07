import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import api from '@/shared/services/axios';
import { projectsApi } from '@/features/projects/services/projectsApi';
import { usePageShortcuts } from '@/shared/hooks/usePageShortcuts';
import ShortcutsOverlay from '@/features/tasks/components/ShortcutsOverlay';
import { 
  FolderOpen, Calendar, Users, TrendingUp, 
  Filter, Search, ChevronRight, Circle, CheckCircle2,
  Clock, AlertCircle, Briefcase, Plus, X
} from 'lucide-react';

const MyProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState('member');
  const [userName, setUserName] = useState('');
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
    // Get user info from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.role || 'member');
      setUserName(user.name || user.full_name || 'User');
    }
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
    <ResponsivePageLayout title="My Projects" icon={Briefcase}>
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Briefcase size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-[#0d121b] dark:text-white">
                    {getRoleDisplayText(userRole)}
                  </h2>
                  <p className="text-[#4c669a] dark:text-gray-400 mt-1">
                    {userRole === 'member' && 'Projects you\'re assigned to'}
                    {userRole === 'team_lead' && 'Projects assigned to your team members'}
                    {(userRole === 'hr' || userRole === 'admin') && 'All workspace projects you can manage'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {canCreateProjects() && (
                <button 
                  onClick={handleCreateProject}
                  className="flex items-center gap-2 px-4 py-2 bg-[#C4713A] text-white rounded-lg text-sm font-bold hover:bg-[#A35C28] transition-all shadow-sm"
                >
                  <Plus size={20} />
                  <span>New Project</span>
                </button>
              )}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                <Filter size={20} />
                <span>Filters</span>
                {(filters.status || filters.priority || filters.search) && (
                  <span className="ml-1 px-2 py-0.5 bg-[#C4713A] text-white text-xs rounded-full">
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
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

          {/* Projects Grid */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => navigate(`/projects/${project._id}`)}
                  className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                >
                  {/* Header */}
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

                  {/* Project Name */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#C4713A] transition-colors line-clamp-1">
                    {project.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                    {project.description || 'No description provided'}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Progress
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${getProgressColor(project.progress)} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    {/* Team Members */}
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

                    {/* Due Date */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar size={14} />
                      <span>{formatDate(project.due_date)}</span>
                    </div>
                  </div>

                  {/* View Details Arrow */}
                  <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-semibold text-[#C4713A] group-hover:gap-2 flex items-center gap-1 transition-all">
                      View Details
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
        </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
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
