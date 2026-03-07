import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import api from '@/shared/services/axios';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import { Settings as SettingsIcon, Save, RotateCcw, Check, X, AlertCircle, Shield, MapPin, Camera, Smartphone, Clock, Eye, EyeOff } from 'lucide-react';

const DEFAULT_SETTINGS = {
  photoVerification: {
    enabled: false,
    mandatory: false,
    preventReuse: true
  },
  gpsVerification: {
    enabled: false,
    mandatory: false,
    accuracyThresholdMeters: 50,
    locationFreshnessSeconds: 300
  },
  deviceInfoCapture: {
    enabled: true
  }
};

export default function VerificationSettings() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const isDark = theme === 'dark';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showMessage, setShowMessage] = useState(false);

  const isAdmin = user && (user.role === 'admin' || user.role === 'hr');

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/attendance/verification-settings');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load verification settings' });
      setShowMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (category, key) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleNumberChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const response = await api.put('/hr/attendance/verification-settings', settings);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to save settings' });
      }
      setShowMessage(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to save settings' 
      });
      setShowMessage(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const response = await api.put('/hr/attendance/verification-settings', DEFAULT_SETTINGS);
      
      if (response.data.success) {
        setSettings(DEFAULT_SETTINGS);
        setMessage({ type: 'success', text: 'Settings reset to defaults!' });
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to reset settings' });
      }
      setShowMessage(true);
    } catch (error) {
      console.error('Error resetting settings:', error);
      setMessage({ type: 'error', text: 'Failed to reset settings' });
      setShowMessage(true);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked 
          ? 'bg-green-600' 
          : isDark 
            ? 'bg-gray-600' 
            : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const SettingSection = ({ icon: Icon, title, description, children }) => (
    <div className={`p-6 rounded-lg border ${
      isDark 
        ? 'bg-[#1c2027] border-[#333a47]' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-2 rounded-lg ${
          'bg-[var(--bg-surface)]'
        }`}>
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className={`font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h3>
          {description && (
            <p className={`text-sm ${
              'text-[var(--text-muted)]'
            }`}>
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4 ml-11">
        {children}
      </div>
    </div>
  );

  const SettingRow = ({ label, description, children }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {label}
        </p>
        {description && (
          <p className={`text-sm text-[var(--text-muted)]`}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );

  if (!isAdmin) {
    return (
      <ResponsivePageLayout>
        <div className={`flex items-center justify-center h-64 ${
          'text-[var(--text-muted)]'
        }`}>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-medium">Access Denied</p>
            <p>You don't have permission to access this page.</p>
          </div>
        </div>
      </ResponsivePageLayout>
    );
  }

  return (
    <ResponsivePageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileSidebar}
              className={`lg:hidden p-2 rounded-lg ${
                'hover:bg-[var(--bg-surface)]'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Verification Settings
              </h1>
              <p className={`text-sm ${
                'text-[var(--text-muted)]'
              }`}>
                Configure attendance verification requirements
              </p>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {showMessage && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span>{message.text}</span>
            <button 
              onClick={() => setShowMessage(false)}
              className="ml-auto hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Photo Verification Settings */}
            <SettingSection
              icon={Camera}
              title="Photo Verification"
              description="Configure photo capture and validation requirements"
            >
              <SettingRow
                label="Enable Photo Verification"
                description="Allow or require photo capture during check-in"
              >
                <ToggleSwitch
                  checked={settings.photoVerification.enabled}
                  onChange={() => handleToggle('photoVerification', 'enabled')}
                />
              </SettingRow>

              <SettingRow
                label="Mandatory Photo"
                description="Require photo for attendance to be valid"
              >
                <ToggleSwitch
                  checked={settings.photoVerification.mandatory}
                  onChange={() => handleToggle('photoVerification', 'mandatory')}
                  disabled={!settings.photoVerification.enabled}
                />
              </SettingRow>

              <SettingRow
                label="Prevent Photo Reuse"
                description="Detect and block reuse of previously captured photos"
              >
                <ToggleSwitch
                  checked={settings.photoVerification.preventReuse}
                  onChange={() => handleToggle('photoVerification', 'preventReuse')}
                  disabled={!settings.photoVerification.enabled}
                />
              </SettingRow>
            </SettingSection>

            {/* GPS Verification Settings */}
            <SettingSection
              icon={MapPin}
              title="GPS Verification"
              description="Configure location capture and geofencing requirements"
            >
              <SettingRow
                label="Enable GPS Verification"
                description="Allow or require GPS location during check-in"
              >
                <ToggleSwitch
                  checked={settings.gpsVerification.enabled}
                  onChange={() => handleToggle('gpsVerification', 'enabled')}
                />
              </SettingRow>

              <SettingRow
                label="Mandatory Location"
                description="Require valid GPS location for attendance to be valid"
              >
                <ToggleSwitch
                  checked={settings.gpsVerification.mandatory}
                  onChange={() => handleToggle('gpsVerification', 'mandatory')}
                  disabled={!settings.gpsVerification.enabled}
                />
              </SettingRow>

              <SettingRow
                label="GPS Accuracy Threshold"
                description="Maximum allowed GPS inaccuracy in meters"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={settings.gpsVerification.accuracyThresholdMeters}
                    onChange={(e) => handleNumberChange('gpsVerification', 'accuracyThresholdMeters', e.target.value)}
                    disabled={!settings.gpsVerification.enabled}
                    className={`w-24 px-3 py-2 rounded-lg border ${
                      isDark 
                        ? 'bg-[#282f39] border-[#333a47] text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } disabled:opacity-50`}
                  />
                  <span className={'text-[var(--text-muted)]'}>meters</span>
                </div>
              </SettingRow>

              <SettingRow
                label="Location Freshness"
                description="Maximum age of location data before requiring refresh"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="30"
                    max="1800"
                    value={settings.gpsVerification.locationFreshnessSeconds}
                    onChange={(e) => handleNumberChange('gpsVerification', 'locationFreshnessSeconds', e.target.value)}
                    disabled={!settings.gpsVerification.enabled}
                    className={`w-24 px-3 py-2 rounded-lg border ${
                      isDark 
                        ? 'bg-[#282f39] border-[#333a47] text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } disabled:opacity-50`}
                  />
                  <span className={'text-[var(--text-muted)]'}>seconds</span>
                </div>
              </SettingRow>
            </SettingSection>

            {/* Device Info Settings */}
            <SettingSection
              icon={Smartphone}
              title="Device Information"
              description="Capture device details for security and audit purposes"
            >
              <SettingRow
                label="Capture Device Info"
                description="Record device type, browser, and IP address"
              >
                <ToggleSwitch
                  checked={settings.deviceInfoCapture.enabled}
                  onChange={() => handleToggle('deviceInfoCapture', 'enabled')}
                />
              </SettingRow>
            </SettingSection>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`aether-btn aether-btn-primary ${saving ? 'opacity-70' : ''}`}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              <button
                onClick={handleReset}
                disabled={saving}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'bg-[#282f39] text-white hover:bg-[#333a47]' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <RotateCcw className="w-5 h-5" />
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsivePageLayout>
  );
}
