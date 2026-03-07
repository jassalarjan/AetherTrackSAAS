/**
 * AppHeader � Phase 2 global top bar
 * 64 px fixed, warm-paper tokens throughout.
 * Props: title, subtitle, actions, icon (Lucide component), breadcrumbs[]
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth }    from '@/features/auth/context/AuthContext';
import { useTheme }   from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import api from '@/shared/services/axios';
import { CommandPalette } from '@/features/tasks/components/CommandPalette';
import Spinner from '@/shared/components/ui/Spinner';
import {
  Bell, Search, Sun, Moon, Menu,
  ChevronRight, X, CheckCheck, ExternalLink,
  LogOut, User as UserIcon, Settings as SettingsIcon,
} from 'lucide-react';

// -- Utility: human-readable time-ago ---------------------------------------
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// -- Notification panel ------------------------------------------------------
const NotifPanel = ({ open, onClose, panelRef }) => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setItems(data.notifications || []);
    } catch (_) { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const markAll = async () => {
    try { await api.patch('/notifications/mark-read'); load(); } catch (_) { /* silent */ }
  };

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="notif-panel-dropdown absolute right-0 top-full mt-2 w-[340px] z-[400] rounded-xl overflow-hidden"
      style={{ maxWidth: 'calc(100vw - 16px)' }}
      style={{
        background:  'var(--bg-raised)',
        border:      '1px solid var(--border-soft)',
        boxShadow:   'var(--shadow-xl)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <span
          style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          Notifications
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={markAll}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] transition-colors focus-visible:outline-none"
            style={{ color: 'var(--brand)', fontFamily: 'var(--font-body)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--brand-dim)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
            onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
            title="Mark all read"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors focus-visible:outline-none"
            style={{ color: 'var(--text-muted)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
            onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[360px] overflow-y-auto">
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Spinner size="sm" color="brand" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={28} style={{ color: 'var(--text-faint)', margin: '0 auto 8px' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
              All caught up!
            </p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n._id}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b focus-visible:outline-none"
              style={{ borderColor: 'var(--border-hair)' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-base)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
              onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Unread dot */}
              <span
                className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: n.read_at ? 'var(--border-soft)' : 'var(--brand)' }}
              />
              <div className="min-w-0 flex-1">
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: n.read_at ? 400 : 500,
                    color: n.read_at ? 'var(--text-secondary)' : 'var(--text-primary)',
                    lineHeight: '1.4',
                  }}
                >
                  {n.type?.replace(/_/g, ' ')}
                </p>
                {n.payload?.task_title || n.payload?.message ? (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {n.payload.task_title || n.payload.message}
                  </p>
                ) : null}
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// -- Breadcrumb segment -----------------------------------------------------
const Breadcrumb = ({ segments }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1">
    {segments.map((seg, i) => {
      const isLast = i === segments.length - 1;
      return (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          )}
          <span
            style={{
              fontFamily: isLast ? 'var(--font-heading)' : 'var(--font-body)',
              fontSize:   isLast ? '18px'                : '13px',
              fontWeight: isLast ? 500                   : 400,
              letterSpacing: isLast ? '-0.025em'         : 0,
              color:      isLast ? 'var(--text-primary)' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {seg}
          </span>
        </span>
      );
    })}
  </nav>
);

// -- Main export ------------------------------------------------------------
const AppHeader = ({
  title,
  subtitle,
  actions,
  icon: TitleIcon,
  breadcrumbs,         // optional string[] that overrides auto-breadcrumb
  noPadding = false,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark   = theme === 'dark';

  // Notification bell state
  const [bellOpen,  setBellOpen]  = useState(false);
  const [unread,    setUnread]    = useState(0);
  const bellRef  = useRef(null);
  const panelRef = useRef(null);

  // Command palette + user menu state
  const [cmdOpen, setCmdOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Derive user initials
  const userInitials = (
    user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
    user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
    user?.email?.[0]?.toUpperCase() ||
    'U'
  );

  // Fetch unread count
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (!cancelled) setUnread(data.unreadCount || 0);
      } catch (_) { /* silent */ }
    };
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ?K / Ctrl+K ? open command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close bell on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => {
      if (
        bellRef.current  && !bellRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Build breadcrumb segments
  const segments = breadcrumbs
    ? breadcrumbs
    : title
      ? ['AetherTrack', title]
      : ['AetherTrack'];

  return (
    <>
    <header
      className="flex-none flex items-center border-b"
      style={{
        height:      'var(--header-h, 64px)',
        background:  'var(--bg-canvas)',
        borderColor: 'var(--border-soft)',
        paddingInline: noPadding ? 0 : undefined,
      }}
    >
      <div className={`flex items-center justify-between w-full h-full app-header-inner ${noPadding ? '' : 'px-3 sm:px-6 lg:px-8'}`}>

        {/* -- LEFT: hamburger + breadcrumb -------------------------------- */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isMobile && (
            <button
              onClick={toggleMobileSidebar}
              className="flex-none p-2 rounded-lg transition-colors focus-visible:outline-none"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Open menu"
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
              onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
            >
              <Menu size={20} />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            {TitleIcon && (
              <div
                className="flex items-center justify-center rounded-md shrink-0"
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'var(--brand-dim)',
                }}
              >
                <TitleIcon size={16} style={{ color: 'var(--brand)' }} />
              </div>
            )}
            <div className="min-w-0">
              <Breadcrumb segments={segments} />
              {subtitle && (
                <p
                  className="truncate mt-0.5"
                  style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* -- RIGHT: search + bell + theme + actions + user -------- */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-none">

          {/* Search trigger ?K */}
          <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors focus-visible:outline-none"
            style={{
              background:   'var(--bg-base)',
              borderColor:  'var(--border-soft)',
              color:        'var(--text-muted)',
              fontFamily:   'var(--font-body)',
              fontSize:     '13px',
            }}
            aria-label="Quick search (?K)"
            onClick={() => setCmdOpen(true)}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
            onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
          >
            <Search size={13} />
            <span>Search�</span>
            <kbd
              className="ml-2 px-1.5 py-px rounded border"
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '11px',
                color:       'var(--text-faint)',
                background:  'var(--bg-surface)',
                borderColor: 'var(--border-mid)',
                lineHeight:  '1.5',
              }}
            >
              ?K
            </kbd>
          </button>

          {/* Keyboard shortcuts help '?' — hidden on tiny screens */}
          <button
            className="header-shortcuts-btn w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700 }}
            aria-label="Keyboard shortcuts (?)"
            onClick={() => window.dispatchEvent(new CustomEvent('show-shortcuts-help'))}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ?
          </button>

          {/* Notifications bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen((v) => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none"
              style={{ color: bellOpen ? 'var(--brand)' : 'var(--text-secondary)' }}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={bellOpen}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = bellOpen ? 'var(--brand)' : 'var(--text-secondary)'; }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
              onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] rounded-full flex items-center justify-center text-white"
                  style={{
                    background:  'var(--brand)',
                    fontFamily:  'var(--font-mono)',
                    fontSize:    '9px',
                    fontWeight:  700,
                    paddingInline: '2px',
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <NotifPanel
              open={bellOpen}
              onClose={() => setBellOpen(false)}
              panelRef={panelRef}
            />
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-hair)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
            onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Divider + custom actions */}
          {actions && (
            <>
              <div className="w-px h-5 mx-1" style={{ background: 'var(--border-soft)' }} />
              <div className="flex items-center gap-1.5">{actions}</div>
            </>
          )}

          {/* Divider before avatar */}
          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-soft)' }} />

          {/* User avatar � rightmost */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold focus-visible:outline-none transition-all"
              style={{
                background: user?.profile_picture ? 'transparent' : 'linear-gradient(135deg, var(--brand-light), #8B5E3C)',
                border: `2px solid ${userMenuOpen ? 'var(--brand)' : 'var(--border-soft)'}`,
                fontFamily: 'var(--font-body)',
                overflow: 'hidden',
              }}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
              onMouseOut={(e)  => { if (!userMenuOpen) e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
            >
              {user?.profile_picture
                ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                : userInitials
              }
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 z-[500] rounded-xl overflow-hidden"
                style={{
                  background: 'var(--bg-raised)',
                  border:     '1px solid var(--card-border, var(--border-soft))',
                  boxShadow:  'var(--shadow-xl)',
                }}
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: user?.profile_picture ? 'transparent' : 'linear-gradient(135deg, var(--brand-light), #8B5E3C)', overflow: 'hidden' }}
                    >
                      {user?.profile_picture
                        ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                        : userInitials
                      }
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {user?.full_name || user?.name || 'User'}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }} className="truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors focus-visible:outline-none"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '13px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-base)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <SettingsIcon size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    Profile &amp; Settings
                  </button>
                  <div className="mx-4 my-0.5" style={{ height: '1px', background: 'var(--border-hair)' }} />
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors focus-visible:outline-none"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '13px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <LogOut size={14} style={{ flexShrink: 0 }} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>

    {/* Global Command Palette */}
    <CommandPalette
      isOpen={cmdOpen}
      onClose={() => setCmdOpen(false)}
      onThemeToggle={toggleTheme}
    />
    </>
  );
};

export default AppHeader;
