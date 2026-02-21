import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { projectsApi } from '../api/projectsApi';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import { 
  Info, CheckSquare, GitBranch, Users as UsersIcon, FileText, 
  Clock, Edit, Share2, Download, ChevronDown, Calendar,
  Check, Loader, Database, Lock, CheckCircle, Circle,
  DollarSign, MessageCircle, Plus, Filter, FileSpreadsheet, X, Upload
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [milestones, setMilestones] = useState([
    { name: 'Planning', status: 'done', order: 1 },
    { name: 'Development', status: 'in_progress', order: 2 },
    { name: 'Testing', status: 'pending', order: 3 },
    { name: 'Deployment', status: 'pending', order: 4 }
  ]);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', status: 'pending' });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });

  useEffect(() => {
    fetchProjectDetails();
    fetchUsers();
    loadMilestones();
  }, [id]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
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

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const userData = response.data;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const loadMilestones = () => {
    const saved = localStorage.getItem(`project_${id}_milestones`);
    if (saved) {
      setMilestones(JSON.parse(saved));
    }
  };

  const saveMilestones = (newMilestones) => {
    localStorage.setItem(`project_${id}_milestones`, JSON.stringify(newMilestones));
    setMilestones(newMilestones);
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await projectsApi.addMember(id, { userId: selectedUserId, role: 'member' });
      setShowMemberModal(false);
      setSelectedUserId('');
      await fetchProjectDetails();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await projectsApi.removeMember(id, userId);
      await fetchProjectDetails();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleDocumentUpload = async () => {
    if (!documentFile) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', documentFile);
      formData.append('name', documentName || documentFile.name);
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${id}/upload-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }
      
      setShowDocumentModal(false);
      setDocumentFile(null);
      setDocumentName('');
      await fetchProjectDetails();
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Failed to upload document: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentDelete = async (docIndex) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${id}/documents/${docIndex}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Delete failed');
      }
      
      await fetchProjectDetails();
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const handleMilestoneSubmit = () => {
    if (!milestoneForm.name) return;
    
    if (editingMilestone !== null) {
      const updated = milestones.map((m, idx) => 
        idx === editingMilestone ? { ...milestoneForm, order: m.order } : m
      );
      saveMilestones(updated);
    } else {
      const newMilestone = {
        ...milestoneForm,
        order: milestones.length + 1
      };
      saveMilestones([...milestones, newMilestone]);
    }
    
    setShowMilestoneModal(false);
    setMilestoneForm({ name: '', status: 'pending' });
    setEditingMilestone(null);
  };

  const handleEditMilestone = (index) => {
    setEditingMilestone(index);
    setMilestoneForm({ name: milestones[index].name, status: milestones[index].status });
    setShowMilestoneModal(true);
  };

  const handleDeleteMilestone = (index) => {
    if (!confirm('Delete this milestone?')) return;
    saveMilestones(milestones.filter((_, idx) => idx !== index));
  };

  const getMilestoneIcon = (status) => {
    if (status === 'done') return <Check size={20} />;
    if (status === 'in_progress') return <Loader size={20} />;
    return <Circle size={20} />;
  };

  const getMilestoneBgColor = (status) => {
    if (status === 'done') return 'bg-[#135bec]';
    if (status === 'in_progress') return 'bg-[#135bec]';
    return 'bg-white dark:bg-gray-800';
  };

  const getMilestoneBorderColor = (status) => {
    if (status === 'pending') return 'border-2 border-gray-300 dark:border-gray-700';
    return '';
  };

  const handleExportExcel = () => {
    const taskData = filteredTasks.map(task => ({
      'Task Name': task.title,
      'Status': task.status,
      'Priority': task.priority,
      'Progress': `${task.progress || 0}%`,
      'Start Date': task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
      'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
      'Assigned To': task.assigned_to?.map(u => u.full_name || u.username).join(', ') || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(taskData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${project.name}-tasks-${timestamp}.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    const headers = ['Task Name', 'Status', 'Priority', 'Progress', 'Start Date', 'Due Date', 'Assigned To'];
    const csvData = filteredTasks.map(task => [
      task.title,
      task.status,
      task.priority,
      `${task.progress || 0}%`,
      task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
      task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
      task.assigned_to?.map(u => u.full_name || u.username).join('; ') || ''
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
    a.download = `${project.name}-tasks-${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
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
        <header className="min-h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] sticky top-0 z-30">
          <div className="px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 min-w-0">
              <button onClick={() => navigate('/projects')} className="hover:text-[#135bec] transition-colors whitespace-nowrap">
                Projects
              </button>
              <span className="text-gray-400">›</span>
              <span className="text-[#0d121b] dark:text-white font-medium truncate">{project.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filters</span>
                {(filters.status || filters.priority || filters.search) && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {filteredTasks.length}
                  </span>
                )}
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">Export</span>
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
              <button className="bg-[#135bec] text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm whitespace-nowrap">
                <Plus size={16} />
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">Task</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filter Section */}
        {showFilters && (
          <div className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800 px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Search Tasks
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by name..."
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
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
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setFilters({ status: '', priority: '', search: '' })}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
              {(filters.status || filters.priority || filters.search) && (
                <span className="flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                  {filteredTasks.length} of {tasks.length} tasks shown
                </span>
              )}
            </div>
          </div>
        )}

        {/* Project Content */}
        <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Page Title & Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black tracking-tight text-[#0d121b] dark:text-white leading-none">
                  {project.name}
                </h2>
                <Edit size={20} className="text-gray-400 dark:text-gray-500 cursor-pointer hover:text-[#135bec] transition-colors" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">{project.description}</p>
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
                <span className="text-sm font-bold dark:text-white">{project.progress}%</span>
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
                      <button 
                        onClick={() => { setMilestoneForm({ name: '', status: 'pending' }); setEditingMilestone(null); setShowMilestoneModal(true); }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#135bec] text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                      >
                        <Plus size={16} />
                        Add Milestone
                      </button>
                    </div>
                    <div className="relative px-4 pb-4 overflow-x-auto">
                      <div className="flex items-center justify-between min-w-[600px] relative py-10">
                        {/* Connection Line */}
                        <div className="absolute h-0.5 bg-gray-200 dark:bg-gray-700 top-1/2 left-0 right-0" style={{ zIndex: 1 }}></div>
                        <div className="absolute h-0.5 bg-[#135bec] top-1/2 left-0" style={{ 
                          width: `${milestones.filter(m => m.status === 'done').length / milestones.length * 100}%`, 
                          zIndex: 2 
                        }}></div>

                        {/* Milestone Nodes */}
                        {milestones.sort((a, b) => a.order - b.order).map((milestone, idx) => (
                          <div key={idx} className={`relative z-10 flex flex-col items-center gap-3 w-32 ${milestone.status === 'pending' ? 'opacity-50' : ''}`}>
                            <div className={`size-10 rounded-full ${getMilestoneBgColor(milestone.status)} ${getMilestoneBorderColor(milestone.status)} text-white flex items-center justify-center ring-4 ring-white dark:ring-gray-900 cursor-pointer group`}
                              onClick={() => handleEditMilestone(idx)}
                            >
                              {getMilestoneIcon(milestone.status)}
                            </div>
                            <div className="text-center">
                              <p className={`text-[11px] font-bold uppercase tracking-tighter ${
                                milestone.status === 'done' ? 'text-[#135bec]' :
                                milestone.status === 'in_progress' ? 'text-[#135bec]' :
                                'text-gray-400'
                              }`}>
                                {milestone.status === 'done' ? 'Done' : milestone.status === 'in_progress' ? 'Current' : 'Pending'}
                              </p>
                              <p className="text-xs font-bold">{milestone.name}</p>
                            </div>
                          </div>
                        ))}
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
                          <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                          <span className="ml-2 font-semibold">{formatDate(project.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">End Date:</span>
                          <span className="ml-2 font-semibold">{formatDate(project.due_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Team Size:</span>
                          <span className="ml-2 font-semibold">{project.team_members?.length || 0} members</span>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2 dark:text-white">
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
                      <h3 className="font-bold text-sm dark:text-white">Project Team</h3>
                      <Plus size={18} className="text-gray-400 cursor-pointer" />
                    </div>
                    <div className="space-y-4">
                      {project.team_members?.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-gray-200">
                            {getUserInitials(member.user?.name)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold dark:text-white">{member.user?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
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
                    <h3 className="font-bold text-sm mb-4 dark:text-white">Latest Activity</h3>
                    <div className="space-y-6 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-gray-800">
                      <div className="relative flex gap-4 pl-1">
                        <div className="size-[22px] rounded-full bg-blue-500 border-4 border-white dark:border-gray-900 z-10"></div>
                        <div className="flex-1">
                          <p className="text-xs text-[#0d121b] dark:text-gray-300 leading-snug">
                            <span className="font-bold">Project created</span>
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(project.created_at)}</span>
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
                  <h3 className="text-lg font-bold dark:text-white">Project Tasks</h3>
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
                    <h4 className="text-lg font-bold mb-2 dark:text-white">No Tasks Yet</h4>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first task to start tracking progress</p>
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
                                <span className="font-semibold dark:text-white">{task.title}</span>
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
                                  <span className="text-sm dark:text-gray-300">{task.assigned_to[0].full_name || task.assigned_to[0].username}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-sm">Unassigned</span>
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
                  <h3 className="text-lg font-bold dark:text-white">Project Timeline</h3>
                  <button className="text-sm text-[#135bec] font-semibold hover:underline">View Gantt Chart</button>
                </div>
                <div className="space-y-6">
                  <div className="relative pl-8 pb-8 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-[#135bec] border-4 border-white dark:border-gray-900"></div>
                    <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(project.start_date)}</div>
                    <h4 className="font-bold text-[#135bec]">Project Started</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Project kickoff and initial planning phase</p>
                  </div>
                  {tasks.filter(t => t.status === 'done').slice(0, 3).map((task, idx) => (
                    <div key={task._id} className="relative pl-8 pb-8 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-gray-900"></div>
                      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">{task.completed_at ? formatDate(task.completed_at) : formatDate(task.updated_at)}</div>
                      <h4 className="font-bold">{task.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Task completed successfully</p>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'in_progress').slice(0, 2).map((task) => (
                    <div key={task._id} className="relative pl-8 pb-8 border-l-2 border-dashed border-gray-300 dark:border-gray-700">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-900 animate-pulse"></div>
                      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">In Progress</div>
                      <h4 className="font-bold text-blue-600 dark:text-blue-400">{task.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Currently being worked on</p>
                    </div>
                  ))}
                  {project.due_date && (
                    <div className="relative pl-8">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700 border-4 border-white dark:border-gray-900"></div>
                      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(project.due_date)}</div>
                      <h4 className="font-bold text-gray-500 dark:text-gray-400">Target Completion</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Planned project completion date</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold dark:text-white">Team Members</h3>
                  <button 
                    onClick={() => setShowMemberModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Add Member
                  </button>
                </div>
                {(!project.team_members || project.team_members.length === 0) ? (
                  <div className="bg-white dark:bg-gray-900 p-12 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <UsersIcon size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-2 dark:text-white">No Team Members</h4>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Add team members to collaborate on this project</p>
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
                          <button 
                            onClick={() => handleRemoveMember(member.user?._id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <h4 className="font-bold text-lg mb-1 dark:text-white">{member.user?.name || 'Unknown User'}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{member.user?.email || ''}</p>
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
                  <h3 className="text-lg font-bold dark:text-white">Project Documents</h3>
                  <button 
                    onClick={() => setShowDocumentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#135bec] text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Upload Document
                  </button>
                </div>
                {(!project.documents || project.documents.length === 0) ? (
                  <div className="bg-white dark:bg-gray-900 p-12 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-2 dark:text-white">No Documents</h4>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Upload project documents, specifications, and files</p>
                    <button 
                      onClick={() => setShowDocumentModal(true)}
                      className="px-6 py-3 bg-[#135bec] text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Upload First Document
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.documents.map((doc, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <FileText size={24} className="text-[#135bec]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm mb-1 truncate dark:text-white">{doc.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{(doc.size / 1024).toFixed(2)} KB</p>
                            <div className="flex gap-2">
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-[#135bec] hover:underline"
                              >
                                View Document →
                              </a>
                              <button
                                onClick={() => handleDocumentDelete(idx)}
                                className="text-xs text-red-500 hover:text-red-700 hover:underline ml-2"
                                title="Delete document"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold mb-6 dark:text-white">Activity Feed</h3>
                <div className="space-y-6 relative before:content-[''] before:absolute before:left-[19px] before:top-8 before:bottom-8 before:w-[2px] before:bg-gray-200 dark:before:bg-gray-800">
                  <div className="relative flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold z-10">
                      <Check size={20} />
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="text-sm mb-1">
                        <span className="font-bold">Project created</span> by {project.created_by?.name || 'Admin'}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(project.created_at)}</span>
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
                        <p className="text-sm mb-1 dark:text-gray-200">
                          <span className="font-bold">Task {task.status === 'done' ? 'completed' : 'updated'}</span>: {task.title}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(task.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                  {project.updated_at && project.updated_at !== project.created_at && (
                    <div className="relative flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold z-10">
                        <Edit size={20} />
                      </div>
                      <div className="flex-1 pt-2">
                        <p className="text-sm mb-1 dark:text-gray-200">
                          <span className="font-bold">Project updated</span>
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(project.updated_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md shadow-2xl">
            <div className="border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Team Member</h3>
              <button onClick={() => setShowMemberModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec] mb-4"
              >
                <option value="">Choose a user...</option>
                {Array.isArray(users) && users.filter(u => !project.team_members?.some(m => m.user?._id === u._id)).map(user => (
                  <option key={user._id} value={user._id}>{user.name || user.email}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId}
                  className="flex-1 px-4 py-2 bg-[#135bec] text-white rounded-lg font-bold hover:bg-[#0d4ac7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md shadow-2xl">
            <div className="border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Document</h3>
              <button onClick={() => { setShowDocumentModal(false); setDocumentFile(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Document Name (Optional)</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter document name..."
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
                />
                {documentFile && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Selected: {documentFile.name} ({(documentFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowDocumentModal(false); setDocumentFile(null); }}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDocumentUpload}
                  disabled={!documentFile || uploading}
                  className="flex-1 px-4 py-2 bg-[#135bec] text-white rounded-lg font-bold hover:bg-[#0d4ac7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md shadow-2xl">
            <div className="border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingMilestone !== null ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              <button onClick={() => { setShowMilestoneModal(false); setEditingMilestone(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Milestone Name</label>
                <input
                  type="text"
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                  placeholder="e.g., Requirements Gathering"
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={milestoneForm.status}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-[#135bec] focus:border-[#135bec]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              {editingMilestone !== null && (
                <button
                  onClick={() => handleDeleteMilestone(editingMilestone)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
                >
                  Delete Milestone
                </button>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowMilestoneModal(false); setEditingMilestone(null); }}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMilestoneSubmit}
                  disabled={!milestoneForm.name}
                  className="flex-1 px-4 py-2 bg-[#135bec] text-white rounded-lg font-bold hover:bg-[#0d4ac7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingMilestone !== null ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
