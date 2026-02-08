import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import { 
  Search, Filter, Share2, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, User
} from 'lucide-react';

const ResourceWorkload = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState('week'); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());

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
              <button className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all bg-white dark:bg-gray-700 text-[#0d121b] dark:text-white shadow-sm">
                Team View
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
                Project View
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
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
            <button className="bg-[#135bec] text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2">
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
              <button className="flex items-center gap-2 px-6 py-3 bg-[#135bec] text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <Plus size={20} />
                Add Team Members
              </button>
            </div>
          ) : (
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
                const weekWorkloads = daysOfWeek.map(() => getRandomWorkload());
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
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold truncate">{user.full_name || user.username}</span>
                          <span className="text-xs text-gray-500">{user.role}</span>
                        </div>
                        <div className={`ml-auto flex items-center gap-1 font-bold text-xs px-1.5 py-0.5 rounded ${getCapacityBadgeColor(avgPercentage)}`}>
                          {avgPercentage > 100 && <AlertTriangle size={12} />}
                          {avgPercentage}%
                        </div>
                      </div>
                    </td>
                    {weekWorkloads.map((workload, dayIdx) => {
                      const day = daysOfWeek[dayIdx];
                      return (
                        <td
                          key={dayIdx}
                          className={`p-2 border-r border-gray-100 dark:border-gray-800 ${
                            day.isToday ? 'bg-[#135bec]/5' : day.isWeekend ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''
                          }`}
                        >
                          {!day.isWeekend && (
                            <div className={`h-14 rounded-lg border flex flex-col justify-center px-3 ${getWorkloadBgColor(workload.percentage)}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] font-bold">
                                  {workload.allocated}h / {workload.capacity}h
                                </div>
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
        </div>
      </main>
    </div>
  );
};

export default ResourceWorkload;
