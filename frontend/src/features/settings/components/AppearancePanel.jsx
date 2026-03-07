import { Palette, Monitor, Sun, Moon } from 'lucide-react';
import ThemeToggle from '@/shared/components/ui/ThemeToggle';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useAuth } from '@/features/auth/context/AuthContext';

const AppearancePanel = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Appearance</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Customize how AetherTrack looks and feels.</p>
      </div>

      {/* Theme & Color */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center gap-3 mb-5">
          <Palette size={20} style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Theme &amp; Color Scheme</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Choose your preferred theme and accent color. Changes apply instantly and are saved locally.
        </p>
        <ThemeToggle />
      </div>

      {/* System integration note */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-start gap-4">
          <Monitor size={20} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>System Integration</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Theme preferences are stored in your browser's local storage and persist between sessions.
              On new devices you will start with the system default until you choose your preference.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { icon: <Sun size={14} />, label: 'Light mode — optimised for bright environments' },
                { icon: <Moon size={14} />, label: 'Dark mode — easier on the eyes at night' },
                { icon: <Monitor size={14} />, label: 'System — follows your OS preference' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border"
                  style={{ borderColor: 'var(--border-soft)', color: 'var(--text-secondary)', background: 'var(--bg-base)' }}>
                  {icon} {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Debug – admin only */}
      {user?.role === 'admin' && (
        <div className="rounded-xl border p-6" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-primary)' }}>
            Notification Debug <span className="text-xs font-normal normal-case ml-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>Admin Only</span>
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
            {[
              ['Browser Support', 'Notification' in window ? '✅ Supported' : '❌ Not Supported'],
              ['Permission', typeof Notification !== 'undefined' ? Notification.permission : 'N/A'],
              ['Service Worker', 'serviceWorker' in navigator ? '✅ Available' : '❌ Not Available'],
              ['SW Controller', navigator.serviceWorker?.controller ? '✅ Active' : '⚠️ None'],
              ['Current Theme', theme],
            ].map(([k, v]) => (
              <>
                <span key={`k-${k}`} style={{ color: 'var(--text-muted)' }}>{k}:</span>
                <span key={`v-${k}`} style={{ color: 'var(--text-primary)' }}>{v}</span>
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppearancePanel;
