import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConfirmModal } from '../hooks/useConfirmModal';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';
import ThemeToggle from '../components/ThemeToggle';
import NotificationSettings from '../components/NotificationSettings';

import ConfirmModal from '../components/modals/ConfirmModal';
import api from '../api/axios';
import { User, Settings as SettingsIcon, Palette, Monitor, Lock, Eye, EyeOff, Bell, AlertCircle, Camera, Trash2, Upload, AlertTriangle } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { theme, colorScheme, colorSchemes, currentColorScheme, currentTheme } = useTheme();
  const confirmModal = useConfirmModal();
  const fileInputRef = useRef(null);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureMessage, setPictureMessage] = useState({ type: '', text: '' });

  // Password strength validation
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Password requirements: 12+ chars, uppercase, lowercase, number, special char
  const passwordRequirements = [
    { key: 'length', label: 'At least 12 characters', test: (p) => p.length >= 12 },
    { key: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { key: 'number', label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
    { key: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/.test(p) }
  ];

  const handlePasswordFieldChange = (field, value) => {
    setPasswordData({ ...passwordData, [field]: value });
    if (field === 'newPassword') {
      const checks = {};
      passwordRequirements.forEach(req => {
        checks[req.key] = req.test(value);
      });
      setPasswordChecks(checks);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPictureMessage({ type: 'error', text: 'Please upload a valid image (JPEG, PNG, GIF, or WebP)' });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setPictureMessage({ type: 'error', text: 'Image too large. Maximum size is 2MB.' });
      return;
    }

    setIsUploadingPicture(true);
    setPictureMessage({ type: '', text: '' });

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result;
          const response = await api.post('/users/me/profile-picture', {
            profile_picture: base64
          });

          // Update user in context
          updateUser({ profile_picture: response.data.user.profile_picture });
          setPictureMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        } catch (error) {
          setPictureMessage({ 
            type: 'error', 
            text: error.response?.data?.message || 'Failed to upload profile picture' 
          });
        } finally {
          setIsUploadingPicture(false);
        }
      };
      reader.onerror = () => {
        setPictureMessage({ type: 'error', text: 'Failed to read the image file' });
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setPictureMessage({ type: 'error', text: 'Failed to process the image' });
      setIsUploadingPicture(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!user?.profile_picture) return;

    setIsUploadingPicture(true);
    setPictureMessage({ type: '', text: '' });

    try {
      await api.delete('/users/me/profile-picture');
      updateUser({ profile_picture: null });
      setPictureMessage({ type: 'success', text: 'Profile picture removed successfully!' });
    } catch (error) {
      setPictureMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to remove profile picture' 
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate a consistent color based on the name
  const getColorFromName = (str) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#a855f7', // purple
      '#ec4899', // pink
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#f97316', // orange
      '#06b6d4', // cyan
    ];
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    // Validate password against requirements
    const passwordValid = passwordRequirements.every(req => req.test(passwordData.newPassword));
    if (!passwordData.newPassword) {
      setPasswordMessage({ type: 'error', text: 'Password is required' });
      return;
    } else if (!passwordValid) {
      setPasswordMessage({ type: 'error', text: 'Password does not meet the security requirements' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await api.post('/users/me/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordMessage({ type: 'success', text: response.data.message });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to change password' 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    console.log('🗑️ Delete workspace initiated');
    
    try {
      const confirmed = await confirmModal.show({
        title: 'Delete Workspace & Account',
        message: `Are you absolutely sure you want to delete your workspace "${user?.workspace?.name}"?\n\nThis will PERMANENTLY DELETE:\n• Your account\n• All users in this workspace\n• All tasks and projects\n• All teams\n• All data and settings\n\nThis action cannot be undone!`,
        confirmText: 'Yes, Delete Everything',
        variant: 'danger'
      });

      console.log('First confirmation result:', confirmed);
      if (!confirmed) {
        console.log('User cancelled first confirmation');
        return;
      }

      // Second confirmation for extra safety
      const doubleConfirmed = await confirmModal.show({
        title: '⚠️ FINAL WARNING',
        message: `Last chance to change your mind!\n\nClicking "Confirm Deletion" will PERMANENTLY and IRREVERSIBLY delete:\n\n• Workspace: ${user?.workspace?.name}\n• Your account: ${user?.email}\n• ${user?.workspace?.type === 'COMMUNITY' ? 'All community' : 'All'} data\n\nThere is NO way to recover this data!`,
        confirmText: 'Confirm Deletion',
        variant: 'danger'
      });

      console.log('Second confirmation result:', doubleConfirmed);
      if (!doubleConfirmed) {
        console.log('User cancelled second confirmation');
        return;
      }

      console.log('✅ Both confirmations passed, deleting workspace...');
      const response = await api.delete('/workspaces/my-workspace/delete');
      console.log('Delete response:', response.data);
      
      // Logout and redirect to home page
      await logout();
      navigate('/', { 
        state: { 
          message: 'Your workspace and account have been permanently deleted.' 
        } 
      });
    } catch (error) {
      console.error('❌ Delete workspace error:', error);
      alert(error.response?.data?.message || 'Failed to delete workspace. Please contact support.');
    }
  };

  return (
    <ResponsivePageLayout title="Settings" icon={SettingsIcon} noPadding>
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-[#282f39] bg-white dark:bg-[#111418] shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight">Settings</h2>
              <p className="text-gray-600 dark:text-[#9da8b9] text-xs mt-1">Customize your AetherTrack experience</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Section */}
            <div className="bg-white dark:bg-[#1c2027] border-gray-200 dark:border-[#282f39] rounded border p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className={currentColorScheme.primaryText} size={24} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Profile</h3>
              </div>

              {/* Profile Picture Section */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-3">
                  Profile Picture
                </label>
                <div className="flex items-center gap-6">
                  {/* Current Avatar */}
                  <div className="relative">
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user?.full_name || 'User'}
                        className={`w-24 h-24 rounded-full object-cover border-4 ${currentColorScheme.primaryText.replace('text-', 'border-')}`}
                      />
                    ) : (
                      <div 
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 ${currentColorScheme.primaryText.replace('text-', 'border-')}`}
                        style={{ backgroundColor: getColorFromName(user?.full_name) }}
                      >
                        {getInitials(user?.full_name)}
                      </div>
                    )}
                    {isUploadingPicture && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      id="profile-picture-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPicture}
                      className={`flex items-center gap-2 px-4 py-2 ${currentColorScheme.primary} text-white rounded ${currentColorScheme.primaryHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Upload size={16} />
                      <span>{user?.profile_picture ? 'Change Picture' : 'Upload Picture'}</span>
                    </button>
                    {user?.profile_picture && (
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        disabled={isUploadingPicture}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    )}
                    <p className="text-xs text-gray-500 dark:text-[#9da8b9]">
                      JPEG, PNG, GIF or WebP. Max 2MB.
                    </p>
                  </div>
                </div>

                {/* Picture Upload Message */}
                {pictureMessage.text && (
                  <div className={`mt-3 p-3 rounded border ${
                    pictureMessage.type === 'success'
                      ? theme === 'dark'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-green-50 border-green-200 text-green-700'
                      : theme === 'dark'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {pictureMessage.text}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-full-name" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    id="profile-full-name"
                    type="text"
                    value={user?.full_name || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded"
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded"
                  />
                </div>
                <div>
                  <label htmlFor="profile-role" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">Role</label>
                  <input
                    id="profile-role"
                    type="text"
                    value={user?.role?.replace('_', ' ') || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded capitalize"
                  />
                </div>
                <div>
                  <label htmlFor="profile-member-since" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">Member Since</label>
                  <input
                    id="profile-member-since"
                    type="text"
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded"
                  />
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-[#1c2027] border-gray-200 dark:border-[#282f39] rounded border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Lock className={currentColorScheme.primaryText} size={24} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Security</h3>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showOldPassword ? "text" : "password"}
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 bg-white dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-[#9da8b9] hover:text-gray-900 dark:hover:text-white"
                    >
                      {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 bg-white dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent`}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-[#9da8b9] hover:text-gray-900 dark:hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  
                  {/* Password Requirements Display */}
                  {passwordData.newPassword && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Password requirements:</p>
                      <ul className="space-y-1">
                        {passwordRequirements.map((req) => (
                          <li 
                            key={req.key} 
                            className={`text-xs flex items-center gap-1.5 ${
                              passwordChecks[req.key] 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {passwordChecks[req.key] ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                            {req.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-bold text-gray-600 dark:text-[#9da8b9] uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 bg-white dark:bg-[#111418] border-gray-300 dark:border-[#282f39] text-gray-900 dark:text-white border rounded focus:ring-2 ${currentColorScheme.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent`}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-[#9da8b9] hover:text-gray-900 dark:hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {passwordMessage.text && (
                  <div className={`p-3 rounded border ${
                    passwordMessage.type === 'success'
                      ? theme === 'dark'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-green-50 border-green-200 text-green-700'
                      : theme === 'dark'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {passwordMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className={`w-full ${currentColorScheme.primary} ${currentColorScheme.primaryHover} text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Appearance Section */}
            <div className="bg-white dark:bg-[#1c2027] border-gray-200 dark:border-[#282f39] rounded border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Palette className={currentColorScheme.primaryText} size={24} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Appearance</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Theme & Color Scheme</h4>
                  <p className="text-sm text-gray-600 dark:text-[#9da8b9] mb-4">
                    Customize how AetherTrack looks and feels. Changes are saved automatically.
                  </p>
                  <ThemeToggle />
                </div>

                <div className="border-t border-gray-200 dark:border-[#282f39] pt-6">
                  <div className="flex items-center gap-3">
                    <Monitor className="text-gray-600 dark:text-[#9da8b9]" size={20} />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">System Integration</h4>
                      <p className="text-xs text-gray-600 dark:text-[#9da8b9] mt-1">
                        Your theme preferences are automatically synced across devices and saved locally.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white dark:bg-[#1c2027] border-gray-200 dark:border-[#282f39] rounded border p-6">
              <div className="flex items-center gap-3 mb-6">
                <SettingsIcon className={currentColorScheme.primaryText} size={24} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Preferences</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Email Notifications</h4>
                    <p className="text-xs text-gray-600 dark:text-[#9da8b9] mt-1">Receive email updates about your tasks</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className={`w-11 h-6 bg-gray-200 dark:bg-[#282f39] border-gray-300 dark:border-[#3e454f] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all border ${currentColorScheme.primary.replace('bg-', 'peer-checked:bg-')}`}></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Task Reminders</h4>
                    <p className="text-xs text-gray-600 dark:text-[#9da8b9] mt-1">Get reminded about upcoming due dates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className={`w-11 h-6 bg-gray-200 dark:bg-[#282f39] border-gray-300 dark:border-[#3e454f] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all border ${currentColorScheme.primary.replace('bg-', 'peer-checked:bg-')}`}></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-[#1c2027] border-gray-200 dark:border-[#282f39] rounded border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Bell className={currentColorScheme.primaryText} size={24} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h3>
              </div>
              <NotificationSettings />
            </div>

            {/* Debug Info - Admin Only */}
            {user?.role === 'admin' && (
              <div className="bg-white dark:bg-[#1c2027] border-gray-200 dark:border-[#282f39] rounded border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-yellow-500" size={24} />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notification Debug (Admin Only)</h3>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-600 dark:text-[#9da8b9]">Browser Support:</span>
                    <span className="text-gray-900 dark:text-white">
                      {'Notification' in window ? '✅ Supported' : '❌ Not Supported'}
                    </span>
                    
                    <span className="text-gray-600 dark:text-[#9da8b9]">Permission:</span>
                    <span className="text-gray-900 dark:text-white">
                      {typeof Notification !== 'undefined' ? Notification.permission : 'N/A'}
                    </span>
                    
                    <span className="text-gray-600 dark:text-[#9da8b9]">Service Worker:</span>
                    <span className="text-gray-900 dark:text-white">
                      {'serviceWorker' in navigator ? '✅ Available' : '❌ Not Available'}
                    </span>
                    
                    <span className="text-gray-600 dark:text-[#9da8b9]">SW Registered:</span>
                    <span className="text-gray-900 dark:text-white">
                      {navigator.serviceWorker?.controller ? '✅ Yes' : '⚠️ No'}
                    </span>
                  </div>
                  
                  <div className={`mt-4 p-3 rounded border ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                      <strong className="font-bold">Tip:</strong> If notifications aren't working, try:
                      <br />1. Check browser console for errors
                      <br />2. Verify HTTPS connection (required)
                      <br />3. Clear browser cache and reload
                      <br />4. Check browser notification settings
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone - Community Admin Only */}
            {user?.role === 'community_admin' && (
              <div className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 rounded border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-500" size={24} />
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Danger Zone</h3>
                </div>
                
                <div className="bg-white dark:bg-red-950/40 border-red-200 dark:border-red-900 border rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Trash2 className="text-red-500" size={28} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-gray-900 dark:text-white mb-2">
                        Delete Workspace & Account
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                        Permanently delete your workspace "<strong>{user?.workspace?.name}</strong>" and your account.
                      </p>
                      <div className="bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 border rounded-lg p-4 mb-4">
                        <p className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} />
                          This action will permanently delete:
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 ml-6 list-disc">
                          <li>Your account and login credentials</li>
                          <li>All users in this workspace</li>
                          <li>All tasks and projects</li>
                          <li>All teams and team members</li>
                          <li>All files and attachments</li>
                          <li>All settings and configurations</li>
                          <li>All activity history and logs</li>
                        </ul>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-3 font-bold">
                          ⚠️ This action cannot be undone! All data will be lost forever.
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteWorkspace}
                        className="
                          px-6 py-3 rounded-lg font-semibold text-sm
                          bg-red-600 hover:bg-red-700 text-white
                          transition-all duration-200
                          flex items-center gap-2
                          shadow-lg hover:shadow-xl
                          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                          focus:ring-offset-white dark:focus:ring-offset-[#111418]
                        "
                      >
                        <Trash2 size={18} />
                        Delete My Workspace & Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Confirm Modal */}
      <ConfirmModal {...confirmModal} />
    </ResponsivePageLayout>
  );
};

export default Settings;
