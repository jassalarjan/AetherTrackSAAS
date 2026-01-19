import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import api from '../api/axios';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Save, X, Menu } from 'lucide-react';

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

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');

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
            <div className="flex items-center gap-4">
              <label className={`text-sm font-medium ${currentTheme.text}`}>Month:</label>
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

              <label className={`text-sm font-medium ${currentTheme.text}`}>Year:</label>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className={`px-3 py-2 border ${currentTheme.border} rounded-lg ${currentTheme.surface} ${currentTheme.text}`}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Attendance Table */}
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
    </ResponsivePageLayout>
  );
}
