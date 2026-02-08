import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { projectsApi } from '../api/projectsApi';
import { 
  Info, CheckSquare, GitBranch, Users as UsersIcon, FileText, 
  Clock, Edit, Share2, Download, ChevronDown, Calendar,
  Check, Loader, Database, Lock, CheckCircle, Circle,
  DollarSign, MessageCircle, Plus
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getById(id);
      setProject(data);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-blue-500',
      on_hold: 'bg-amber-500',
      completed: 'bg-emerald-500',
      archived: 'bg-gray-500'
    };
    return colors[status] || colors.active;
  };

  const getStatusTextColor = (status) => {
    const colors = {
      active: 'text-blue-600 dark:text-blue-400',
      on_hold: 'text-amber-600 dark:text-amber-400',
      completed: 'text-emerald-600 dark:text-emerald-400',
      archived: 'text-gray-600 dark:text-gray-400'
    };
    return colors[status] || colors.active;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityTextColor = (priority) => {
    const colors = {
      urgent: 'text-red-600 dark:text-red-400',
      high: 'text-orange-600 dark:text-orange-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      low: 'text-green-600 dark:text-green-400'
    };
    return colors[priority] || colors.medium;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || !project) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#135bec]"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: tasks.length },
    { id: 'timeline', label: 'Timeline', icon: GitBranch },
    { id: 'team', label: 'Team', icon: UsersIcon },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Clock }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#101622]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <button onClick={() => navigate('/projects')} className="hover:text-[#135bec] transition-colors">
              Projects
            </button>
            <span className="text-gray-400">›</span>
            <span className="text-[#0d121b] dark:text-white font-medium">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-[#135bec] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <Plus size={18} />
              New Task
            </button>
          </div>
        </header>

        {/* Project Content */}
        <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Page Title & Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black tracking-tight text-[#0d121b] dark:text-white leading-none">
                  {project.name}
                </h2>
                <Edit size={20} className="text-gray-400 cursor-pointer hover:text-[#135bec] transition-colors" />
              </div>
              <p className="text-gray-500 font-medium">{project.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
                <Share2 size={18} />
                Share
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>

          {/* Meta Row (Status, Priority, Deadline, Completion) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-1 cursor-pointer hover:border-[#135bec]/40 transition-colors">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Status</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${getStatusColor(project.status)}`}></span>
                  <span className={`text-sm font-bold ${getStatusTextColor(project.status)}`}>
                    {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}
                  </span>
                </div>
                <ChevronDown size={18} className="text-gray-300" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-1 cursor-pointer hover:border-[#135bec]/40 transition-colors">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Priority</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${getPriorityColor(project.priority)}`}></span>
                  <span className={`text-sm font-bold ${getPriorityTextColor(project.priority)}`}>
                    {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                  </span>
                </div>
                <ChevronDown size={18} className="text-gray-300" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-1 cursor-pointer hover:border-[#135bec]/40 transition-colors">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Project Deadline</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <span className="text-sm font-bold">{formatDate(project.due_date)}</span>
                </div>
                <ChevronDown size={18} className="text-gray-300" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Completion</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#135bec] h-full" style={{ width: `${project.progress}%` }}></div>
                </div>
                <span className="text-sm font-bold">{project.progress}%</span>
              </div>
            </div>
          </div>

          {/* Tabbed Navigation Content */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800 flex items-center gap-8 px-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-[#135bec] text-[#135bec]'
                        : 'border-transparent text-gray-500 hover:text-[#0d121b] dark:hover:text-white'
                    } text-sm font-${activeTab === tab.id ? 'bold' : 'medium'} flex items-center gap-2 whitespace-nowrap transition-colors`}
                  >
                    <Icon size={20} />
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Milestone Path */}
                  <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold text-lg">Project Milestones</h3>
                    </div>
                    <div className="relative px-4 pb-4 overflow-x-auto">
                      <div className="flex items-center justify-between min-w-[600px] relative py-10">
                        {/* Connection Line */}
                        <div className="absolute h-0.5 bg-gray-200 dark:bg-gray-700 top-1/2 left-0 right-0" style={{ zIndex: 1 }}></div>
                        <div className="absolute h-0.5 bg-[#135bec] top-1/2 left-0" style={{ width: '45%', zIndex: 2 }}></div>

                        {/* Milestone Nodes - Example */}
                        <div className="relative z-10 flex flex-col items-center gap-3 w-32">
                          <div className="size-10 rounded-full bg-[#135bec] text-white flex items-center justify-center ring-4 ring-white dark:ring-gray-900">
                            <Check size={20} />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-bold text-[#135bec] uppercase tracking-tighter">Done</p>
                            <p className="text-xs font-bold">Planning</p>
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-3 w-32">
                          <div className="size-10 rounded-full bg-[#135bec] text-white flex items-center justify-center ring-4 ring-white dark:ring-gray-900">
                            <Loader size={20} />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-bold text-[#135bec] uppercase tracking-tighter">Current</p>
                            <p className="text-xs font-bold">Development</p>
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-3 w-32 opacity-50">
                          <div className="size-10 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center ring-4 ring-white dark:ring-gray-900">
                            <Database size={20} className="text-gray-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">Next</p>
                            <p className="text-xs font-bold">Testing</p>
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-3 w-32 opacity-50">
                          <div className="size-10 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center ring-4 ring-white dark:ring-gray-900">
                            <Lock size={20} className="text-gray-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">Final</p>
                            <p className="text-xs font-bold">Deployment</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Project Context */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-[#135bec]" />
                        Project Details
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <span className="ml-2 font-semibold">{formatDate(project.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <span className="ml-2 font-semibold">{formatDate(project.due_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Team Size:</span>
                          <span className="ml-2 font-semibold">{project.team_members?.length || 0} members</span>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-[#135bec]" />
                        Budget Utilization
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-2xl font-black">
                            {formatCurrency(project.budget?.spent || 0)}
                            <span className="text-xs font-normal text-gray-400"> / {formatCurrency(project.budget?.allocated || 0)}</span>
                          </p>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500 h-full"
                            style={{ 
                              width: `${project.budget?.allocated > 0 ? (project.budget.spent / project.budget.allocated * 100) : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  {/* Team Section */}
                  <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-sm">Project Team</h3>
                      <Plus size={18} className="text-gray-400 cursor-pointer" />
                    </div>
                    <div className="space-y-4">
                      {project.team_members?.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-gray-200">
                            {getUserInitials(member.user?.name)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{member.user?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                              {member.role || 'Member'}
                            </p>
                          </div>
                          <MessageCircle size={16} className="text-[#135bec]" />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Recent Activity Feed */}
                  <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 className="font-bold text-sm mb-4">Latest Activity</h3>
                    <div className="space-y-6 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-gray-800">
                      <div className="relative flex gap-4 pl-1">
                        <div className="size-[22px] rounded-full bg-blue-500 border-4 border-white dark:border-gray-900 z-10"></div>
                        <div className="flex-1">
                          <p className="text-xs text-[#0d121b] dark:text-gray-300 leading-snug">
                            <span className="font-bold">Project created</span>
                          </p>
                          <span className="text-[10px] text-gray-400">{formatDate(project.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Project Tasks</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                    <Plus size={18} />
                    Add Task
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 p-12 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <CheckSquare size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">No Tasks Yet</h4>
                    <p className="text-gray-500 mb-6">Create your first task to start tracking progress</p>
                    <button className="px-6 py-3 bg-[#135bec] text-white rounded-lg font-semibold hover:bg-blue-700">
                      Create First Task
                    </button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Task</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assignee</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {tasks.map((task) => (
                          <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => navigate(`/tasks?id=${task._id}`)}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  task.status === 'done' ? 'bg-emerald-500' :
                                  task.status === 'in_progress' ? 'bg-blue-500' :
                                  task.status === 'review' ? 'bg-purple-500' :
                                  'bg-gray-400'
                                }`}></div>
                                <span className="font-semibold">{task.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                task.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                task.status === 'review' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {task.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {task.priority.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {task.assigned_to && task.assigned_to[0] ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                    {getUserInitials(task.assigned_to[0].full_name || task.assigned_to[0].username)}
                                  </div>
                                  <span className="text-sm">{task.assigned_to[0].full_name || task.assigned_to[0].username}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Unassigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              {task.due_date ? formatDate(task.due_date) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Project Timeline</h3>
                  <button className="text-sm text-[#135bec] font-semibold hover:underline">View Gantt Chart</button>
                </div>
                <div className="space-y-6">
                  <div className="relative pl-8 pb-8 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-[#135bec] border-4 border-white dark:border-gray-900"></div>
                    <div className="mb-1 text-xs text-gray-500">{formatDate(project.start_date)}</div>
                    <h4 className="font-bold text-[#135bec]">Project Started</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Project kickoff and initial planning phase</p>
                  </div>
                  {tasks.filter(t => t.status === 'done').slice(0, 3).map((task, idx) => (
                    <div key={task._id} className="relative pl-8 pb-8 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-gray-900"></div>
                      <div className="mb-1 text-xs text-gray-500">{task.completed_at ? formatDate(task.completed_at) : formatDate(task.updated_at)}</div>
                      <h4 className="font-bold">{task.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Task completed successfully</p>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'in_progress').slice(0, 2).map((task) => (
                    <div key={task._id} className="relative pl-8 pb-8 border-l-2 border-dashed border-gray-300 dark:border-gray-700">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-900 animate-pulse"></div>
                      <div className="mb-1 text-xs text-gray-500">In Progress</div>
                      <h4 className="font-bold text-blue-600 dark:text-blue-400">{task.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Currently being worked on</p>
                    </div>
                  ))}
                  {project.due_date && (
                    <div className="relative pl-8">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700 border-4 border-white dark:border-gray-900"></div>
                      <div className="mb-1 text-xs text-gray-500">{formatDate(project.due_date)}</div>
                      <h4 className="font-bold text-gray-500">Target Completion</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Planned project completion date</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Team Members</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                    <Plus size={18} />
                    Add Member
                  </button>
                </div>
                {(!project.team_members || project.team_members.length === 0) ? (
                  <div className="bg-white dark:bg-gray-900 p-12 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <UsersIcon size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">No Team Members</h4>
                    <p className="text-gray-500 mb-6">Add team members to collaborate on this project</p>
                    <button className="px-6 py-3 bg-[#135bec] text-white rounded-lg font-semibold hover:bg-blue-700">
                      Add First Member
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.team_members.map((member, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {getUserInitials(member.user?.name || member.user?.email || 'U')}
                          </div>
                          <button className="text-gray-400 hover:text-red-600 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                        <h4 className="font-bold text-lg mb-1">{member.user?.name || 'Unknown User'}</h4>
                        <p className="text-sm text-gray-500 mb-3">{member.user?.email || ''}</p>
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold uppercase">
                            {member.role || 'Member'}
                          </span>
                          <button className="text-[#135bec] hover:underline text-sm font-semibold">
                            Edit Role
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Project Documents</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                    <Plus size={18} />
                    Upload Document
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-900 p-12 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} className="text-gray-400" />
                  </div>
                  <h4 className="text-lg font-bold mb-2">No Documents</h4>
                  <p className="text-gray-500 mb-6">Upload project documents, specifications, and files</p>
                  <button className="px-6 py-3 bg-[#135bec] text-white rounded-lg font-semibold hover:bg-blue-700">
                    Upload First Document
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold mb-6">Activity Feed</h3>
                <div className="space-y-6 relative before:content-[''] before:absolute before:left-[19px] before:top-8 before:bottom-8 before:w-[2px] before:bg-gray-200 dark:before:bg-gray-800">
                  <div className="relative flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold z-10">
                      <Check size={20} />
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="text-sm mb-1">
                        <span className="font-bold">Project created</span> by {project.created_by?.name || 'Admin'}
                      </p>
                      <span className="text-xs text-gray-500">{formatDate(project.created_at)}</span>
                    </div>
                  </div>
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task._id} className="relative flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold z-10 ${
                        task.status === 'done' ? 'bg-emerald-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}>
                        {task.status === 'done' ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="text-sm mb-1">
                          <span className="font-bold">Task {task.status === 'done' ? 'completed' : 'updated'}</span>: {task.title}
                        </p>
                        <span className="text-xs text-gray-500">{formatDate(task.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                  {project.updated_at && project.updated_at !== project.created_at && (
                    <div className="relative flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold z-10">
                        <Edit size={20} />
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="text-sm mb-1">
                          <span className="font-bold">Project updated</span>
                        </p>
                        <span className="text-xs text-gray-500">{formatDate(project.updated_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
