import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { projectsApi } from '../api/projectsApi';
import api from '../api/axios';
import {
  Plus, Share2, Calendar, ChevronRight, Check, Loader, Database,
  Lock, MoreHorizontal, ChevronDown
} from 'lucide-react';

const ProjectGantt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeScale, setTimeScale] = useState('week'); // day, week, month, quarter
  const [showMilestones, setShowMilestones] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all projects for dropdown
      const allProjectsResponse = await projectsApi.getAll();
      setProjects(allProjectsResponse || []);
      
      if (projectId) {
        const projectData = await projectsApi.getById(projectId);
        setProject(projectData);
        setTasks(projectData.tasks || []);
      } else {
        // Fetch all tasks across projects
        const response = await api.get('/tasks');
        setTasks(response.data.tasks || []);
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
        return 'bg-[#135bec]';
      case 'review':
        return 'bg-purple-500';
      default:
        return 'bg-slate-400/40 border border-slate-400';
    }
  };

  const getTaskBarWidth = (task) => {
    // Simplified calculation - in real implementation, calculate based on date range
    if (!task.start_date || !task.due_date) return '120px';
    const start = new Date(task.start_date);
    const end = new Date(task.due_date);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    // Scale: 10px per day for week view
    return `${Math.max(40, diffDays * 10)}px`;
  };

  const getTaskBarPosition = (task) => {
    // Simplified - calculate offset from project start or current month
    // In real implementation, calculate based on actual dates
    return Math.floor(Math.random() * 400) + 20; // Random for demo
  };

  const getProgressWidth = (progress) => {
    return `${progress || 0}%`;
  };

  if (loading) {
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
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => navigate('/projects')} className="hover:text-[#135bec] transition-colors">
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
              className="ml-4 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(proj => (
                <option key={proj._id} value={proj._id}>{proj.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors">
              <Share2 size={18} />
              Export
            </button>
            <button className="bg-[#135bec] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <Plus size={18} />
              New Task
            </button>
          </div>
        </header>

        {/* Project Header & Controls */}
        <div className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 px-8 py-4 shrink-0">
          <h1 className="text-2xl font-bold mb-4">{project?.name || 'Project Timeline'}</h1>
          <div className="flex items-center justify-between">
            {/* Time Scale Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {['day', 'week', 'month', 'quarter'].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeScale === scale
                      ? 'bg-white dark:bg-gray-700 text-[#135bec] shadow-sm font-semibold'
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
                <button className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#135bec]">
                  <Calendar size={18} />
                  Today
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMilestones}
                  onChange={(e) => setShowMilestones(e.target.checked)}
                  className="w-4 h-4 text-[#135bec] rounded border-gray-300 focus:ring-[#135bec]"
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
          {tasks.length === 0 ? (
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
                  className="px-6 py-3 bg-[#135bec] text-white rounded-lg font-semibold hover:bg-blue-700"
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
              <div className="w-48 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Task Name</div>
              <div className="w-24 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700">Duration</div>
              <div className="flex-1 px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700">Assignee</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tasks.map((task, index) => (
                <div key={task._id} className="flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors h-10 group">
                  <div className="w-48 px-4 flex items-center gap-2">
                    <span className="text-sm font-medium truncate text-gray-700 dark:text-gray-300">
                      {task.title}
                    </span>
                  </div>
                  <div className={`w-24 px-4 text-sm border-l border-gray-100 dark:border-gray-800 ${
                    task.priority === 'urgent' ? 'text-red-500 font-medium' : 'text-gray-500'
                  }`}>
                    {getDuration(task)}
                  </div>
                  <div className="flex-1 px-4 border-l border-gray-100 dark:border-gray-800">
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <div className="flex -space-x-2">
                        {task.assigned_to.slice(0, 2).map((user, idx) => (
                          <div
                            key={idx}
                            className="h-6 w-6 rounded-full border-2 border-white dark:border-[#1a2234] bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
                          >
                            {getUserInitials(user.full_name || user.username)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Grid (Right Side) */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white dark:bg-[#1a2234]">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20">
              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-8">
                <div className="w-[280px] shrink-0 border-r border-gray-200 dark:border-gray-800 px-4 flex items-center text-xs font-bold text-gray-500">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </div>
                <div className="w-[280px] shrink-0 border-r border-gray-200 dark:border-gray-800 px-4 flex items-center text-xs font-bold text-gray-500">
                  {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </div>
                <div className="w-[280px] shrink-0 border-r border-gray-200 dark:border-gray-800 px-4 flex items-center text-xs font-bold text-gray-500">
                  {new Date(new Date().setMonth(new Date().getMonth() + 2)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </div>
              </div>
              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] h-8">
                <div className="flex w-[280px] justify-around items-center text-[10px] text-gray-400 font-medium px-2">
                  <span>1</span><span>8</span><span>15</span><span>22</span><span>29</span>
                </div>
                <div className="flex w-[280px] justify-around items-center text-[10px] text-gray-400 font-medium px-2">
                  <span>5</span><span>12</span><span>19</span><span>26</span>
                </div>
                <div className="flex w-[280px] justify-around items-center text-[10px] text-gray-400 font-medium px-2">
                  <span>3</span><span>10</span><span>17</span><span>24</span><span>31</span>
                </div>
              </div>
            </div>

            {/* Grid & Bars */}
            <div className="relative h-full" style={{
              backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '40px 100%'
            }}>
              {/* Current Time Indicator */}
              <div className="absolute left-[340px] top-0 bottom-0 w-px bg-[#135bec] z-10">
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-[#135bec] rounded-full ring-4 ring-[#135bec]/20"></div>
              </div>

              {/* Task Bars */}
              <div className="flex flex-col">
                {tasks.map((task, index) => {
                  const barColor = getTaskBarColor(task.status);
                  const barWidth = getTaskBarWidth(task);
                  const barPosition = getTaskBarPosition(task);
                  const progressWidth = getProgressWidth(task.progress || 0);

                  return (
                    <div key={task._id} className="h-10 border-b border-gray-100 dark:border-gray-800 flex items-center relative">
                      {task.status !== 'todo' && (
                        <div
                          className={`absolute h-6 ${barColor} rounded-md shadow-sm flex items-center overflow-hidden`}
                          style={{ 
                            left: `${barPosition}px`, 
                            width: barWidth 
                          }}
                        >
                          {task.status === 'in_progress' && task.progress && (
                            <div 
                              className="h-full bg-white/20" 
                              style={{ width: progressWidth }}
                            ></div>
                          )}
                          <div className="absolute inset-0 flex items-center px-2">
                            <span className="text-[10px] text-white font-bold uppercase tracking-tighter">
                              {task.status === 'done' ? '100%' : task.progress ? `${task.progress}%` : ''}
                            </span>
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
              <div className="w-3 h-3 rounded-full bg-[#135bec]"></div>
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
