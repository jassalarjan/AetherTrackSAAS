/**
 * AppHeader � Phase 2 global top bar
 * 64 px fixed, warm-paper tokens throughout.
 * Props: title, subtitle, actions, icon (Lucide component), breadcrumbs[]
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth }    from '@/features/auth/context/AuthContext';
import { getAccessToken } from '@/features/auth/services/tokenStore';
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

// -- Compute fixed-position coordinates for a dropdown anchored to btnEl -----
// Returns { top, right } in pixels (viewport-relative), suitable for position:fixed.
const computeDropdownPos = (btnEl, dropdownWidth = 208, dropdownHeight = 320) => {
  const rect = btnEl.getBoundingClientRect();
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;

  // Vertical: open below the button; flip above when insufficient space below
  const spaceBelow = vh - rect.bottom;
  const top = (spaceBelow >= dropdownHeight || spaceBelow >= rect.top)
    ? rect.bottom + 8
    : Math.max(8, rect.top - dropdownHeight - 8);

  // Horizontal: right-align the dropdown with the button's right edge.
  // If that would push the dropdown off the left edge, left-align it instead.
  let right = vw - rect.right;
  if (rect.right - dropdownWidth < 8) {
    right = Math.max(8, vw - Math.min(rect.left + dropdownWidth, vw - 8));
  }

  return { top: Math.max(8, top), right: Math.max(8, right) };
};

// -- Notification panel ------------------------------------------------------
const NotifPanel = ({ open, onClose, panelRef, pos, canQuery }) => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!canQuery) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setItems(data.notifications || []);
    } catch (_) { /* silent */ }
    finally { setLoading(false); }
  }, [canQuery]);

  const markAll = async () => {
    if (!canQuery) return;
    try { await api.patch('/notifications/mark-read'); load(); } catch (_) { /* silent */ }
  };

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="notif-panel-dropdown rounded-xl overflow-hidden"
      style={{
        position:   'fixed',
        top:        `${pos?.top ?? 72}px`,
        right:      `${pos?.right ?? 8}px`,
        width:      '340px',
        maxWidth:   'calc(100vw - 16px)',
        zIndex:     9999,
        background: 'var(--bg-raised)',
        border:     '1px solid var(--border-soft)',
        boxShadow:  'var(--shadow-xl)',
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
  <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0">
    {segments.map((seg, i) => {
      const isLast = i === segments.length - 1;
      return (
        <span key={i} className={`flex items-center gap-1 ${!isLast && i === 0 ? 'hidden sm:flex' : ''} min-w-0`}>
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
              overflow: isLast ? 'hidden' : undefined,
              textOverflow: isLast ? 'ellipsis' : undefined,
              maxWidth: isLast ? '180px' : undefined,
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
  const { toggleMobileSidebar, isMobile, toggleCollapse } = useSidebar();
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

  // Fixed-position coordinates for dropdowns
  const [userMenuPos, setUserMenuPos] = useState({ top: 72, right: 8 });
  const [notifPos,    setNotifPos]    = useState({ top: 72, right: 8 });

  // Derive user initials
  const userInitials = (
    user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
    user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
    user?.email?.[0]?.toUpperCase() ||
    'U'
  );

  const canQueryNotifications = Boolean(user?.id && getAccessToken());

  // Fetch unread count
  useEffect(() => {
    if (!canQueryNotifications) {
      setUnread(0);
      return;
    }

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
  }, [canQueryNotifications]);

  // ⌘K / Ctrl+K → open command palette
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

  // Custom events from global shortcut hook
  useEffect(() => {
    const openPalette  = () => setCmdOpen(true);
    const toggleSidebar = () => {
      if (isMobile) toggleMobileSidebar();
      else toggleCollapse?.();
    };
    window.addEventListener('open-command-palette', openPalette);
    window.addEventListener('toggle-sidebar', toggleSidebar);
    return () => {
      window.removeEventListener('open-command-palette', openPalette);
      window.removeEventListener('toggle-sidebar', toggleSidebar);
    };
  }, [isMobile, toggleMobileSidebar, toggleCollapse]);

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
      if (
        userMenuRef.current && !userMenuRef.current.contains(e.target)
      ) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Close dropdowns on window resize to avoid stale fixed coordinates
  useEffect(() => {
    if (!bellOpen && !userMenuOpen) return;
    const handler = () => { setBellOpen(false); setUserMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [bellOpen, userMenuOpen]);

  // Build breadcrumb segments
  const segments = breadcrumbs
    ? breadcrumbs
    : title
      ? ['AetherTrack', title]
      : ['AetherTrack'];

  // Avoid stale overlays intercepting clicks after navigation.
  useEffect(() => {
    setBellOpen(false);
    setUserMenuOpen(false);
    setCmdOpen(false);
  }, [location.pathname]);

  return (
    <>
    <header
      className="flex-none flex items-center border-b"
      style={{
        height:      'var(--header-h, 64px)',
        background:  'var(--bg-canvas)',
        borderColor: 'var(--border-soft)',
        paddingInline: noPadding ? 0 : undefined,
        paddingTop:  'var(--safe-top, 0px)',
      }}
    >
      <div className={`flex items-center justify-between w-full h-full app-header-inner ${noPadding ? '' : 'px-3 sm:px-6 lg:px-8'}`}>

        {/* -- LEFT: hamburger + breadcrumb -------------------------------- */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-none pl-2">

          {/* Search — icon-only on mobile */}
          <button
            className="flex sm:hidden w-9 h-9 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none"
            style={{
              background:  'var(--bg-base)',
              borderColor: 'var(--border-soft)',
              color:       'var(--text-muted)',
            }}
            aria-label="Quick search"
            onClick={() => setCmdOpen(true)}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-base)'; }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
            onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
          >
            <Search size={15} />
          </button>

          {/* Search — full pill on sm+ */}
          <button
            className="hidden sm:flex items-center gap-2.5 rounded-xl border transition-all focus-visible:outline-none"
            style={{
              minWidth:     '180px',
              width:        'clamp(180px, 18vw, 280px)',
              padding:      '7px 14px',
              background:   'var(--bg-base)',
              borderColor:  'var(--border-soft)',
              color:        'var(--text-muted)',
              fontFamily:   'var(--font-body)',
              fontSize:     '13px',
              lineHeight:   '1',
            }}
            aria-label="Quick search (?K)"
            onClick={() => setCmdOpen(true)}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-mid)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'var(--bg-surface)';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-soft)';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'var(--bg-base)';
              e.currentTarget.style.boxShadow = '';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = 'var(--focus-ring), 0 1px 4px rgba(0,0,0,.06)';
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = 'var(--border-soft)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Search size={14} style={{ flexShrink: 0 }} />
            <span className="flex-1 text-left truncate">Search...</span>
            <kbd
              className="px-1.5 py-0.5 rounded-md border flex-none"
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '10px',
                color:       'var(--text-faint)',
                background:  'var(--bg-canvas)',
                borderColor: 'var(--border-mid)',
                lineHeight:  '1.6',
                letterSpacing: '0.02em',
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Keyboard shortcuts help '?' — hidden on mobile */}
          <button
            className="header-shortcuts-btn hidden sm:flex w-8 h-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none"
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
              onClick={() => {
                if (!bellOpen && bellRef.current) {
                  setNotifPos(computeDropdownPos(bellRef.current, 340, 420));
                }
                setBellOpen((v) => !v);
              }}
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
              pos={notifPos}
              canQuery={canQueryNotifications}
            />
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="header-theme-toggle w-9 h-9 flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none"
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

          {/* Divider + custom actions — hidden on mobile (too cramped) */}
          {actions && (
            <>
              <div className="hidden sm:block w-px h-5 mx-2" style={{ background: 'var(--border-soft)' }} />
              <div className="hidden sm:flex items-center gap-2">{actions}</div>
            </>
          )}

          {/* Divider before avatar */}
          <div className="w-px h-5 mx-1.5" style={{ background: 'var(--border-soft)' }} />

          {/* User avatar � rightmost */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                if (!userMenuOpen && userMenuRef.current) {
                  setUserMenuPos(computeDropdownPos(userMenuRef.current, 208, 200));
                }
                setUserMenuOpen((v) => !v);
              }}
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
                style={{
                  position:   'fixed',
                  top:        `${userMenuPos.top}px`,
                  right:      `${userMenuPos.right}px`,
                width:      '232px',
                  maxWidth:   'calc(100vw - 16px)',
                  zIndex:     9999,
                  background: 'var(--bg-raised)',
                  border:     '1px solid var(--card-border, var(--border-soft))',
                  boxShadow:  'var(--shadow-xl)',
                  borderRadius: '12px',
                  overflow:   'hidden',
                }}
              >
                {/* User info header */}
                <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: user?.profile_picture ? 'transparent' : 'linear-gradient(135deg, var(--brand-light), #8B5E3C)', overflow: 'hidden' }}
                    >
                      {user?.profile_picture
                        ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                        : userInitials
                      }
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {user?.full_name || user?.name || 'User'}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '2px' }} className="truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '13px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-base)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <SettingsIcon size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    Profile &amp; Settings
                  </button>
                  <div className="mx-4 my-1" style={{ height: '1px', background: 'var(--border-hair)' }} />
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '13px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <LogOut size={15} style={{ flexShrink: 0 }} />
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
