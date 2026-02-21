import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Save, X, Menu, Users, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { ShiftConfigPanel } from './ShiftManagement';

export default function AttendancePage() {
  const { user } = useAuth();
  const { theme, currentTheme, currentColorScheme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({});
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateAttendance, setDateAttendance] = useState([]);
  const [showDateModal, setShowDateModal] = useState(false);

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');
  const [searchParams] = useSearchParams();
  const [pageTab, setPageTab] = useState(
    searchParams.get('tab') === 'shifts' ? 'shift-config' : 'attendance'
  );

  useEffect(() => {
    fetchAttendance();
    fetchSummary();
    checkTodayAttendance();
  }, [currentMonth, currentYear]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/attendance', {
        params: { month: currentMonth, year: currentYear }
      });
      setAttendance(response.data.records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/hr/attendance/summary', {
        params: { month: currentMonth, year: currentYear }
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const today = new Date();
      const response = await api.get('/hr/attendance', {
        params: { 
          month: today.getMonth() + 1, 
          year: today.getFullYear() 
        }
      });
      const todayRecord = response.data.records.find(r => 
        new Date(r.date).toDateString() === today.toDateString() && 
        r.userId._id === user._id
      );
      setCheckedIn(todayRecord && todayRecord.checkIn && !todayRecord.checkOut);
    } catch (error) {
      console.error('Error checking today attendance:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await api.post('/hr/attendance/checkin');
      setCheckedIn(true);
      fetchAttendance();
      fetchSummary();
      alert('Checked in successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/hr/attendance/checkout');
      setCheckedIn(false);
      fetchAttendance();
      fetchSummary();
      alert('Checked out successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check out');
    }
  };

  const handleEditAttendance = async (id) => {
    try {
      await api.put(`/hr/attendance/${id}`, editData);
      setEditMode(null);
      setEditData({});
      fetchAttendance();
      alert('Attendance updated successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update attendance');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      half_day: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      leave: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      holiday: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      present: <CheckCircle className="w-4 h-4" />,
      absent: <XCircle className="w-4 h-4" />,
      half_day: <AlertCircle className="w-4 h-4" />,
      leave: <Calendar className="w-4 h-4" />,
      holiday: <Calendar className="w-4 h-4" />
    };
    return icons[status] || null;
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const fetchDateAttendance = async (date) => {
    try {
      const response = await api.get('/hr/attendance', {
        params: { 
          month: date.getMonth() + 1, 
          year: date.getFullYear() 
        }
      });
      const dateString = date.toDateString();
      const dayRecords = response.data.records.filter(r => 
        new Date(r.date).toDateString() === dateString
      );
      setDateAttendance(dayRecords);
      setSelectedDate(date);
      setShowDateModal(true);
    } catch (error) {
      console.error('Error fetching date attendance:', error);
    }
  };

  const getAttendanceForDate = (day) => {
    const dateToCheck = new Date(currentYear, currentMonth - 1, day);
    const dateString = dateToCheck.toDateString();
    const dayRecords = attendance.filter(r => 
      new Date(r.date).toDateString() === dateString
    );
    
    const present = dayRecords.filter(r => r.status === 'present').length;
    const absent = dayRecords.filter(r => r.status === 'absent').length;
    const total = dayRecords.length;
    
    return { present, absent, total, records: dayRecords };
  };

  const navigateMonth = (direction) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  return (
    <ResponsivePageLayout
      title="Attendance Tracking"
      actions={
        !isAdmin && (
          checkedIn ? (
            <button
              onClick={handleCheckOut}
              className={`px-4 py-2 ${currentTheme.primary} text-white ${currentTheme.primaryHover} flex items-center gap-2`}
            >
              <XCircle className="w-5 h-5" />
              Check Out
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className={`px-4 py-2 ${currentTheme.primary} text-white ${currentTheme.primaryHover} flex items-center gap-2`}
            >
              <CheckCircle className="w-5 h-5" />
              Check In
            </button>
          )
        )
      }
    >
          {/* ── Page-level tab switcher (admin / HR only) ── */}
          {isAdmin && (
            <div className={`flex gap-1 p-1 rounded-xl border ${currentTheme.border} mb-6 w-fit bg-black/[0.02] dark:bg-white/[0.02]`}>
              {[
                { id: 'attendance',   label: 'Attendance',  icon: Clock },
                { id: 'shift-config', label: 'Shift Config', icon: Layers },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPageTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pageTab === id
                      ? `bg-white dark:bg-white/10 shadow-sm ${currentTheme.text}`
                      : `${currentTheme.textSecondary} hover:bg-black/5 dark:hover:bg-white/5`
                  }`}
                >
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          )}

          {/* ── Shift Config panel ── */}
          {pageTab === 'shift-config' && isAdmin ? (
            <ShiftConfigPanel />
          ) : (
          <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary}`}>Present</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.present}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary}`}>Absent</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.absent}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary}`}>Half Day</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.halfDay}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>

              <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary}`}>Leave</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.leave}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${currentTheme.textSecondary}`}>Total Hours</p>
                    <p className="text-2xl font-bold text-purple-600">{summary.totalHours.toFixed(1)}</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          )}

          {/* Month/Year Selector */}
          <div className={`${currentTheme.surface} rounded-lg p-4 mb-6 border ${currentTheme.border}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  className={`p-2 ${currentTheme.surface} border ${currentTheme.border} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className={`px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className={`px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <button
                  onClick={() => navigateMonth(1)}
                  className={`p-2 ${currentTheme.surface} border ${currentTheme.border} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'calendar'
                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Calendar View
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Calendar View for Admin/HR */}
          {isAdmin && viewMode === 'calendar' && (
            <div className={`${currentTheme.surface} rounded-lg border ${currentTheme.border} p-6 mb-6`}>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className={`text-center font-semibold text-sm ${currentTheme.textSecondary} py-2`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: getFirstDayOfMonth(currentMonth, currentYear) }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}
                
                {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }, (_, i) => {
                  const day = i + 1;
                  const dateData = getAttendanceForDate(day);
                  const isToday = new Date().toDateString() === new Date(currentYear, currentMonth - 1, day).toDateString();
                  
                  return (
                    <div
                      key={day}
                      onClick={() => dateData.total > 0 && fetchDateAttendance(new Date(currentYear, currentMonth - 1, day))}
                      className={`aspect-square border ${currentTheme.border} rounded-lg p-2 ${
                        dateData.total > 0 ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                      } ${isToday ? 'ring-2 ring-blue-500' : ''} ${currentTheme.surface}`}
                    >
                      <div className="flex flex-col h-full">
                        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : currentTheme.text}`}>
                          {day}
                        </div>
                        {dateData.total > 0 && (
                          <div className="flex-1 flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              <span>{dateData.present}</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircle className="w-3 h-3" />
                              <span>{dateData.absent}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded ring-2 ring-blue-500"></div>
                  <span className={currentTheme.textSecondary}>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className={currentTheme.textSecondary}>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className={currentTheme.textSecondary}>Absent</span>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Table */}
          {viewMode === 'table' && (
          <div className={`${currentTheme.surface} rounded-lg border ${currentTheme.border} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${currentTheme.surfaceSecondary}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Date</th>
                    {isAdmin && <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Employee</th>}
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Check In</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Check Out</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Hours</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Status</th>
                    {isAdmin && <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase tracking-wider`}>Actions</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y ${currentTheme.border}`}>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className={`px-6 py-4 text-center ${currentTheme.textSecondary}`}>
                        Loading...
                      </td>
                    </tr>
                  ) : attendance.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className={`px-6 py-4 text-center ${currentTheme.textSecondary}`}>
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record._id} className={`${currentTheme.hover}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.text}`}>
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.text}`}>
                            {record.userId?.full_name}
                          </td>
                        )}
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.text}`}>
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.text}`}>
                          {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${currentTheme.text}`}>
                          {record.workingHours.toFixed(2)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${getStatusColor(record.status)}`}>
                            {getStatusIcon(record.status)}
                            {record.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {editMode === record._id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAttendance(record._id)}
                                  className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditMode(null)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditMode(record._id);
                                  setEditData({ 
                                    status: record.status,
                                    checkIn: record.checkIn,
                                    checkOut: record.checkOut,
                                    notes: record.notes || ''
                                  });
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Date Detail Modal */}
          {showDateModal && selectedDate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className={`${currentTheme.surface} rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden`}>
                <div className={`flex items-center justify-between p-6 border-b ${currentTheme.border}`}>
                  <div>
                    <h3 className={`text-xl font-bold ${currentTheme.text}`}>
                      Attendance for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className={`text-sm ${currentTheme.textSecondary} mt-1`}>
                      Total: {dateAttendance.length} employees
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDateModal(false)}
                    className={`p-2 ${currentTheme.surface} border ${currentTheme.border} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className={`text-xs ${currentTheme.textSecondary}`}>Present</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {dateAttendance.filter(r => r.status === 'present').length}
                      </p>
                    </div>
                    
                    <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className={`text-xs ${currentTheme.textSecondary}`}>Absent</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {dateAttendance.filter(r => r.status === 'absent').length}
                      </p>
                    </div>
                    
                    <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className={`text-xs ${currentTheme.textSecondary}`}>Half Day</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {dateAttendance.filter(r => r.status === 'half_day').length}
                      </p>
                    </div>
                    
                    <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className={`text-xs ${currentTheme.textSecondary}`}>Leave</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {dateAttendance.filter(r => r.status === 'leave').length}
                      </p>
                    </div>
                  </div>

                  {/* Employee List */}
                  <div className="space-y-3">
                    <h4 className={`font-semibold ${currentTheme.text} mb-3`}>Employee Details</h4>
                    
                    {/* Present Employees */}
                    {dateAttendance.filter(r => r.status === 'present').length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Present ({dateAttendance.filter(r => r.status === 'present').length})
                        </h5>
                        <div className="space-y-2">
                          {dateAttendance.filter(r => r.status === 'present').map((record) => (
                            <div key={record._id} className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-3 flex items-center justify-between`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className={`font-medium ${currentTheme.text}`}>{record.userId?.full_name}</p>
                                  <p className={`text-xs ${currentTheme.textSecondary}`}>{record.userId?.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm ${currentTheme.text}`}>
                                  {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                  {' → '}
                                  {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </p>
                                <p className={`text-xs ${currentTheme.textSecondary}`}>{record.workingHours.toFixed(2)}h</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Absent Employees */}
                    {dateAttendance.filter(r => r.status === 'absent').length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Absent ({dateAttendance.filter(r => r.status === 'absent').length})
                        </h5>
                        <div className="space-y-2">
                          {dateAttendance.filter(r => r.status === 'absent').map((record) => (
                            <div key={record._id} className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-3 flex items-center gap-3`}>
                              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                              </div>
                              <div>
                                <p className={`font-medium ${currentTheme.text}`}>{record.userId?.full_name}</p>
                                <p className={`text-xs ${currentTheme.textSecondary}`}>{record.userId?.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Status Employees */}
                    {dateAttendance.filter(r => !['present', 'absent'].includes(r.status)).length > 0 && (
                      <div>
                        <h5 className={`text-sm font-medium ${currentTheme.text} mb-2`}>Other Status</h5>
                        <div className="space-y-2">
                          {dateAttendance.filter(r => !['present', 'absent'].includes(r.status)).map((record) => (
                            <div key={record._id} className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-3 flex items-center justify-between`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                  <p className={`font-medium ${currentTheme.text}`}>{record.userId?.full_name}</p>
                                  <p className={`text-xs ${currentTheme.textSecondary}`}>{record.userId?.email}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${getStatusColor(record.status)}`}>
                                {getStatusIcon(record.status)}
                                {record.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
          )}
    </ResponsivePageLayout>
  );
}
