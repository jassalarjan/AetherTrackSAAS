/**
 * SettingsNav — left-sidebar navigation for the settings dashboard.
 *
 * Props:
 *   sections   — array of { id, label, icon, group } (already role-filtered)
 *   active     — currently active section id
 *   onNavigate — (id) => void
 *   mobileOpen — boolean, controls overlay visibility on mobile
 *   onMobileClose — () => void
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';

const SettingsNav = ({ sections = [], active, onNavigate, mobileOpen, onMobileClose }) => {
  const { theme } = useTheme();

  // Close overlay when pressing Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onMobileClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen, onMobileClose]);

  // Group sections
  const groups = [];
  const seen = new Set();
  sections.forEach(s => {
    if (!seen.has(s.group)) {
      seen.add(s.group);
      groups.push(s.group);
    }
  });

  const NavContent = () => (
    <nav className="h-full flex flex-col overflow-y-auto py-4" style={{ minWidth: 0 }}>
      <div className="px-3 pb-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Settings
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {groups.map(group => {
          const items = sections.filter(s => s.group === group);
          return (
            <div key={group} className="pt-3 pb-1">
              <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}>
                {group}
              </p>
              {items.map(({ id, label, icon: Icon }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg mx-1 transition-all duration-150"
                    style={{
                      width: 'calc(100% - 8px)',
                      background: isActive
                        ? theme === 'dark' ? 'rgba(196,113,58,0.12)' : 'rgba(196,113,58,0.08)'
                        : 'transparent',
                      color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0, color: isActive ? 'var(--brand)' : 'currentColor', opacity: isActive ? 1 : 0.7 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--brand)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col border-r shrink-0"
        style={{
          width: 220,
          minWidth: 220,
          background: 'var(--bg-canvas)',
          borderColor: 'var(--border-soft)',
        }}
      >
        <NavContent />
      </aside>

      {/* ── Mobile overlay ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          onClick={onMobileClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Drawer */}
          <div
            className="relative flex flex-col border-r"
            style={{
              width: 260,
              background: 'var(--bg-canvas)',
              borderColor: 'var(--border-soft)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Settings</p>
              <button
                onClick={onMobileClose}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <NavContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsNav;
