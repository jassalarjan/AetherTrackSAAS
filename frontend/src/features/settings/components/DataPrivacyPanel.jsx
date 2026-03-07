import { useState } from 'react';
import { Database, Download, Shield, Info } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useUserSettings } from '../hooks/useSettings';
import settingsService from '../services/settingsService';

const Toggle = ({ checked, onChange }) => (
  <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors"
    style={{ background: checked ? 'var(--brand)' : 'var(--border-mid)' }}>
    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
      style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
  </button>
);

const ToggleRow = ({ label, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b last:border-0" style={{ borderColor: 'var(--border-soft)' }}>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    <Toggle checked={!!checked} onChange={onChange} />
  </div>
);

const DataPrivacyPanel = () => {
  const { theme } = useTheme();
  const { settings, saving, update } = useUserSettings();

  const [exporting, setExporting]   = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportErr, setExportErr]   = useState('');
  const [privacyMsg, setPrivacyMsg] = useState({ type: '', text: '' });

  const showPrivMsg = (type, text) => { setPrivacyMsg({ type, text }); setTimeout(() => setPrivacyMsg({ type: '', text: '' }), 4000); };

  const handlePrivacyChange = async (key, val) => {
    const r = await update({ privacy: { ...settings?.privacy, [key]: val } });
    showPrivMsg(r?.success !== false ? 'success' : 'error', r?.success !== false ? 'Privacy settings saved.' : 'Save failed.');
  };

  const handleExport = async () => {
    setExporting(true);
    setExportErr('');
    try {
      await settingsService.requestDataExport();
      setExportDone(true);
    } catch (e) {
      setExportErr(e?.response?.data?.error || 'Export request failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Data &amp; Privacy</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your personal data preferences and privacy settings.</p>
      </div>

      {/* Privacy Toggles */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Privacy</h3>
        </div>

        {privacyMsg.text && (
          <div className={`mb-3 p-2.5 rounded border text-sm ${
            privacyMsg.type === 'success'
              ? theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
              : theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
          }`}>{privacyMsg.text}</div>
        )}

        <ToggleRow
          label="Show online status"
          description="Allow other workspace members to see when you are active."
          checked={settings?.privacy?.show_online_status}
          onChange={v => handlePrivacyChange('show_online_status', v)}
        />
        <ToggleRow
          label="Show activity feed"
          description="Allow your recent task activity to appear in the workspace activity feed."
          checked={settings?.privacy?.show_activity_feed}
          onChange={v => handlePrivacyChange('show_activity_feed', v)}
        />
      </div>

      {/* Data Export */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Data Export</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
          Request a full export of your personal data — profile info, tasks, comments, and settings. We'll prepare a download link and notify you by email within 24 hours.
        </p>

        {exportDone ? (
          <div className={`p-3 rounded border text-sm ${
            theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            ✓ Export requested! You'll receive an email with a download link within 24 hours.
          </div>
        ) : (
          <>
            {exportErr && (
              <div className={`mb-3 p-3 rounded border text-sm ${
                theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
              }`}>{exportErr}</div>
            )}
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded transition-colors disabled:opacity-50"
              style={{ background: 'var(--brand)' }}>
              <Download size={14} /> {exporting ? 'Requesting…' : 'Request Data Export'}
            </button>
          </>
        )}
      </div>

      {/* Account Deletion Notice */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-start gap-3">
          <Info size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Account Deletion</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              To permanently delete your account and all associated data, please contact a workspace administrator. Admins can remove accounts via <strong style={{ color: 'var(--text-primary)' }}>User Management → Users</strong>. This action is irreversible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPrivacyPanel;
