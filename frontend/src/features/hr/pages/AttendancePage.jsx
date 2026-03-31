import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import { useSearchParams } from 'react-router-dom';
import api from '@/shared/services/axios';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import AttendanceReviewModal from '@/features/hr/components/AttendanceReviewModal';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Save, X, Menu, Users, ChevronLeft, ChevronRight, Shield, AlertTriangle, FileText, Check, Ban, Search, Eye } from 'lucide-react';

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
  
  // New state for advanced features
  const [policies, setPolicies] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [exceptionFilter, setExceptionFilter] = useState('PENDING');

  // Verification state
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [reviewSearch, setReviewSearch] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');
  const [searchParams] = useSearchParams();
  const [pageTab, setPageTab] = useState(
    searchParams.get('tab') === 'shifts' ? 'shift-config' : 'attendance'
  );

  useEffect(() => {
    fetchAttendance();
    fetchSummary();
    checkTodayAttendance();
    if (isAdmin) {
      fetchPolicies();
      fetchExceptions();
      fetchDashboardStats();
      fetchPendingReviews();
    }
  }, [currentMonth, currentYear, exceptionFilter, reviewFilter]);

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

  const fetchPolicies = async () => {
    try {
      const response = await api.get('/hr/attendance/policies');
      setPolicies(response.data.policies || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const fetchExceptions = async () => {
    try {
      const response = await api.get('/hr/attendance/exceptions', {
        params: { status: exceptionFilter }
      });
      setExceptions(response.data.exceptions || []);
    } catch (error) {
      console.error('Error fetching exceptions:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/hr/attendance/dashboard');
      setDashboardStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      setReviewLoading(true);
      const response = await api.get('/hr/attendance/pending-reviews', {
        params: { verificationStatus: reviewFilter }
      });
      setPendingReviews(response.data.reviews || response.data || []);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = (attendance) => {
    setSelectedAttendance(attendance);
    setShowReviewModal(true);
  };

  const handleReviewComplete = (action) => {
    fetchPendingReviews();
    fetchAttendance();
    fetchDashboardStats();
  };

  const handleApproveException = async (exceptionId) => {
    try {
      await api.post(`/hr/attendance/exceptions/${exceptionId}/approve`);
      fetchExceptions();
      fetchDashboardStats();
      alert('Exception approved successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve exception');
    }
  };

  const handleRejectException = async (exceptionId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    try {
      await api.post(`/hr/attendance/exceptions/${exceptionId}/reject`, {
        response_reason: reason
      });
      fetchExceptions();
      alert('Exception rejected');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject exception');
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
              className={`px-4 py-2 rounded-lg ${currentTheme.primary} text-white ${currentTheme.primaryHover} flex items-center gap-2`}
            >
              <XCircle className="w-5 h-5" />
              Check Out
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className={`px-4 py-2 rounded-lg ${currentTheme.primary} text-white ${currentTheme.primaryHover} flex items-center gap-2`}
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
                { id: 'dashboard',    label: 'Dashboard',   icon: Calendar },
                { id: 'verification', label: 'Verification', icon: Shield },
                { id: 'exceptions',  label: 'Exceptions',  icon: AlertTriangle },
                { id: 'policies',    label: 'Policies',    icon: Shield },
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

          {/* Show attendance content for non-admin or attendance tab */}
          {(pageTab === 'attendance' || !isAdmin) && (
          <div>
          {/* ── Verification Tab ── */}
          {pageTab === 'verification' && isAdmin && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className={`text-lg font-bold ${currentTheme.text}`}>Pending Reviews</h3>
                <div className="flex items-center gap-3" data-mobile-filter-row>
                  {/* Status Filter */}
                  <select
                    value={reviewFilter}
                    onChange={(e) => setReviewFilter(e.target.value)}
                    className={`px-3 py-2 rounded-lg border text-sm ${currentTheme.surface} ${currentTheme.border} ${currentTheme.text} flex-shrink-0`}
                    data-mobile-filter-input
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="auto_approved">Auto-Approved</option>
                    <option value="auto_rejected">Auto-Rejected</option>
                    <option value="">All</option>
                  </select>
                  {/* Search */}
                  <div className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border ${currentTheme.border} flex-shrink-0 min-w-[220px]`} data-mobile-filter-input>
                    <Search className={`w-4 h-4 ${currentTheme.textSecondary}`} />
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      className={`bg-transparent outline-none text-sm ${currentTheme.text} w-full`}
                    />
                  </div>
                </div>
              </div>

              {/* Pending Reviews List */}
              {reviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-8 text-center`}>
                  <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className={currentTheme.textSecondary}>No pending reviews</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews
                    .filter(r => !reviewSearch || (r.userId?.full_name || r.user?.full_name || r.userId?.name || r.user?.name || '').toLowerCase().includes(reviewSearch.toLowerCase()))
                    .map((review) => (
                      <div
                        key={review._id || review.id}
                        className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4 hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className={`font-medium ${currentTheme.text}`}>
                                {review.userId?.full_name || review.user?.full_name || review.userId?.name || review.user?.name || 'Unknown User'}
                              </h4>
                              {/* Verification Status Badge */}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                (review.verificationStatus || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                (review.verificationStatus || '').toLowerCase() === 'approved' || (review.verificationStatus || '').toLowerCase() === 'auto_approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                (review.verificationStatus || '').toLowerCase() === 'rejected' || (review.verificationStatus || '').toLowerCase() === 'auto_rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }`}>
                                {(review.verificationStatus || 'pending').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div className={`text-sm ${currentTheme.textSecondary}`}>
                              <p>{new Date(review.date || review.createdAt).toLocaleDateString()}</p>
                              <p>
                                {review.checkIn && `In: ${new Date(review.checkIn).toLocaleTimeString()}`}
                                {review.checkOut && ` | Out: ${new Date(review.checkOut).toLocaleTimeString()}`}
                              </p>
                              {review.workMode && <p className="capitalize">Mode: {review.workMode}</p>}
                            </div>
                            {/* Verification Flags */}
                            {review.verificationFlags && review.verificationFlags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {review.verificationFlags.map((flag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded text-xs">
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => openReviewModal(review)}
                            className={`ml-4 flex items-center gap-2 px-3 py-2 rounded-lg ${currentTheme.primary} ${currentTheme.primaryHover} text-white text-sm`}
                          >
                            <Eye size={16} />
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── Dashboard Tab ── */}
          {pageTab === 'dashboard' && isAdmin && dashboardStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Today Present</p>
                  <p className="text-3xl font-bold text-green-600">{dashboardStats.today?.present || 0}</p>
                </div>
                <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Today Absent</p>
                  <p className="text-3xl font-bold text-red-600">{dashboardStats.today?.absent || 0}</p>
                </div>
                <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Flagged Records</p>
                  <p className="text-3xl font-bold text-amber-600">{dashboardStats.flaggedRecords || 0}</p>
                </div>
                <div className={`${currentTheme.surface} rounded-lg p-4 border ${currentTheme.border}`}>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>Pending Exceptions</p>
                  <p className="text-3xl font-bold text-blue-600">{dashboardStats.pendingExceptions || 0}</p>
                </div>
              </div>
              
              <div className={`${currentTheme.surface} rounded-lg border ${currentTheme.border} p-6`}>
                <h3 className={`text-lg font-bold ${currentTheme.text} mb-4`}>Attendance by Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {dashboardStats.attendanceByStatus?.map((stat) => (
                    <div key={stat._id} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold">{stat.count}</p>
                      <p className="text-sm text-gray-500 capitalize">{stat._id || 'unknown'}</p>
                      <p className="text-xs text-gray-400">{stat.totalHours?.toFixed(1) || 0} hrs</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Exceptions Tab ── */}
          {pageTab === 'exceptions' && isAdmin && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4" data-mobile-filter-row>
                {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setExceptionFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      exceptionFilter === status
                        ? 'bg-[#C4713A] text-white'
                        : `${currentTheme.surface} border ${currentTheme.border}`
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              <div className="space-y-3">
                {exceptions.length === 0 ? (
                  <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-8 text-center`}>
                    <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className={currentTheme.textSecondary}>No exceptions found</p>
                  </div>
                ) : (
                  exceptions.map((exc) => (
                    <div key={exc._id} className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              exc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              exc.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {exc.status}
                            </span>
                            <span className="text-sm font-medium">{exc.exception_type?.replace(/_/g, ' ')}</span>
                          </div>
                          <p className={`text-sm ${currentTheme.textSecondary}`}>
                            {exc.user_id?.full_name} - {new Date(exc.date).toLocaleDateString()}
                          </p>
                          {exc.details?.reason && (
                            <p className={`text-sm mt-2 ${currentTheme.text}`}>
                              <FileText size={14} className="inline mr-1" />
                              {exc.details.reason}
                            </p>
                          )}
                          {exc.approval?.response_reason && (
                            <p className="text-sm mt-2 text-gray-500">
                              Response: {exc.approval.response_reason}
                            </p>
                          )}
                        </div>
                        {exc.status === 'PENDING' && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleApproveException(exc._id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleRejectException(exc._id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                            >
                              <Ban size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Policies Tab ── */}
          {pageTab === 'policies' && isAdmin && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${currentTheme.text}`}>Attendance Policies</h3>
                <button
                  onClick={() => {
                    setEditingPolicy({});
                    setShowPolicyModal(true);
                  }}
                  className="px-4 py-2 bg-[#C4713A] text-white rounded-lg text-sm font-medium hover:bg-[#A35C28]"
                >
                  + Create Policy
                </button>
              </div>
              
              <div className="space-y-3">
                {policies.length === 0 ? (
                  <div className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-8 text-center`}>
                    <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className={currentTheme.textSecondary}>No policies configured. Create one to get started.</p>
                  </div>
                ) : (
                  policies.map((policy) => (
                    <div key={policy._id} className={`${currentTheme.surface} border ${currentTheme.border} rounded-lg p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{policy.policy_name}</h4>
                            {policy.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Inactive</span>
                            )}
                          </div>
                          {policy.description && (
                            <p className={`text-sm ${currentTheme.textSecondary} mb-2`}>
                              {policy.description}
                            </p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Grace Period:</span>
                              <span className="ml-1">{policy.rules?.grace_period_minutes || 15} min</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Min Hours:</span>
                              <span className="ml-1">{policy.rules?.minimum_working_hours || 8} hrs</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Half Day:</span>
                              <span className="ml-1">{policy.rules?.half_day_hours_threshold || 4} hrs</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Priority:</span>
                              <span className="ml-1">{policy.priority || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
                                className="text-[#C4713A] dark:text-[#D4905A] hover:text-[#A35C28] dark:hover:text-[#C4713A]"
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[var(--z-modal)] p-4">
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
          </div>
          )}
        {/* Attendance Review Modal */}
        <AttendanceReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAttendance(null);
          }}
          attendanceId={selectedAttendance?._id || selectedAttendance?.id}
          onActionComplete={handleReviewComplete}
        />
    </ResponsivePageLayout>
  );
}