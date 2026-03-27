import { useState, useEffect } from 'react';
import { useTheme } from '@/app/providers/ThemeProvider';
import attendanceApi from '@/features/hr/services/attendanceApi';
import MapView from '@/features/hr/components/MapView';
import { 
  X, Check, XCircle, AlertTriangle, Clock, MapPin, 
  Camera, Smartphone, FileText, User, Calendar,
  CheckCircle, XOctagon, AlertOctagon, Loader
} from 'lucide-react';

// Verification status badge colors
const STATUS_CONFIG = {
  PENDING: { color: 'bg-yellow-500', text: 'text-yellow-500', label: 'Pending', icon: Clock },
  APPROVED: { color: 'bg-green-500', text: 'text-green-500', label: 'Approved', icon: CheckCircle },
  REJECTED: { color: 'bg-red-500', text: 'text-red-500', label: 'Rejected', icon: XOctagon },
  AUTO_APPROVED: { color: 'bg-blue-500', text: 'text-blue-500', label: 'Auto-Approved', icon: Check },
  AUTO_REJECTED: { color: 'bg-orange-500', text: 'text-orange-500', label: 'Auto-Rejected', icon: AlertOctagon },
};

// Verification flags
const VERIFICATION_FLAGS = {
  GPS_INACCURATE: { label: 'GPS Inaccurate', description: 'GPS accuracy was below threshold' },
  LOCATION_OUTSIDE_GEOFENCE: { label: 'Outside Geofence', description: 'Location is outside allowed areas' },
  PHOTO_NOT_CAPTURED: { label: 'Photo Missing', description: 'Required photo was not captured' },
  PHOTO_REUSE_DETECTED: { label: 'Photo Reuse', description: 'Previously used photo detected' },
  DEVICE_INFO_MISSING: { label: 'Device Info Missing', description: 'Device information not captured' },
  LOCATION_NOT_CAPTURED: { label: 'Location Missing', description: 'GPS location was not captured' },
  TIME_ANOMALY: { label: 'Time Anomaly', description: 'Unusual check-in time detected' },
};

export default function AttendanceReviewModal({ 
  isOpen, 
  onClose, 
  attendanceId, 
  onActionComplete 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [actionMode, setActionMode] = useState(null); // 'approve', 'reject', 'override'
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [overrideData, setOverrideData] = useState({
    checkInTime: '',
    checkOutTime: '',
    workMode: 'onsite'
  });

  useEffect(() => {
    if (isOpen && attendanceId) {
      fetchAttendanceDetails();
    }
  }, [isOpen, attendanceId]);

  const fetchAttendanceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await attendanceApi.getAttendanceForReview(attendanceId);
      setAttendance(response.data.attendance || response.data);
      
      // Pre-fill override data if editing
      if (response.data.attendance?.checkIn) {
        setOverrideData(prev => ({
          ...prev,
          checkInTime: new Date(response.data.attendance.checkIn).toISOString().slice(0, 16),
          checkOutTime: response.data.attendance.checkOut 
            ? new Date(response.data.attendance.checkOut).toISOString().slice(0, 16)
            : ''
        }));
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await attendanceApi.approveAttendance(attendanceId, notes);
      onActionComplete?.('approved');
      handleClose();
    } catch (err) {
      console.error('Error approving:', err);
      setError(err.response?.data?.message || 'Failed to approve attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setSubmitting(true);
      await attendanceApi.rejectAttendance(attendanceId, rejectReason);
      onActionComplete?.('rejected');
      handleClose();
    } catch (err) {
      console.error('Error rejecting:', err);
      setError(err.response?.data?.message || 'Failed to reject attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = async () => {
    if (!rejectReason.trim()) {
      setError('Override reason is required');
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        ...overrideData,
        checkInTime: overrideData.checkInTime ? new Date(overrideData.checkInTime).toISOString() : undefined,
        checkOutTime: overrideData.checkOutTime ? new Date(overrideData.checkOutTime).toISOString() : undefined
      };
      await attendanceApi.overrideAttendance(attendanceId, data, rejectReason);
      onActionComplete?.('overridden');
      handleClose();
    } catch (err) {
      console.error('Error overriding:', err);
      setError(err.response?.data?.message || 'Failed to override attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAttendance(null);
    setActionMode(null);
    setNotes('');
    setRejectReason('');
    setOverrideData({ checkInTime: '', checkOutTime: '', workMode: 'onsite' });
    setError(null);
    onClose();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} bg-opacity-10 ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const FlagBadge = ({ flag }) => {
    const flagInfo = VERIFICATION_FLAGS[flag] || { label: flag, description: flag };
    
    return (
      <div className={`flex items-start gap-2 p-2 rounded text-xs ${
        isDark ? 'bg-red-500/10' : 'bg-red-50'
      }`}>
        <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-medium text-red-500">{flagInfo.label}</span>
          <p className={isDark ? 'text-[#9da8b9]' : 'text-gray-500'}>{flagInfo.description}</p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`relative w-full max-w-full md:max-w-4xl max-h-[90vh] mx-2 md:mx-0 overflow-hidden rounded-lg shadow-xl ${
          isDark ? 'bg-[#1c2027]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-[#333a47]' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <h2
              id="modal-title"
              className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Attendance Review
            </h2>
            {attendance?.verificationStatus && (
              <StatusBadge status={attendance.verificationStatus} />
            )}
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className={`p-1 rounded ${
              isDark ? 'hover:bg-[#282f39]' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error && !attendance ? (
            <div className={`flex items-center justify-center h-64 ${
              isDark ? 'text-[#9da8b9]' : 'text-gray-500'
            }`}>
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <p>{error}</p>
              </div>
            </div>
          ) : attendance ? (
            <div className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {error}
                </div>
              )}

              {/* User Info & Date */}
              <div className={`flex flex-wrap items-center gap-4 p-4 rounded-lg ${
                isDark ? 'bg-[#282f39]' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2">
                  <User className={`w-4 h-4 ${isDark ? 'text-[#9da8b9]' : 'text-gray-500'}`} />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {attendance.userId?.name || attendance.user?.name || 'Unknown User'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${isDark ? 'text-[#9da8b9]' : 'text-gray-500'}`} />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {attendance.date || formatDate(attendance.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${isDark ? 'text-[#9da8b9]' : 'text-gray-500'}`} />
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {attendance.checkIn ? `In: ${formatDate(attendance.checkIn)}` : '-'}
                    {attendance.checkOut && ` | Out: ${formatDate(attendance.checkOut)}`}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Photo Preview */}
                <div>
                  <h3 className={`font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Camera className="w-4 h-4 inline mr-2" />
                    Photo Verification
                  </h3>
                  <div className={`rounded-lg border overflow-hidden ${
                    isDark ? 'border-[#333a47]' : 'border-gray-200'
                  }`}>
                    {attendance.photoUrl || attendance.photo ? (
                      <img 
                        src={attendance.photoUrl || attendance.photo} 
                        alt="Check-in photo"
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className={`h-48 flex items-center justify-center ${
                        isDark ? 'bg-[#282f39]' : 'bg-gray-100'
                      }`}>
                        <Camera className={`w-8 h-8 ${
                          isDark ? 'text-[#9da8b9]' : 'text-gray-400'
                        }`} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Map */}
                <div>
                  <h3 className={`font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Location Verification
                  </h3>
                  <div className={`rounded-lg overflow-hidden border ${
                    isDark ? 'border-[#333a47]' : 'border-gray-200'
                  }`}>
                    {attendance.location?.latitude && attendance.location?.longitude ? (
                      <MapView
                        latitude={attendance.location.latitude}
                        longitude={attendance.location.longitude}
                        radius={50}
                        height="192px"
                        zoom={15}
                      />
                    ) : (
                      <div className={`h-48 flex items-center justify-center ${
                        isDark ? 'bg-[#282f39]' : 'bg-gray-100'
                      }`}>
                        <MapPin className={`w-8 h-8 ${
                          isDark ? 'text-[#9da8b9]' : 'text-gray-400'
                        }`} />
                      </div>
                    )}
                    {attendance.location && (
                      <div className={`p-2 text-xs ${
                        isDark ? 'bg-[#282f39] text-[#9da8b9]' : 'bg-gray-50 text-gray-600'
                      }`}>
                        📍 {attendance.location.latitude?.toFixed(6)}, {attendance.location.longitude?.toFixed(6)}
                        {attendance.location.accuracy && ` (Accuracy: ±${Math.round(attendance.location.accuracy)}m)`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Device Info */}
              {attendance.deviceInfo && (
                <div>
                  <h3 className={`font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Smartphone className="w-4 h-4 inline mr-2" />
                    Device Information
                  </h3>
                  <div className={`p-3 rounded-lg text-sm ${
                    isDark ? 'bg-[#282f39]' : 'bg-gray-50'
                  }`}>
                    <div className="grid grid-cols-2 gap-2">
                      {attendance.deviceInfo.browser && (
                        <div>
                          <span className={isDark ? 'text-[#9da8b9]' : 'text-gray-500'}>Browser:</span>
                          <span className={isDark ? 'text-white ml-2' : 'text-gray-900 ml-2'}>
                            {attendance.deviceInfo.browser}
                          </span>
                        </div>
                      )}
                      {attendance.deviceInfo.os && (
                        <div>
                          <span className={isDark ? 'text-[#9da8b9]' : 'text-gray-500'}>OS:</span>
                          <span className={isDark ? 'text-white ml-2' : 'text-gray-900 ml-2'}>
                            {attendance.deviceInfo.os}
                          </span>
                        </div>
                      )}
                      {attendance.deviceInfo.ip && (
                        <div>
                          <span className={isDark ? 'text-[#9da8b9]' : 'text-gray-500'}>IP:</span>
                          <span className={isDark ? 'text-white ml-2' : 'text-gray-900 ml-2'}>
                            {attendance.deviceInfo.ip}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Flags */}
              {attendance.verificationFlags && attendance.verificationFlags.length > 0 && (
                <div>
                  <h3 className={`font-medium mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-yellow-500" />
                    Verification Flags
                  </h3>
                  <div className="grid gap-2">
                    {attendance.verificationFlags.map((flag, index) => (
                      <FlagBadge key={index} flag={flag} />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Section */}
              {!actionMode && attendance.verificationStatus === 'PENDING' && (
                <div className={`flex flex-wrap gap-3 pt-4 border-t ${
                  isDark ? 'border-[#333a47]' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => setActionMode('approve')}
                    className="aether-btn aether-btn-success"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setActionMode('reject')}
                    className="aether-btn aether-btn-danger"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => setActionMode('override')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C4713A] text-white hover:bg-[#A35C28]"
                  >
                    <FileText className="w-4 h-4" />
                    Override
                  </button>
                </div>
              )}

              {/* Action Forms */}
              {actionMode === 'approve' && (
                <div className={`p-4 rounded-lg border ${
                  isDark ? 'border-[#333a47] bg-[#282f39]' : 'border-gray-200 bg-gray-50'
                }`}>
                  <h3 className={`font-medium mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Approve Attendance
                  </h3>
                  <div className="mb-3">
                    <label className={`block text-sm mb-1 ${
                      isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                    }`}>
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-[#1c2027] border-[#333a47] text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Add any notes about this approval..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="aether-btn aether-btn-success"
                    >
                      {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Confirm Approval
                    </button>
                    <button
                      onClick={() => setActionMode(null)}
                      className={`px-4 py-2 rounded-lg ${
                        isDark ? 'bg-[#1c2027] text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {actionMode === 'reject' && (
                <div className={`p-4 rounded-lg border ${
                  isDark ? 'border-[#333a47] bg-[#282f39]' : 'border-gray-200 bg-gray-50'
                }`}>
                  <h3 className={`font-medium mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Reject Attendance
                  </h3>
                  <div className="mb-3">
                    <label className={`block text-sm mb-1 ${
                      isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                    }`}>
                      Reason *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      required
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-[#1c2027] border-[#333a47] text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Explain why this attendance is being rejected..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={submitting || !rejectReason.trim()}
                      className="aether-btn aether-btn-danger"
                    >
                      {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => setActionMode(null)}
                      className={`px-4 py-2 rounded-lg ${
                        isDark ? 'bg-[#1c2027] text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {actionMode === 'override' && (
                <div className={`p-4 rounded-lg border ${
                  isDark ? 'border-[#333a47] bg-[#282f39]' : 'border-gray-200 bg-gray-50'
                }`}>
                  <h3 className={`font-medium mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Override Attendance
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={`block text-sm mb-1 ${
                        isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                      }`}>
                        Check-in Time
                      </label>
                      <input
                        type="datetime-local"
                        value={overrideData.checkInTime}
                        onChange={(e) => setOverrideData(prev => ({ ...prev, checkInTime: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark 
                            ? 'bg-[#1c2027] border-[#333a47] text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm mb-1 ${
                        isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                      }`}>
                        Check-out Time
                      </label>
                      <input
                        type="datetime-local"
                        value={overrideData.checkOutTime}
                        onChange={(e) => setOverrideData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark 
                            ? 'bg-[#1c2027] border-[#333a47] text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className={`block text-sm mb-1 ${
                      isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                    }`}>
                      Work Mode
                    </label>
                    <select
                      value={overrideData.workMode}
                      onChange={(e) => setOverrideData(prev => ({ ...prev, workMode: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-[#1c2027] border-[#333a47] text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="onsite">On-site</option>
                      <option value="wfh">Work From Home</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className={`block text-sm mb-1 ${
                      isDark ? 'text-[#9da8b9]' : 'text-gray-600'
                    }`}>
                      Reason for Override *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      required
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-[#1c2027] border-[#333a47] text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Explain why this override is necessary..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleOverride}
                      disabled={submitting || !rejectReason.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C4713A] text-white hover:bg-[#A35C28] disabled:opacity-50"
                    >
                      {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Confirm Override
                    </button>
                    <button
                      onClick={() => setActionMode(null)}
                      className={`px-4 py-2 rounded-lg ${
                        isDark ? 'bg-[#1c2027] text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
