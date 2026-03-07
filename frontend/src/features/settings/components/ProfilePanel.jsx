import { useState, useRef } from 'react';
import { User, Upload, Trash2 } from 'lucide-react';
import Spinner from '@/shared/components/ui/Spinner';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import api from '@/shared/services/axios';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const getColorFromName = (str) => {
  const colors = ['#3b82f6','#10b981','#a855f7','#ec4899','#6366f1','#14b8a6','#f97316','#06b6d4'];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const ProfilePanel = () => {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!validTypes.includes(file.type)) { showMsg('error', 'Please upload a valid image (JPEG, PNG, GIF, or WebP)'); return; }
    if (file.size > 2 * 1024 * 1024) { showMsg('error', 'Image too large. Maximum size is 2MB.'); return; }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const response = await api.post('/users/me/profile-picture', { profile_picture: reader.result });
          updateUser({ profile_picture: response.data.user.profile_picture });
          showMsg('success', 'Profile picture updated successfully!');
        } catch (err) {
          showMsg('error', err.response?.data?.message || 'Failed to upload profile picture');
        } finally { setIsUploading(false); }
      };
      reader.onerror = () => { showMsg('error', 'Failed to read the image file'); setIsUploading(false); };
      reader.readAsDataURL(file);
    } catch { showMsg('error', 'Failed to process the image'); setIsUploading(false); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    if (!user?.profile_picture) return;
    setIsUploading(true);
    try {
      await api.delete('/users/me/profile-picture');
      updateUser({ profile_picture: null });
      showMsg('success', 'Profile picture removed successfully!');
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to remove profile picture');
    } finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Profile</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your personal information and avatar.</p>
      </div>

      {/* Avatar */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-5">
          <User size={20} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Profile Picture</h3>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative flex-shrink-0">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.full_name || 'User'}
                className="w-20 h-20 rounded-full object-cover border-4" style={{ borderColor: 'var(--brand)' }} />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold border-4"
                style={{ backgroundColor: getColorFromName(user?.full_name), borderColor: 'var(--brand)' }}>
                {getInitials(user?.full_name)}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Spinner size="sm" color="white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange} className="hidden" id="profile-picture-input" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded transition-colors disabled:opacity-50"
              style={{ background: 'var(--brand)' }}>
              <Upload size={14} /> {user?.profile_picture ? 'Change Picture' : 'Upload Picture'}
            </button>
            {user?.profile_picture && (
              <button type="button" onClick={handleRemove} disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors text-red-500 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50">
                <Trash2 size={14} /> Remove
              </button>
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>JPEG, PNG, GIF or WebP • Max 2MB</p>
          </div>
        </div>
        {msg.text && (
          <div className={`mt-4 p-3 rounded border text-sm ${
            msg.type === 'success'
              ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
              : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
          }`}>{msg.text}</div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--text-primary)' }}>Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Full Name', value: user?.full_name || '' },
            { label: 'Email', value: user?.email || '' },
            { label: 'Role', value: user?.role?.replace('_', ' ') || '', capitalize: true },
            { label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '' },
          ].map(({ label, value, capitalize }) => (
            <div key={label}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <input type="text" value={value} readOnly
                className={`w-full px-3 py-2 border rounded text-sm outline-none ${capitalize ? 'capitalize' : ''}`}
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border-mid)', color: 'var(--text-secondary)' }} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          To change your name or email, contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default ProfilePanel;
