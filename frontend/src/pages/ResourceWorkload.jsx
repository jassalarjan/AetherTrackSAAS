import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import { 
  Search, Filter, Share2, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, User, Edit2, Trash2, X
} from 'lucide-react';

const ResourceWorkload = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState('week'); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('team'); // team, project, capacity
  const [editingCell, setEditingCell] = useState(null);
  const [workloadData, setWorkloadData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: 'member'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    
    return {
      start,
      end,
      display: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysOfWeek = () => {
    const days = [];
    const { start } = getDateRange();
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push({
        name: day.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.getDate(),
        isWeekend: day.getDay() === 0 || day.getDay() === 6,
        isToday: day.toDateString() === new Date().toDateString()
      });
    }
    return days;
  };

  const getRandomWorkload = () => {
    const allocated = Math.floor(Math.random() * 12);
    const capacity = 8;
    const percentage = Math.round((allocated / capacity) * 100);
    return { allocated, capacity, percentage };
  };

  const handleWorkloadChange = (userId, dayIndex, newAllocated) => {
    const key = `${userId}-${dayIndex}`;
    const capacity = 8;
    const percentage = Math.round((newAllocated / capacity) * 100);
    setWorkloadData(prev => ({
      ...prev,
      [key]: { allocated: newAllocated, capacity, percentage }
    }));
    setEditingCell(null);
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/users', formData);
      setUsers(prev => [response.data, ...prev]);
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        username: '',
        password: '',
        role: 'member'
      });
      alert('Resource added successfully');
    } catch (error) {
      console.error('Error adding resource:', error);
      alert(error.response?.data?.message || 'Failed to add resource');
    }
  };

  const handleEditResource = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role
      };
      const response = await api.put(`/users/${selectedUser._id}`, updateData);
      setUsers(prev => prev.map(u => u._id === selectedUser._id ? response.data : u));
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        full_name: '',
        email: '',
        username: '',
        password: '',
        role: 'member'
      });
      alert('Resource updated successfully');
    } catch (error) {
      console.error('Error updating resource:', error);
      alert(error.response?.data?.message || 'Failed to update resource');
    }
  };

  const handleDeleteResource = async (userId) => {
    if (!confirm('Are you sure you want to remove this resource?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      alert('Resource removed successfully');
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert(error.response?.data?.message || 'Failed to remove resource');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      role: user.role || 'member'
    });
    setShowEditModal(true);
  };

  const getWorkload = (userId, dayIndex) => {
    const key = `${userId}-${dayIndex}`;
    if (workloadData[key]) {
      return workloadData[key];
    }
    // Generate and cache random workload
    const workload = getRandomWorkload();
    setWorkloadData(prev => ({ ...prev, [key]: workload }));
    return workload;
  };

  const getWorkloadColor = (percentage) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-primary';
    if (percentage >= 70) return 'bg-emerald-500';
    return 'bg-gray-400';
  };

  const getWorkloadBgColor = (percentage) => {
    if (percentage > 100) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40';
    return 'bg-white dark:bg-[#1a2234] border-gray-200 dark:border-gray-700';
  };

  const getCapacityBadgeColor = (percentage) => {
    if (percentage > 100) return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400';
    if (percentage >= 90) return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  };

  const dateRange = getDateRange();
  const daysOfWeek = getDaysOfWeek();

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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2234] flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold">Resource & Workload</h2>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('team')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'team' 
                    ? 'bg-white dark:bg-gray-700 text-[#0d121b] dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Team View
              </button>
              <button 
                onClick={() => setViewMode('project')}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === 'project'
                    ? 'font-bold bg-white dark:bg-gray-700 rounded-md shadow-sm text-[#0d121b] dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Project View
              </button>
              <button 
                onClick={() => setViewMode('capacity')}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === 'capacity'
                    ? 'font-bold bg-white dark:bg-gray-700 rounded-md shadow-sm text-[#0d121b] dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Capacity Map
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#135bec]/20 placeholder:text-gray-500"
                placeholder="Search resources..."
                type="text"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#135bec] text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Add Resource
            </button>
          </div>
        </header>

        {/* Subheader Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-[#1a2234] border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigateWeek(-1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-500"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => navigateWeek(1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-500"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="text-sm font-bold">{dateRange.display}</h3>
            <button 
              onClick={goToToday}
              className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 h-9">
              <button
                onClick={() => setTimeView('day')}
                className={`px-3 h-full text-xs font-medium ${
                  timeView === 'day' ? 'font-bold bg-white dark:bg-gray-700 rounded-md shadow-sm' : 'text-gray-500'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setTimeView('week')}
                className={`px-4 h-full text-xs ${
                  timeView === 'week' ? 'font-bold bg-white dark:bg-gray-700 rounded-md shadow-sm' : 'font-medium text-gray-500'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeView('month')}
                className={`px-3 h-full text-xs font-medium ${
                  timeView === 'month' ? 'font-bold bg-white dark:bg-gray-700 rounded-md shadow-sm' : 'text-gray-500'
                }`}
              >
                Month
              </button>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Filter size={18} />
              Filters
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Share2 size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Allocation Table/Grid Container */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0d1117]">
          {users.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 px-6">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1a2234] border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center mb-6">
                <User size={48} className="text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Team Members Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
                Add team members to your workspace to start tracking resource allocation and workload distribution.
              </p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#135bec] text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={20} />
                Add Team Members
              </button>
            </div>
          ) : (
            <>
              {/* Team View */}
              {viewMode === 'team' && (
                <table className="w-full border-separate border-spacing-0 table-fixed min-w-[1200px]">
                  <thead>
                    <tr className="bg-white dark:bg-[#1a2234] border-b border-gray-200 dark:border-gray-800">
                      <th className="sticky left-0 top-0 bg-white dark:bg-[#1a2234] w-72 px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-800 border-r border-gray-100 dark:border-gray-800 z-10">
                        Team Member
                      </th>
                    {daysOfWeek.map((day, idx) => (
                      <th
                        key={idx}
                        className={`px-4 py-4 text-center border-b border-gray-200 dark:border-gray-800 border-r border-gray-100 dark:border-gray-800 ${
                          day.isToday ? 'bg-[#135bec]/5' : day.isWeekend ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''
                        }`}
                      >
                        <div className={`text-xs font-bold ${day.isToday ? 'text-[#135bec]' : day.isWeekend ? 'text-gray-400' : ''}`}>
                          {day.name}
                        </div>
                        <div className={`text-[10px] ${day.isToday ? 'text-[#135bec]/70' : 'text-gray-400'}`}>
                          {dateRange.start.toLocaleDateString('en-US', { month: 'short' })} {day.date}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.slice(0, 8).map((user, userIdx) => {
                    const weekWorkloads = daysOfWeek.map((_, dayIdx) => getWorkload(user._id, dayIdx));
                    const avgPercentage = Math.round(
                      weekWorkloads.reduce((sum, w) => sum + w.percentage, 0) / weekWorkloads.length
                    );

                    return (
                      <tr key={user._id} className="group hover:bg-gray-50 dark:hover:bg-[#1a2234]/50 transition-colors">
                        <td className="sticky left-0 bg-white dark:bg-[#1a2234] group-hover:bg-gray-50 dark:group-hover:bg-[#1a2234]/50 border-r border-gray-100 dark:border-gray-800 px-6 py-4 z-10">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                              {getUserInitials(user.full_name || user.username)}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-bold truncate">{user.full_name || user.username}</span>
                              <span className="text-xs text-gray-500">{user.role}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center gap-1 font-bold text-xs px-1.5 py-0.5 rounded ${getCapacityBadgeColor(avgPercentage)}`}>
                                {avgPercentage > 100 && <AlertTriangle size={12} />}
                                {avgPercentage}%
                              </div>
                              <button
                                onClick={() => openEditModal(user)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                                title="Edit resource"
                              >
                                <Edit2 size={14} className="text-gray-600 dark:text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteResource(user._id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all"
                                title="Remove resource"
                              >
                                <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </td>
                        {weekWorkloads.map((workload, dayIdx) => {
                          const day = daysOfWeek[dayIdx];
                          const cellKey = `${user._id}-${dayIdx}`;
                          const isEditing = editingCell === cellKey;
                          
                          return (
                            <td
                              key={dayIdx}
                              className={`p-2 border-r border-gray-100 dark:border-gray-800 ${
                                day.isToday ? 'bg-[#135bec]/5' : day.isWeekend ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''
                              }`}
                            >
                              {!day.isWeekend && (
                                <div 
                                  className={`h-14 rounded-lg border flex flex-col justify-center px-3 cursor-pointer hover:ring-2 hover:ring-[#135bec]/30 transition-all ${getWorkloadBgColor(workload.percentage)}`}
                                  onClick={() => setEditingCell(cellKey)}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max="24"
                                        step="0.5"
                                        value={workload.allocated}
                                        onChange={(e) => handleWorkloadChange(user._id, dayIdx, parseFloat(e.target.value) || 0)}
                                        onBlur={() => setEditingCell(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === 'Escape') {
                                            setEditingCell(null);
                                          }
                                        }}
                                        className="w-16 px-1 py-0.5 text-[10px] font-bold border border-[#135bec] rounded focus:outline-none focus:ring-2 focus:ring-[#135bec]"
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="text-[10px] font-bold">
                                        {workload.allocated}h / {workload.capacity}h
                                      </div>
                                    )}
                                    {workload.percentage > 100 && <AlertTriangle size={12} className="text-red-500" />}
                                  </div>
                                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${getWorkloadColor(workload.percentage)}`}
                                      style={{ width: `${Math.min(workload.percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}

              {/* Project View */}
              {viewMode === 'project' && (
                <div className="p-6 max-w-6xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.slice(0, 12).map((user) => {
                      const weekWorkloads = daysOfWeek.map((_, dayIdx) => getWorkload(user._id, dayIdx));
                      const totalHours = weekWorkloads.reduce((sum, w) => sum + w.allocated, 0);
                      const avgPercentage = Math.round(
                        weekWorkloads.reduce((sum, w) => sum + w.percentage, 0) / weekWorkloads.length
                      );
                      
                      return (
                        <div key={user._id} className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="size-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {getUserInitials(user.full_name || user.username)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm truncate">{user.full_name || user.username}</h4>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold ${getCapacityBadgeColor(avgPercentage)}`}>
                              {avgPercentage}%
                            </div>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Total Hours</span>
                              <span className="font-bold">{totalHours}h / 56h</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getWorkloadColor(avgPercentage)}`}
                                style={{ width: `${Math.min(avgPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteResource(user._id)}
                              className="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Capacity Map View */}
              {viewMode === 'capacity' && (
                <div className="p-6">
                  <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-bold mb-2">Team Capacity Overview</h3>
                      <p className="text-sm text-gray-500">Visual representation of team workload distribution</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {users.map((user) => {
                          const weekWorkloads = daysOfWeek.map((_, dayIdx) => getWorkload(user._id, dayIdx));
                          const avgPercentage = Math.round(
                            weekWorkloads.reduce((sum, w) => sum + w.percentage, 0) / weekWorkloads.length
                          );
                          
                          return (
                            <div
                              key={user._id}
                              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-4 border-2 ${
                                avgPercentage > 100
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                  : avgPercentage >= 90
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                  : avgPercentage >= 70
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                  : 'bg-gray-50 dark:bg-gray-800/20 border-gray-300 dark:border-gray-700'
                              }`}
                            >
                              <div className="size-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold mb-2">
                                {getUserInitials(user.full_name || user.username)}
                              </div>
                              <div className="text-center mb-2">
                                <div className="text-xs font-bold truncate max-w-full px-1">
                                  {user.full_name || user.username}
                                </div>
                                <div className="text-[10px] text-gray-500">{user.role}</div>
                              </div>
                              <div className={`text-lg font-bold ${
                                avgPercentage > 100
                                  ? 'text-red-600 dark:text-red-400'
                                  : avgPercentage >= 90
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {avgPercentage}%
                              </div>
                              {avgPercentage > 100 && (
                                <AlertTriangle size={16} className="absolute top-2 right-2 text-red-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-8 flex flex-wrap gap-4 justify-center border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-gray-400"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Under 70%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-emerald-500"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">70-89%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-blue-500"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">90-100%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-red-500"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Over 100%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">Add New Resource</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddResource} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">Edit Resource</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditResource} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#111418] focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
                  required
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Update Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceWorkload;
