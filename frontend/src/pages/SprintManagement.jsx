import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import {
  Plus, ChevronRight, Info, Flag, CheckCircle, Circle,
  ArrowUp, Minus, Check
} from 'lucide-react';

const SprintManagement = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sprintGoals, setSprintGoals] = useState([
    { id: 1, text: 'Security Audit Phase 1', completed: true },
    { id: 2, text: 'API Documentation Live', completed: false },
    { id: 3, text: 'UAT Sign-off by Client', completed: false },
    { id: 4, text: 'Deploy to Staging', completed: false }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksResponse, projectsResponse] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects')
      ]);
      setTasks(tasksResponse.data.tasks || []);
      const projectsList = projectsResponse.data || [];
      setProjects(projectsList);
      if (projectsList.length > 0) {
        setSelectedProject(projectsList[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <ArrowUp size={16} className="text-red-600 dark:text-red-400" />;
    }
    return <Minus size={16} className="text-gray-500" />;
  };

  const getPriorityText = (priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getStatusBadge = (status) => {
    const badges = {
      todo: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 dark:bg-blue-900/20 text-[#135bec] border-[#135bec]/20',
      review: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200',
      done: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200'
    };
    return badges[status] || badges.todo;
  };

  const getStatusText = (status) => {
    const texts = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done'
    };
    return texts[status] || status;
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const totalStoryPoints = tasks.length * 3; // Simplified calculation
  const completedPoints = tasks.filter(t => t.status === 'done').length * 3;
  const velocityData = [
    { sprint: 'S9', points: 32, percentage: 60 },
    { sprint: 'S10', points: 38, percentage: 75 },
    { sprint: 'S11', points: 42, percentage: 85 },
    { sprint: 'S12', points: totalStoryPoints, percentage: 40, current: true }
  ];

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
        {/* Top Navigation */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-bold tracking-tight">Sprint Management</h2>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate('/projects')} className="text-sm font-medium text-gray-500 hover:text-[#135bec] transition-colors">
                Projects
              </button>
              <button className="text-sm font-semibold text-[#135bec]">Sprints</button>
              <button onClick={() => navigate('/teams')} className="text-sm font-medium text-gray-500 hover:text-[#135bec] transition-colors">
                Team
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Info size={20} />
            </button>
          </div>
        </header>

        {/* Secondary Navigation / Breadcrumbs */}
        <div className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 px-8 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/projects')} className="text-gray-500 hover:text-[#135bec]">
              {selectedProject?.name || 'All Projects'}
            </button>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="font-medium">Sprint 12 (Current)</span>
            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Active
            </span>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-1.5 text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Sprint Settings
            </button>
            <button className="px-4 py-1.5 text-sm font-semibold bg-[#135bec] text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
              Complete Sprint
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Backlog/Tasks */}
          <section className="flex-1 overflow-y-auto p-6 border-r border-gray-200 dark:border-gray-800">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tight mb-1">Q4 Engineering Sprint 2</h1>
                  <p className="text-gray-500 text-sm">
                    Oct 15 - Oct 29 • {totalStoryPoints} Story Points • {tasks.length} Tasks
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#135bec]/10 text-[#135bec] text-sm font-bold rounded-lg hover:bg-[#135bec]/20 transition-colors">
                  <Plus size={18} />
                  Add Item
                </button>
              </div>

              {/* Task Table */}
              <div className="bg-white dark:bg-[#1a2234] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <CheckCircle size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Tasks in Sprint</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                      Start by adding tasks to this sprint from the backlog or create new tasks for your team.
                    </p>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#135bec] text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                      <Plus size={18} />
                      Add First Task
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">Task Title</th>
                        <th className="px-4 py-4 font-semibold text-gray-600 dark:text-gray-400">Assignee</th>
                        <th className="px-4 py-4 font-semibold text-gray-600 dark:text-gray-400 text-center">Points</th>
                        <th className="px-4 py-4 font-semibold text-gray-600 dark:text-gray-400">Priority</th>
                        <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {tasks.slice(0, 10).map((task, index) => (
                      <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-medium mb-1 tracking-wider uppercase">
                              TASK-{String(index + 100).padStart(3, '0')}
                            </span>
                            <span className="font-semibold group-hover:text-[#135bec]">{task.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {task.assigned_to && task.assigned_to.length > 0 && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-white dark:border-[#1a2234] overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                              {getUserInitials(task.assigned_to[0].full_name || task.assigned_to[0].username)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-medium">
                          {Math.floor(Math.random() * 8) + 1}
                        </td>
                        <td className="px-4 py-4">
                          <span className="flex items-center gap-1.5 font-semibold">
                            {getPriorityIcon(task.priority)}
                            {getPriorityText(task.priority)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg border ${getStatusBadge(task.status)}`}>
                            {getStatusText(task.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </div>
          </section>

          {/* Right Pane: Analytics & Info */}
          <aside className="w-[420px] overflow-y-auto p-6 bg-gray-50 dark:bg-[#0d1117] flex flex-col gap-6">
            {/* Burndown Chart */}
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold">Burndown Chart</h3>
                <Info size={18} className="text-gray-400 cursor-help" />
              </div>
              <div className="h-40 w-full rounded-lg flex items-center justify-center relative bg-gradient-to-b from-[#135bec]/5 to-transparent">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 100">
                  {/* Ideal line */}
                  <line
                    x1="0" y1="10"
                    x2="200" y2="90"
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="4"
                  />
                  {/* Actual line */}
                  <path
                    d="M 0 10 L 25 15 L 50 12 L 75 35 L 100 30 L 125 45 L 150 50"
                    fill="none"
                    stroke="#135bec"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                <span>Day 1</span>
                <span>Day 7</span>
                <span>Day 14</span>
              </div>
            </div>

            {/* Velocity Graph */}
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold">Velocity Graph</h3>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#135bec]/30"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#135bec]"></div>
                </div>
              </div>
              <div className="flex items-end justify-between h-32 px-4">
                {velocityData.map((sprint) => (
                  <div key={sprint.sprint} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 rounded-t-lg relative ${
                        sprint.current ? 'bg-[#135bec]' : 'bg-gray-200 dark:bg-gray-800'
                      }`}
                      style={{ height: `${sprint.percentage}%` }}
                    >
                      {sprint.current && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#135bec]">
                          {sprint.points}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      sprint.current ? 'text-[#135bec]' : 'text-gray-400'
                    }`}>
                      {sprint.sprint}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sprint Goals */}
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Flag size={18} className="text-[#135bec]" />
                Sprint Goals
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic border-l-2 border-[#135bec]/30 pl-4">
                "Successfully migrate the legacy authentication system to OAuth 2.0 while ensuring zero downtime for current enterprise users."
              </p>
            </div>

            {/* Key Deliverables */}
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-[#135bec]" />
                Key Deliverables
              </h3>
              <ul className="space-y-3">
                {sprintGoals.map((goal) => (
                  <li key={goal.id} className="flex items-center gap-3 group cursor-pointer">
                    {goal.completed ? (
                      <div className="w-5 h-5 rounded border-0 flex items-center justify-center bg-emerald-500">
                        <Check size={14} className="text-white font-bold" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#135bec] rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    )}
                    <span className={`text-sm ${
                      goal.completed 
                        ? 'text-gray-500 line-through' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {goal.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Footer / Status Bar */}
        <footer className="bg-white dark:bg-[#1a2234] border-t border-gray-200 dark:border-gray-800 px-6 py-2 flex items-center justify-between text-[11px] font-medium text-gray-500 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Systems Operational
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⟳</span>
              Last updated: Just now
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>Sprint Progress: {Math.round((completedPoints / totalStoryPoints) * 100)}%</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default SprintManagement;
