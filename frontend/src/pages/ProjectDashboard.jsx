import { useState, useEffect } from 'react';
import { projectsApi } from '../api/projectsApi';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { Filter, Share2, FolderOpen, DollarSign, Users as UsersIcon, AlertTriangle, PieChart, TrendingUp, ArrowRight, MoreHorizontal, Mail, Plus, X, Edit, Trash2 } from 'lucide-react';

const ProjectDashboard = () => {
  const navigate = useNavigate();
  const { toggleMobileSidebar } = useSidebar();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
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
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projectsData, statsData] = await Promise.all([
        projectsApi.getAll(filters),
        projectsApi.getDashboardStats()
      ]);
      setProjects(projectsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
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
    setShowModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
      due_date: project.due_date ? new Date(project.due_date).toISOString().split('T')[0] : '',
      budget: project.budget || { allocated: 0, spent: 0, currency: 'USD' },
      progress: project.progress || 0
    });
    setShowModal(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await projectsApi.delete(projectId);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await projectsApi.update(editingProject._id, formData);
      } else {
        await projectsApi.create(formData);
      }
      setShowModal(false);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      active: 'bg-blue-100 text-[#135bec] dark:bg-[#135bec]/20',
      on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-500',
      archived: 'bg-gray-100 text-gray-700 dark:bg-gray-400/20 dark:text-gray-400'
    };
    return classes[status] || classes.active;
  };

  const getStatusBorderClass = (status) => {
    const borders = {
      active: 'border-[#135bec]',
      on_hold: 'border-amber-400',
      completed: 'border-emerald-500',
      archived: 'border-gray-400'
    };
    return borders[status] || borders.active;
  };

  const getProgressColor = (status) => {
    const colors = {
      active: 'bg-[#135bec]',
      on_hold: 'bg-amber-400',
      completed: 'bg-emerald-500',
      archived: 'bg-gray-400'
    };
    return colors[status] || colors.active;
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading && !stats) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#135bec]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#0d121b] dark:text-white">
            Project Dashboard
          </h2>
          <p className="text-[#4c669a] dark:text-gray-400 mt-1">
            Real-time overview of enterprise initiatives and resource velocity.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
            <Filter size={20} />
            <span>Filters</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
            <Share2 size={20} />
            <span>Export</span>
          </button>
          <button 
            onClick={handleCreateProject}
            className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-[#1a2234] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="size-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-[#135bec]">
              <FolderOpen size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Total Projects
              </p>
              <p className="text-2xl font-black text-[#0d121b] dark:text-white">
                {stats.projects.total}
              </p>
            </div>
            <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${
              stats.projects.change >= 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {stats.projects.change > 0 ? '+' : ''}{stats.projects.change}%
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a2234] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="size-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center text-orange-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Active Budget
              </p>
              <p className="text-2xl font-black text-[#0d121b] dark:text-white">
                {formatCurrency(stats.budget.spent)}
              </p>
            </div>
            <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${
              stats.budget.change >= 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {stats.budget.change > 0 ? '+' : ''}{stats.budget.change}%
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a2234] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="size-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600">
              <UsersIcon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Team Capacity
              </p>
              <p className="text-2xl font-black text-[#0d121b] dark:text-white">
                {stats.capacity.percentage}%
              </p>
            </div>
            <span className="ml-auto text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
              {stats.capacity.status}
            </span>
          </div>

          <div className="bg-white dark:bg-[#1a2234] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="size-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Critical Risks
              </p>
              <p className="text-2xl font-black text-[#0d121b] dark:text-white">
                {String(stats.risks.critical).padStart(2, '0')}
              </p>
            </div>
            <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${
              stats.risks.critical > 0 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {stats.risks.status}
            </span>
          </div>
        </div>
      )}

      {/* Dashboard Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Project Status Grid (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold dark:text-white">Active Projects</h3>
            <button className="text-sm font-bold text-[#135bec] hover:underline">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.slice(0, 4).map((project) => (
              <div
                key={project._id}
                className={`bg-white dark:bg-[#1a2234] rounded-xl border-l-4 ${getStatusBorderClass(project.status)} p-6 shadow-sm hover:shadow-md transition-shadow group cursor-pointer`}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`${getStatusBadgeClass(project.status)} text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                      className="p-1 text-gray-400 hover:text-[#135bec] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Edit project"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project._id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-bold mb-1 dark:text-white group-hover:text-[#135bec] transition-colors">
                  {project.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed">
                  {project.description}
                </p>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-400 uppercase tracking-tighter">Progress</span>
                    <span className={project.status === 'active' ? 'text-[#135bec]' : project.status === 'on_hold' ? 'text-amber-600' : project.status === 'completed' ? 'text-emerald-600' : 'text-gray-600'}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${getProgressColor(project.status)} h-full rounded-full`}
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex -space-x-2">
                      {project.team_members?.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="size-7 rounded-full border-2 border-white dark:border-[#1a2234] bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
                        >
                          {getUserInitials(member.user?.name)}
                        </div>
                      ))}
                      {project.team_members?.length > 3 && (
                        <div className="size-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-[#1a2234] flex items-center justify-center text-[10px] font-bold text-gray-500">
                          +{project.team_members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      Due: {formatDate(project.due_date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Widgets */}
        <div className="space-y-8">
          {/* Budget & Resource Summary */}
          {stats && (
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <PieChart size={20} className="text-[#135bec]" />
                Budget & Resources
              </h3>

              <div className="flex items-center justify-center py-4">
                <div className="relative size-32 rounded-full border-[10px] border-[#135bec] flex items-center justify-center border-t-gray-100 dark:border-t-gray-700 -rotate-45">
                  <div className="rotate-45 text-center">
                    <p className="text-xl font-black text-[#0d121b] dark:text-white">
                      {formatCurrency(stats.budget.spent)}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      Spent
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-gray-500">Utilization Rate</span>
                    <span className="text-[#0d121b] dark:text-gray-200">
                      {stats.budget.utilization}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#135bec] h-full rounded-full"
                      style={{ width: `${stats.budget.utilization}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-[#f6f6f8] dark:bg-gray-800/50 rounded-lg">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">
                      Total Allocated
                    </p>
                    <p className="text-sm font-black dark:text-white">
                      {formatCurrency(stats.budget.allocated)}
                    </p>
                  </div>
                  <div className="p-3 bg-[#f6f6f8] dark:bg-gray-800/50 rounded-lg">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">
                      Burn Rate/Mo
                    </p>
                    <p className="text-sm font-black dark:text-white">
                      {formatCurrency(stats.budget.spent / 6)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk & Blockers Panel */}
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Risk & Blockers
              </h3>
              {stats && stats.risks.critical > 0 && (
                <span className="bg-red-50 text-red-600 dark:bg-red-900/20 text-[10px] font-bold px-2 py-0.5 rounded">
                  {stats.risks.critical} Priority
                </span>
              )}
            </div>
            <div className="space-y-4">
              {projects
                .flatMap(p => p.risks?.filter(r => r.status === 'active' && (r.severity === 'high' || r.severity === 'critical')) || [])
                .slice(0, 3)
                .map((risk, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 p-3 ${risk.severity === 'critical' ? 'hover:bg-red-50 dark:hover:bg-red-900/10' : 'hover:bg-amber-50 dark:hover:bg-amber-900/10'} rounded-lg transition-colors cursor-pointer group ${idx > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}
                  >
                    <div className={`size-8 shrink-0 ${risk.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'} rounded flex items-center justify-center`}>
                      {risk.severity === 'critical' ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <TrendingUp size={18} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight dark:text-gray-200">
                        {risk.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{risk.description}</p>
                    </div>
                  </div>
                ))}
              {projects.flatMap(p => p.risks?.filter(r => r.status === 'active') || []).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active risks</p>
              )}
            </div>
            <button className="w-full mt-6 py-2 text-xs font-bold text-gray-400 hover:text-[#135bec] transition-colors border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-center gap-2">
              View All Issues
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
      </main>

      {/* Create/Edit Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-bold">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  rows="3"
                  placeholder="Enter project description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
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
                  <label className="block text-sm font-semibold mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Budget Allocated</label>
                  <input
                    type="number"
                    value={formData.budget.allocated}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      budget: { ...formData.budget, allocated: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#135bec] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
