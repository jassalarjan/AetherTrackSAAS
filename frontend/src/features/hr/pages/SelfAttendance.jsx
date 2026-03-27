import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import PhotoCapture from '@/features/hr/components/PhotoCapture';
import LocationCapture from '@/features/hr/components/LocationCapture';
import useVerification from '@/features/hr/hooks/useVerification';
import api from '@/shared/services/axios';
import { PageLoader } from '@/shared/components/ui/Spinner';
import Spinner from '@/shared/components/ui/Spinner';
import { Clock, CheckCircle, XCircle, Calendar, MapPin, Briefcase, Home, Building, AlertTriangle, FileText, Upload, Camera, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

const SelfAttendance = () => {
  const { user } = useAuth();
  const verification = useVerification();
  const { loading: verificationLoading, isPhotoRequired, isGPSRequired, isPhotoEnabled, isGPSEnabled, getAccuracyThreshold, isVerificationComplete, getVerificationError, getRequirements } = verification;
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState(null);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // New state for enhanced features
  const [workMode, setWorkMode] = useState('onsite');
  const [reason, setReason] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  
  // Verification state
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [geofenceStatus, setGeofenceStatus] = useState(null);

  useEffect(() => {
    fetchTodayAttendance();
    fetchMyExceptions();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const response = await api.get('/hr/attendance', {
        params: {
          month: today.getMonth() + 1,
          year: today.getFullYear()
        }
      });

      const todayRecord = response.data.records.find(r =>
        new Date(r.date).toDateString() === today.toDateString() &&
        r.userId?._id?.toString() === user._id?.toString()
      );

      setCurrentAttendance(todayRecord || null);
      setAttendance(response.data.records.filter(r => r.userId?._id?.toString() === user._id?.toString()));
      
      // Fetch evaluation for today if exists
      if (todayRecord?._id) {
        try {
          const evalResponse = await api.get(`/hr/attendance/evaluations/${todayRecord._id}`);
          if (evalResponse.data.success) {
            setEvaluation(evalResponse.data.evaluation);
          }
        } catch (e) {
          // No evaluation found
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyExceptions = async () => {
    try {
      const response = await api.get('/hr/attendance/my-exceptions');
      setExceptions(response.data.exceptions || []);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      setError('');
      setVerificationError('');

      // Check verification requirements
      const requirements = getRequirements();
      const verificationData = {
        photo: capturedPhoto,
        location: capturedLocation
      };

      // Check if mandatory verifications are complete
      if (!isVerificationComplete(verificationData)) {
        const verificationErr = getVerificationError(verificationData);
        setVerificationError(verificationErr);
        setCheckingIn(false);
        return;
      }

      // Validate location against geofences if GPS is enabled
      if (capturedLocation && requirements.geofencingEnabled) {
        try {
          const geoValidation = await api.post('/geofences/validate', {
            latitude: capturedLocation.latitude,
            longitude: capturedLocation.longitude,
            required: requirements.gpsRequired
          });
          
          setGeofenceStatus(geoValidation.data);
          
          if (!geoValidation.data.valid && requirements.gpsRequired) {
            setVerificationError(geoValidation.data.message || 'Location validation failed');
            setCheckingIn(false);
            return;
          }
        } catch (geoErr) {
          // Continue if geofence validation fails - it's not critical
          console.error('Geofence validation error:', geoErr);
        }
      }

      const response = await api.post('/hr/attendance/checkin', {
        checkInTime: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        workMode,
        reason,
        photo: capturedPhoto,
        gpsLocation: capturedLocation,
        location: workMode === 'wfh' ? 'Work From Home' : 'Office',
        deviceInfo: capturedLocation ? {
          accuracy: capturedLocation.accuracy,
          timestamp: capturedLocation.timestamp
        } : undefined
      });

      setSuccess(response.data.message || 'Successfully checked in!');
      
      // Set evaluation if present
      if (response.data.evaluation) {
        setEvaluation(response.data.evaluation);
      }
      
      fetchTodayAttendance();
      setShowCheckInModal(false);
      setReason('');
      // Reset verification state
      setCapturedPhoto(null);
      setCapturedLocation(null);
      setGeofenceStatus(null);
    } catch (err) {
      console.error('Check-in error:', err);
      setError(err.response?.data?.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingIn(true);
      setError('');
      setSuccess('');

      const response = await api.post('/hr/attendance/checkout', {
        checkOutTime: new Date().toISOString()
      });

      setSuccess('Successfully checked out!');
      
      // Set evaluation if present
      if (response.data.evaluation) {
        setEvaluation(response.data.evaluation);
      }
      
      fetchTodayAttendance();
    } catch (err) {
      console.error('Check-out error:', err);
      setError(err.response?.data?.message || 'Failed to check out');
    } finally {
      setCheckingIn(false);
    }
  };

  const isCheckedIn = currentAttendance?.checkIn && !currentAttendance?.checkOut;
  const isCompleted = currentAttendance?.checkIn && currentAttendance?.checkOut;

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle size={16} className="mr-1" />
          Completed
        </span>
      );
    }
    if (isCheckedIn) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Clock size={16} className="mr-1" />
          Currently Working
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Not Checked In
      </span>
    );
  };

  const getWorkModeBadge = (mode) => {
    switch (mode) {
      case 'wfh':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Home size={12} className="mr-1" />
            WFH
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Building size={12} className="mr-1" />
            Hybrid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Building size={12} className="mr-1" />
            Onsite
          </span>
        );
    }
  };

  const getFlagBadges = () => {
    if (!evaluation?.flags?.triggered || evaluation.flags.triggered.length === 0) {
      return null;
    }

    return evaluation.flags.triggered.map((flag, index) => (
      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mr-1">
        <AlertTriangle size={12} className="mr-1" />
        {flag.replace(/_/g, ' ')}
      </span>
    ));
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate this week's stats
  const getWeekStats = () => {
    if (!attendance) return { total: 0, present: 0, unmarked: 0, wfh: 0 };

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Only count days from start of week up to (and including) today
    const daysPassed = now.getDay() + 1; // 1 = Sun, 2 = Mon … 7 = Sat

    const weekAttendance = attendance.filter(r => {
      const d = new Date(r.date);
      return d >= startOfWeek && d <= now;
    });

    const present = weekAttendance.filter(r => r.checkIn).length;
    const wfh = weekAttendance.filter(r => r.workMode === 'wfh' || r.status === 'wfh').length;
    // Days with no record at all = not yet marked
    const unmarked = Math.max(0, daysPassed - weekAttendance.length);

    return { total: daysPassed, present, unmarked, wfh };
  };

  const weekStats = getWeekStats();

  if (loading) return <PageLoader variant="pulse" label="Loading attendance…" />;

  return (
    <ResponsivePageLayout title="Attendance" icon={Clock}>
      <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight text-[#0d121b] dark:text-white">
              My Attendance
            </h2>
            <p className="text-[#4c669a] dark:text-gray-400 mt-1">
              Track your daily check-in and check-out
            </p>
          </div>

          {/* Status Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Today's Status Card */}
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Today - {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge()}
                  {currentAttendance?.workMode && getWorkModeBadge(currentAttendance.workMode)}
                  {getFlagBadges()}
                </div>
              </div>
              <div className="flex gap-3">
                {!isCheckedIn && !isCompleted ? (
                  <button
                    onClick={() => setShowCheckInModal(true)}
                    disabled={verificationLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C4713A] text-white rounded-lg font-bold hover:bg-[#A35C28] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={20} />
                    Check In
                  </button>
                ) : isCheckedIn ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkingIn}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle size={20} />
                    {checkingIn ? 'Checking Out...' : 'Check Out'}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Today's Time Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Clock size={16} />
                  <span className="text-sm font-medium">Check In</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(currentAttendance?.checkIn)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <XCircle size={16} />
                  <span className="text-sm font-medium">Check Out</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(currentAttendance?.checkOut)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Briefcase size={16} />
                  <span className="text-sm font-medium">Total Hours</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentAttendance?.workingHours || '0'} hrs
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  {currentAttendance?.workMode === 'wfh' ? <Home size={16} /> : <MapPin size={16} />}
                  <span className="text-sm font-medium">Work Mode</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentAttendance?.workMode === 'wfh' ? 'WFH' : currentAttendance?.workMode === 'hybrid' ? 'Hybrid' : 'Onsite'}
                </p>
              </div>
            </div>

            {/* Reason if present */}
            {currentAttendance?.reason && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <FileText size={16} />
                  <span className="text-sm font-medium">Reason</span>
                </div>
                <p className="text-gray-900 dark:text-white">{currentAttendance.reason}</p>
              </div>
            )}
          </div>

          {/* Week Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{weekStats.total}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Days in Week</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{weekStats.present}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Days Present</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <Clock size={24} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{weekStats.wfh}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">WFH Days</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <XCircle size={24} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{weekStats.unmarked}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not Marked</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Exceptions */}
          {exceptions.filter(e => e.status === 'PENDING').length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-4">Pending Exception Requests</h3>
              <div className="space-y-2">
                {exceptions.filter(e => e.status === 'PENDING').map((exc) => (
                  <div key={exc._id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{exc.exception_type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-500">{new Date(exc.date).toLocaleDateString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Attendance */}
          <div className="bg-white dark:bg-[#1a2234] rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Attendance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Check In</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Check Out</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Hours</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Mode</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance && attendance.length > 0 ? (
                    attendance.slice(0, 10).map((record) => (
                      <tr key={record._id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatTime(record.checkIn)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatTime(record.checkOut)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {record.workingHours || 0} hrs
                        </td>
                        <td className="py-3 px-4">
                          {getWorkModeBadge(record.workMode)}
                        </td>
                        <td className="py-3 px-4">
                          {record.checkIn && record.checkOut ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Present
                            </span>
                          ) : record.checkIn ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              In Progress
                            </span>
                          ) : record.status === 'wfh' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              WFH
                            </span>
                          ) : record.status === 'absent' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Absent
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Unmarked
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#1a2234] rounded-xl p-6 w-full max-w-lg mx-4 my-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Check In</h3>
            
            {/* Verification Status Summary */}
            {!verificationLoading && (isPhotoEnabled() || isGPSEnabled()) && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Verification Required</span>
                </div>
                <div className="flex gap-4 text-xs text-blue-700 dark:text-blue-300">
                  {isPhotoEnabled() && (
                    <span className={`flex items-center gap-1 ${capturedPhoto ? 'text-green-600' : ''}`}>
                      {capturedPhoto ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                      Photo {isPhotoRequired() ? '(Mandatory)' : '(Optional)'}
                    </span>
                  )}
                  {isGPSEnabled() && (
                    <span className={`flex items-center gap-1 ${capturedLocation ? 'text-green-600' : ''}`}>
                      {capturedLocation ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                      Location {isGPSRequired() ? '(Mandatory)' : '(Optional)'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Photo Capture - Show if enabled */}
            {isPhotoEnabled() && (
              <div className="mb-4">
                <PhotoCapture
                  onCapture={(photoData) => {
                    setCapturedPhoto(photoData);
                    setVerificationError('');
                  }}
                  onError={(err) => {
                    console.error('Photo capture error:', err);
                  }}
                  maxRetakes={getRequirements().maxRetakes}
                  disabled={checkingIn}
                />
              </div>
            )}

            {/* Location Capture - Show if enabled */}
            {isGPSEnabled() && (
              <div className="mb-4">
                <LocationCapture
                  onLocationCapture={(locationData) => {
                    setCapturedLocation(locationData);
                    setVerificationError('');
                  }}
                  onError={(err) => {
                    console.error('Location capture error:', err);
                  }}
                  requiredAccuracy={getRequirements().accuracyThreshold}
                  timeout={30000}
                  disabled={checkingIn}
                />
              </div>
            )}

            {/* Work Mode Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWorkMode('onsite')}
                  disabled={checkingIn}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                    workMode === 'onsite'
                      ? 'border-[#C4713A] bg-blue-50 dark:bg-blue-900/20 text-[#C4713A]'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <Building size={20} />
                  <span className="font-medium">Onsite</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkMode('wfh')}
                  disabled={checkingIn}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                    workMode === 'wfh'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <Home size={20} />
                  <span className="font-medium">WFH</span>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add any notes about your attendance..."
                disabled={checkingIn}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4713A] disabled:opacity-50"
                rows={3}
              />
            </div>

            {/* Verification Error */}
            {verificationError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{verificationError}</p>
                </div>
              </div>
            )}

            {/* Verification Requirements Warning */}
            {(isPhotoRequired() && !capturedPhoto) || (isGPSRequired() && !capturedLocation) ? (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                      Verification Required
                    </p>
                    <ul className="list-disc list-inside text-yellow-600 dark:text-yellow-500 space-y-1">
                      {isPhotoRequired() && !capturedPhoto && (
                        <li>Photo verification is required - please capture a photo</li>
                      )}
                      {isGPSRequired() && !capturedLocation && (
                        <li>GPS verification is required - please capture your location</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCheckInModal(false);
                  setReason('');
                  setWorkMode('onsite');
                  setCapturedPhoto(null);
                  setCapturedLocation(null);
                  setVerificationError('');
                }}
                disabled={checkingIn}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn || (isPhotoRequired() && !capturedPhoto) || (isGPSRequired() && !capturedLocation)}
                className="flex-1 px-4 py-2 bg-[#C4713A] text-white rounded-lg font-bold hover:bg-[#A35C28] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkingIn ? (
                  <>
                    <Spinner size="xs" color="white" />
                    Checking In...
                  </>
                ) : (
                  'Confirm Check In'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ResponsivePageLayout>
  );
};

export default SelfAttendance;
