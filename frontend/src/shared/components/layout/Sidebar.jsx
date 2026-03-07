import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import { useConfirmModal } from '@/shared/hooks/useConfirmModal';
import ConfirmModal from '@/shared/components/ui/ConfirmModal';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BarChart3,
  Calendar,
  Grid3x3,
  Settings,
  UserCog,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  X,
  Clock,
  CalendarDays,
  Briefcase,
  FolderKanban,
  GitBranch,
  UserCircle,
  Search,
  Star,
  TrendingUp,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle,
  Bell,
  Play,
  ListTodo,
  AlarmCheck,
  Plane,
  TableProperties,
  Pin,
  ChevronDown,
  ChevronUp,
  Palette,
} from 'lucide-react';

// ─── Panel content definition per role ─────────────────────────────────────
const getPanelContent = (role, signals) => {
  const allPanels = {
    admin: {
      dashboard: [
        { group: 'OVERVIEW', items: [
          { path: '/dashboard',  icon: LayoutDashboard, label: 'Operations Dashboard' },
          { path: '/feature-matrix', icon: TableProperties, label: 'Feature Matrix' },
        ]},
        { group: 'MANAGE', items: [
          { path: '/users',    icon: UserCog, label: 'Manage People' },
          { path: '/settings', icon: Settings, label: 'System Settings' },
        ]},
      ],
      tasks: [
        { group: 'QUICK ACTIONS', items: [
          { path: '/self-attendance?tab=checkin', icon: AlarmCheck, label: 'Check In / Out' },
          { path: '/tasks',                       icon: Play,       label: 'Create Task' },
          { path: '/hr/leaves',                   icon: Plane,      label: 'Request Leave' },
        ]},
        { group: 'APPROVALS', items: [
          { path: '/hr/leaves?status=pending', icon: CheckCircle, label: 'Approve Requests', badge: signals.pendingApprovals },
        ]},
      ],
      projects: [
        { group: 'TIMELINE', items: [
          { path: '/sprints',        icon: Briefcase,  label: 'Sprints' },
          { path: '/projects/gantt', icon: GitBranch,  label: 'Gantt Chart' },
        ]},
        { group: 'CAPACITY', items: [
          { path: '/resources', icon: UserCircle, label: 'Resources' },
        ]},
      ],
      people: [
        { group: 'TEAM', items: [
          { path: '/users',           icon: UserCog,        label: 'Manage People' },
          { path: '/teams',           icon: Users,          label: 'Teams' },
          { path: '/hr/reallocation', icon: ArrowLeftRight, label: 'Task Reallocation' },
        ]},
        { group: 'COMMUNICATION', items: [
          { path: '/hr/email-center', icon: FileText, label: 'Email Center' },
        ]},
      ],
      calendar: [
        { group: 'SCHEDULE', items: [
          { path: '/calendar',    icon: Calendar,     label: 'Calendar' },
          { path: '/hr/calendar', icon: CalendarDays, label: 'HR Calendar' },
        ]},
      ],
      reports: [
        { group: 'ANALYTICS', items: [
          { path: '/analytics',  icon: TrendingUp, label: 'Business Analytics' },
          { path: '/hr/reallocation', icon: BarChart3, label: 'HR Reports' },
        ]},
        { group: 'LOGS', items: [
          { path: '/audit-log', icon: FileText, label: 'Audit Logs' },
          { path: '/changelog', icon: FileText, label: 'Change Log' },
        ]},
      ],
    },
    hr: {
      dashboard: [
        { group: 'OVERVIEW', items: [
          { path: '/hr/dashboard', icon: LayoutDashboard, label: 'People Overview' },
        ]},
      ],
      tasks: [
        { group: 'QUICK ACTIONS', items: [
          { path: '/self-attendance?tab=checkin', icon: AlarmCheck, label: 'Check In / Out' },
          { path: '/tasks',                       icon: Play,       label: 'Create Task' },
          { path: '/hr/leaves',                   icon: Plane,      label: 'Request Leave' },
        ]},
        { group: 'APPROVALS', items: [
          { path: '/hr/leaves?status=pending', icon: CheckCircle, label: 'Approve Requests', badge: signals.pendingLeaveReviews },
        ]},
      ],
      projects: [
        { group: 'TIMELINE', items: [
          { path: '/sprints',        icon: Briefcase, label: 'Sprints' },
          { path: '/projects/gantt', icon: GitBranch, label: 'Gantt Chart' },
        ]},
      ],
      people: [
        { group: 'MANAGE', items: [
          { path: '/hr/attendance',            icon: Clock,        label: 'Manage Attendance' },
          { path: '/hr/leaves',                icon: CalendarDays, label: 'Manage Leaves' },
        ]},
        { group: 'TEAM', items: [
          { path: '/teams',           icon: Users,          label: 'Teams' },
          { path: '/hr/reallocation', icon: ArrowLeftRight, label: 'Task Reallocation' },
          { path: '/hr/email-center', icon: FileText,       label: 'Email Center' },
        ]},
      ],
      calendar: [
        { group: 'SCHEDULE', items: [
          { path: '/hr/calendar', icon: CalendarDays, label: 'HR Calendar' },
        ]},
      ],
      reports: [
        { group: 'ANALYTICS', items: [
          { path: '/analytics',       icon: BarChart3,      label: 'HR Analytics' },
          { path: '/hr/reallocation', icon: ArrowLeftRight, label: 'Task Reallocation' },
        ]},
      ],
    },
    team_lead: {
      dashboard: [
        { group: 'OVERVIEW', items: [
          { path: '/projects', icon: FolderKanban, label: 'Project Dashboard' },
          { path: '/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
        ]},
      ],
      tasks: [
        { group: 'MY WORK', items: [
          { path: '/tasks',                       icon: Users,      label: 'Team Tasks' },
          { path: '/tasks',                       icon: Play,       label: 'Create Task' },
          { path: '/self-attendance?tab=checkin', icon: AlarmCheck, label: 'Check In / Out' },
        ]},
        { group: 'APPROVALS', items: [
          { path: '/hr/leaves?status=pending', icon: CheckCircle, label: 'Approve Requests', badge: signals.pendingApprovals },
        ]},
      ],
      projects: [
        { group: 'PROJECTS', items: [
          { path: '/my-projects', icon: Briefcase, label: 'My Projects' },
          { path: '/sprints',     icon: Briefcase, label: 'Sprints' },
        ]},
        { group: 'TIMELINE', items: [
          { path: '/projects/gantt', icon: GitBranch,  label: 'Gantt Chart' },
          { path: '/resources',      icon: UserCircle, label: 'Resources' },
        ]},
      ],
      calendar: [
        { group: 'SCHEDULE', items: [
          { path: '/calendar',     icon: Calendar,     label: 'Calendar' },
          { path: '/hr/calendar',  icon: CalendarDays, label: 'Team Schedule' },
        ]},
      ],
      reports: [
        { group: 'ANALYTICS', items: [
          { path: '/analytics',       icon: BarChart3,      label: 'Reports' },
          { path: '/hr/reallocation', icon: ArrowLeftRight, label: 'Task Reallocation' },
        ]},
      ],
    },
    member: {
      dashboard: [
        { group: 'MY WORK', items: [
          { path: '/tasks',  icon: ListTodo, label: 'My Tasks' },
          { path: '/kanban', icon: Grid3x3,  label: 'Work Board' },
        ]},
      ],
      tasks: [
        { group: 'MY WORK', items: [
          { path: '/tasks',                        icon: ListTodo,   label: 'My Tasks' },
          { path: '/kanban',                       icon: Grid3x3,    label: 'Work Board' },
          { path: '/tasks',                        icon: Play,       label: 'Create Task' },
          { path: '/self-attendance?tab=checkin',  icon: AlarmCheck, label: 'Check In / Out' },
          { path: '/self-attendance?tab=schedule', icon: Clock,      label: 'My Schedule' },
        ]},
        { group: 'LEAVE', items: [
          { path: '/hr/leaves',                  icon: Plane,        label: 'Request Leave' },
          { path: '/self-attendance?tab=leaves', icon: CalendarDays, label: 'Leave Status' },
        ]},
      ],
      projects: [
        { group: 'MY PROJECTS', items: [
          { path: '/my-projects', icon: Briefcase, label: 'My Projects' },
        ]},
      ],
      calendar: [
        { group: 'SCHEDULE', items: [
          { path: '/calendar',                     icon: Calendar,     label: 'Calendar' },
          { path: '/self-attendance?tab=schedule', icon: Clock,        label: 'My Schedule' },
        ]},
      ],
    },
  };
  return allPanels[role] || allPanels.member;
};

// ─── Rail icon definitions ──────────────────────────────────────────────────
const RAIL_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard',  roles: null },
  { id: 'tasks',     icon: CheckSquare,     label: 'Tasks',      roles: null },
  { id: 'projects',  icon: FolderKanban,    label: 'Projects',   roles: null },
  { id: 'people',    icon: Users,           label: 'People',     roles: ['admin', 'hr'] },
  { id: 'calendar',  icon: Calendar,        label: 'Calendar',   roles: null },
  { id: 'reports',   icon: BarChart3,       label: 'Reports',    roles: ['admin', 'hr', 'team_lead'] },
];

// ─── Panel accent colors per section ───────────────────────────────────────
// -- Panel accent colours (warm-paper palette) ------------------------------
const PANEL_ACCENTS = {
  dashboard: { color: '#D4905A', bg: 'rgba(196,113,58,0.14)',  text: '#D4905A' },
  tasks:     { color: '#6AA06A', bg: 'rgba(90,138,90,0.14)',   text: '#6AA06A' },
  projects:  { color: '#9A8ACC', bg: 'rgba(122,106,170,0.14)', text: '#9A8ACC' },
  people:    { color: '#C49A3A', bg: 'rgba(196,154,58,0.14)',  text: '#C49A3A' },
  calendar:  { color: '#D4905A', bg: 'rgba(196,113,58,0.14)',  text: '#D4905A' },
  reports:   { color: '#C49A3A', bg: 'rgba(196,154,58,0.14)',  text: '#C49A3A' },
  signals:   { color: '#C49A3A', bg: 'rgba(196,154,58,0.14)',  text: '#C49A3A' },
};

// ─── Sidebar Component ──────────────────────────────────────────────────────
const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, currentColorScheme } = useTheme();
  const { isMobileOpen, isMobile, closeMobileSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const confirmModal = useConfirmModal();

  // ─── Signals state ─────────────────────────────────────────────────────────
  const [signals, setSignals] = useState({
    pendingApprovals: 0,
    blockedTasks: 0,
    lateCheckIns: 0,
    pendingLeaveReviews: 0,
    taskDueToday: 0,
  });

  // ─── Two-rail state ─────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState(() => {
    return localStorage.getItem('sidebarActivePanel') || 'dashboard';
  });

  const [isPanelPinned, setIsPanelPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPanelPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // On mobile the panel is shown via isMobileOpen from context
  // On desktop the panel is shown when pinned
  const isPanelVisible = isMobile ? isMobileOpen : isPanelPinned;

  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const profilePopoverRef = useRef(null);
  const profileBtnRef    = useRef(null);

  // Search state (inside context panel)
  const [searchQuery, setSearchQuery]   = useState('');
  const [showSearch, setShowSearch]     = useState(false);

  // ─── Sync isCollapsed with panel visibility for layout consumers ────────────
  useEffect(() => {
    const shouldBeCollapsed = !isPanelPinned;
    // Only call toggleCollapse if it would change the value
    // isCollapsed from context is the source of truth for layout width
    if (shouldBeCollapsed !== isCollapsed) {
      toggleCollapse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanelPinned]);

  // ─── Close profile popover on outside click ─────────────────────────────────
  useEffect(() => {
    if (!showProfilePopover) return;
    const handler = (e) => {
      if (
        profilePopoverRef.current && !profilePopoverRef.current.contains(e.target) &&
        profileBtnRef.current   && !profileBtnRef.current.contains(e.target)
      ) {
        setShowProfilePopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfilePopover]);

  // Dummy dropdown state — kept so nothing downstream breaks (unused in new UI)
  const [openDropdowns, setOpenDropdowns] = useState(() => {
    const saved = localStorage.getItem('sidebarDropdowns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sidebar dropdown state:', e);
      }
    }
    return {
      start: true,
      do: true,
      review: true,
      more: false
    };
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const isDark = theme === 'dark';

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const isActive = (path) => {
    if (path.includes('?')) {
      const [pathnameCheck, queryCheck] = path.split('?');
      return location.pathname === pathnameCheck && location.search.includes(queryCheck);
    }
    return location.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) closeMobileSidebar();
  };

  const hasActiveSignals =
    signals.pendingApprovals > 0 || signals.blockedTasks > 0 ||
    signals.lateCheckIns    > 0 || signals.pendingLeaveReviews > 0 || signals.taskDueToday > 0;

  // Visible rail items (role-gated)
  const visibleRailItems = RAIL_ITEMS.filter(
    (ri) => ri.roles === null || ri.roles.includes(user?.role)
  );

  // Get all nav items across all panels for search
  const panelContent = getPanelContent(user?.role, signals);
  const allNavItems  = Object.values(panelContent)
    .flat()
    .flatMap((g) => (Array.isArray(g.items) ? g.items : []));

  const getFilteredItems = () => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allNavItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
    );
  };

  const activatePanelById = (id) => {
    setActivePanel(id);
    if (isMobile) {
      // On mobile opening a panel = opening the mobile drawer
      // (handled by toggleMobileSidebar elsewhere; here we just track which panel)
    } else if (!isPanelPinned) {
      // Not pinned — temporarily show panel; user can pin it
      setIsPanelPinned(true);
      localStorage.setItem('sidebarPanelPinned', 'true');
    }
  };

  const togglePanelPin = () => {
    const next = !isPanelPinned;
    setIsPanelPinned(next);
    localStorage.setItem('sidebarPanelPinned', JSON.stringify(next));
  };

  // ─── Rail icon button ────────────────────────────────────────────────────────
  const RailButton = ({ id, icon: Icon, label, badge, onClick, bottom }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const timerRef = useRef(null);

    const active = activePanel === id && isPanelVisible;

    const handleEnter = () => {
      timerRef.current = setTimeout(() => setTooltipVisible(true), 300);
      setShowTooltip(true);
    };
    const handleLeave = () => {
      clearTimeout(timerRef.current);
      setShowTooltip(false);
      setTooltipVisible(false);
    };

    return (
      <div className="relative flex items-center justify-center">
        <button
          onClick={onClick}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className="relative w-10 h-10 flex items-center justify-center rounded-[10px] transition-all duration-100 active:scale-95 focus-visible:outline-none"
        style={{
          color:      active ? 'var(--sidebar-accent)' : 'var(--sidebar-muted)',
          background: active ? 'var(--sidebar-active)' : 'transparent',
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
        onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
        onMouseOver={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'var(--sidebar-hover)';
            e.currentTarget.style.color = 'var(--sidebar-text)';
          }
        }}
        onMouseOut={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--sidebar-muted)';
          }
        }}
        title=""
      >
        {/* Active left accent bar */}
        <span
          className="absolute left-0 rounded-r-full"
          style={{
            width: '2.5px', top: '5px', bottom: '5px',
            background: 'var(--sidebar-accent)',
            transform: active ? 'scaleY(1)' : 'scaleY(0)',
            transformOrigin: 'center',
            transition: 'transform 100ms var(--spring)',
          }}
        />
        <Icon size={18} />
        {/* Signal dot */}
        {badge > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--sidebar-accent)' }}
          />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`absolute left-full ml-3 z-[200] pointer-events-none px-2.5 py-1.5 rounded-md whitespace-nowrap transition-all duration-150 ${
            tooltipVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
          }`}
          style={{
            background: 'var(--sidebar-active)',
            color: 'var(--sidebar-text)',
            border: '1px solid var(--border-hair)',
            boxShadow: 'var(--shadow-md)',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

  // ─── Panel nav item ──────────────────────────────────────────────────────────
  const PanelNavItem = ({ item }) => {
    const Icon  = item.icon;
    const active = isActive(item.path);
    const badge  = item.badge || 0;

    return (
      <button
        onClick={() => handleNavigation(item.path)}
      className="relative w-full flex items-center gap-2.5 px-3 h-[38px] rounded-lg text-left transition-colors duration-100 focus-visible:outline-none"
      style={{
        background: active ? 'var(--sidebar-active)' : 'transparent',
        color:      active ? 'var(--sidebar-text)'   : 'var(--sidebar-muted)',
      }}
      aria-current={active ? 'page' : undefined}
      onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
      onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
      onMouseOver={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--sidebar-hover)';
          e.currentTarget.style.color = 'var(--sidebar-text)';
        }
      }}
      onMouseOut={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--sidebar-muted)';
        }
      }}
    >
      {/* Active left accent bar */}
      <span
        className="absolute left-0 rounded-r-full"
        style={{
          width: '2.5px', top: '6px', bottom: '6px',
          background: 'var(--sidebar-accent)',
          transform: active ? 'scaleY(1)' : 'scaleY(0)',
          transformOrigin: 'center',
          transition: 'transform 100ms var(--spring)',
        }}
      />
      <Icon
        size={15}
        style={{ color: active ? 'var(--sidebar-accent)' : 'var(--sidebar-muted)', flexShrink: 0 }}
      />
      <span
        className="flex-1 truncate"
        style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 400 }}
      >
        {item.label}
      </span>
      {badge > 0 && (
        <span
          className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full"
          style={{
            background: 'rgba(212,144,90,0.15)',
            color: 'var(--sidebar-accent)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
      </button>
    );
  };

  // ─── Profile popover ─────────────────────────────────────────────────────────
  const ProfilePopover = () => (
    <div
      ref={profilePopoverRef}
      className={`absolute bottom-14 left-2 z-[300] w-[220px] rounded-xl overflow-hidden transition-all duration-150 origin-bottom-left ${
        showProfilePopover ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}
      style={{
        background: 'var(--sidebar-active)',
        border: '1px solid var(--border-hair)',
        boxShadow: 'var(--shadow-xl)',
      }}
    >
      {/* User info */}
      <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-hair)' }}>
        {user?.profile_picture ? (
          <img src={user.profile_picture} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand))' }}
          >
            {getUserInitials(user?.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
            {user?.full_name}
          </p>
          <p className="text-[11px] truncate capitalize" style={{ color: 'var(--sidebar-muted)' }}>
            {user?.role?.replace('_', ' ')}
            {user?.team_id?.name ? ` · ${user.team_id.name}` : ''}
          </p>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1.5">
        {[{ label: 'Settings', icon: Settings, path: '/settings' }, { label: 'Appearance', icon: Palette, path: '/settings?tab=appearance' }].map(({ label, icon: BtnIcon, path }) => (
          <button
            key={path}
            onClick={() => { handleNavigation(path); setShowProfilePopover(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors focus-visible:outline-none"
            style={{ color: 'var(--sidebar-text)', fontFamily: 'var(--font-body)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
            onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
            onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
          >
            <BtnIcon size={15} style={{ color: 'var(--sidebar-muted)' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Divider + logout */}
      <div className="border-t py-1.5" style={{ borderColor: 'var(--border-hair)' }}>
        <button
          onClick={async () => {
            setShowProfilePopover(false);
            const confirmed = await confirmModal.show({
              title: 'Logout',
              message: 'Are you sure you want to logout? You will need to sign in again to access your account.',
              confirmText: 'Logout',
              cancelText: 'Stay Logged In',
              variant: 'logout',
            });
            if (confirmed) { logout(); navigate('/login'); }
          }}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors focus-visible:outline-none"
          style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger-dim)'; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
          onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
          onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  );

  // ─── Signals panel content ───────────────────────────────────────────────────
  const SignalsPanel = () => (
    <div className="flex-1 overflow-y-auto py-2">
      <div className="flex items-center justify-between px-4 py-2 mb-1">
        <span
          className="uppercase"
          style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--sidebar-muted)' }}
        >Live Signals</span>
        <button
          className="text-[11px] font-medium hover:underline focus-visible:outline-none"
          style={{ color: 'var(--sidebar-accent)', fontFamily: 'var(--font-body)' }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
          onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
        >
          Mark all read
        </button>
      </div>

      {!hasActiveSignals && (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--sidebar-text)', fontFamily: 'var(--font-body)' }}>
            Everything is on track
          </span>
        </div>
      )}

      {[
        { key: 'pendingApprovals',    dotColor: 'var(--warning)',  label: `${signals.pendingApprovals} Approvals pending`,    path: '/hr/leaves?status=pending' },
        { key: 'blockedTasks',        dotColor: 'var(--danger)',   label: `${signals.blockedTasks} Blocked tasks`,             path: '/tasks?filter=blocked' },
        { key: 'lateCheckIns',        dotColor: 'var(--brand)',    label: `${signals.lateCheckIns} Late check-ins`,            path: '/hr/attendance?filter=late' },
        { key: 'pendingLeaveReviews', dotColor: 'var(--ai-color)', label: `${signals.pendingLeaveReviews} Leave reviews`,       path: '/hr/leaves?status=pending' },
        { key: 'taskDueToday',        dotColor: 'var(--success)',  label: `${signals.taskDueToday} Tasks due today`,           path: '/tasks?filter=due-today' },
      ].filter(s => signals[s.key] > 0).map(s => (
        <button
          key={s.key}
          onClick={() => handleNavigation(s.path)}
          className="w-full flex items-center gap-3 px-4 h-10 text-left transition-colors focus-visible:outline-none"
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
          onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
          onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
        >
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dotColor }} />
          <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--sidebar-text)', fontFamily: 'var(--font-body)' }}>
            {s.label}
          </span>
          <ChevronRight size={13} style={{ color: 'var(--sidebar-muted)' }} />
        </button>
      ))}
    </div>
  );

  // ─── Context panel groups ────────────────────────────────────────────────────
  const PanelGroupList = ({ groups }) => (
    <div className="flex-1 overflow-y-auto py-2">
      {groups.map((group) => (
        <div key={group.group} className="mb-1">
          <div
          className="px-3 mt-3 mb-1 uppercase"
          style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--sidebar-muted)' }}
          >
            {group.group}
          </div>
          <div className="space-y-0.5 px-2">
            {group.items.map((item) => (
              <PanelNavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  const accent = PANEL_ACCENTS[activePanel] || PANEL_ACCENTS.dashboard;
  const activeRailItem = RAIL_ITEMS.find((r) => r.id === activePanel);
  const ActiveRailIcon = activeRailItem?.icon || LayoutDashboard;

  const currentPanelGroups = activePanel === 'signals'
    ? null
    : (panelContent[activePanel] || []);

  return (
    <>
      {/* Skip nav target */}
      <div id="main-content" style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden' }} aria-hidden />

      {/* Mobile overlay backdrop */}
      {isMobile && isMobileOpen && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeMobileSidebar} />
      )}

      {/* Two-rail wrapper */}
      <aside
        className={`flex h-screen shrink-0 ${
          isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'
        } ${
          isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        } transition-transform duration-200 ease-out`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* ══════ ICON RAIL ══════ */}
        <div
          className="w-12 flex flex-col items-center shrink-0 h-full z-10 border-r"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 120px), var(--sidebar-bg)',
            borderColor: 'var(--border-hair)',
          }}
        >
          {/* Logo */}
          <div className="w-full flex items-center justify-center py-3.5">
            <button
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 focus-visible:outline-none"
              style={{
                background: 'linear-gradient(135deg, var(--brand-light), var(--brand))',
                boxShadow: '0 2px 10px rgba(196,113,58,0.35)',
              }}
              onClick={() => handleNavigation('/')}
              title="AetherTrack � go home"
              aria-label="Go to homepage"
              onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(196,113,58,0.5)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(196,113,58,0.35)'; e.currentTarget.style.transform = ''; }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
              onBlur={(e)  => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(196,113,58,0.35)'; }}
            >
              <img src="/logo.png" alt="AetherTrack" className="w-5 h-5 object-contain" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-7 h-px mb-2" style={{ background: 'var(--border-mid)' }} />

          {/* Nav icons */}
          <nav className="flex flex-col items-center gap-0.5 w-full px-1">
            {visibleRailItems.map((ri) => (
              <RailButton
                key={ri.id}
                id={ri.id}
                icon={ri.icon}
                label={ri.label}
                badge={ri.id === 'signals' ? (hasActiveSignals ? 1 : 0) : 0}
                onClick={() => {
                  if (activePanel === ri.id && isPanelPinned && !isMobile) {
                    togglePanelPin();
                  } else {
                    activatePanelById(ri.id);
                    localStorage.setItem('sidebarActivePanel', ri.id);
                  }
                }}
              />
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom divider */}
          <div className="w-7 h-px mb-1" style={{ background: 'var(--border-mid)' }} />

          {/* Bell / Signals + avatar */}
          <div className="w-full flex flex-col items-center gap-1 px-1 pb-3">
            <RailButton
              id="signals"
              icon={Bell}
              label="Signals"
              badge={hasActiveSignals ? 1 : 0}
              onClick={() => {
                activatePanelById('signals');
                localStorage.setItem('sidebarActivePanel', 'signals');
              }}
            />

            {/* User avatar */}
            <div className="relative">
              <button
                ref={profileBtnRef}
                onClick={() => setShowProfilePopover((v) => !v)}
                className="w-8 h-8 rounded-full overflow-hidden ring-1 transition-all duration-150 flex items-center justify-center focus-visible:outline-none"
                style={{ background: 'var(--sidebar-active)', ringColor: 'var(--border-hair)' }}
                title="Profile"
                aria-label="Profile menu"
                aria-haspopup="true"
                aria-expanded={showProfilePopover}
                onMouseOver={(e) => { e.currentTarget.style.outline = '2px solid var(--sidebar-accent)'; e.currentTarget.style.outlineOffset = '2px'; }}
                onMouseOut={(e)  => { e.currentTarget.style.outline = ''; }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
                onBlur={(e)  => { e.currentTarget.style.boxShadow = ''; }}
              >
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="text-[10px] font-bold text-white w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--brand))' }}
                  >
                    {getUserInitials(user?.full_name)}
                  </span>
                )}
              </button>

              {/* Profile popover */}
              <ProfilePopover />
            </div>
          </div>
        </div>

        {/* ══════ CONTEXT PANEL ══════ */}
        <div
          className={`
            flex flex-col h-full overflow-hidden
            border-r transition-all duration-200 ease-out
            ${isPanelVisible ? 'w-60 opacity-100' : 'w-0 opacity-0'}
          `}
        >
          {/* Brand header */}
          <div
            className="h-[52px] flex items-center gap-2 px-4 shrink-0 border-b"
            style={{ borderColor: 'var(--border-hair)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--brand-light), var(--brand))',
                boxShadow: '0 2px 8px rgba(196,113,58,0.25)',
              }}
            >
              <img src="/logo.png" alt="AetherTrack" className="w-4 h-4 object-contain" />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '17px',
                fontWeight: 500,
                color: 'var(--sidebar-accent)',
              }}
            >
              AetherTrack
            </span>
            <span
              className="ml-auto px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
              style={{
                background: 'rgba(212,144,90,0.12)',
                color: 'var(--sidebar-accent)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}
            >
              SaaS
            </span>
          </div>

          {/* Panel header */}
          <div
            className="h-[52px] flex items-center justify-between px-4 shrink-0 border-b"
            style={{ borderColor: 'var(--border-hair)' }}
          >
            <div className="flex items-center gap-2">
              <ActiveRailIcon size={15} style={{ color: accent.color }} />
              <span
                className="truncate"
                style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 500, color: accent.color }}
              >
                {activeRailItem?.label || 'Dashboard'}
              </span>
            </div>
            <button
              onClick={togglePanelPin}
              className="p-1 rounded transition-colors focus-visible:outline-none"
              style={{ color: 'var(--sidebar-muted)' }}
              title={isPanelPinned ? 'Collapse panel' : 'Pin panel open'}
              aria-label={isPanelPinned ? 'Collapse panel' : 'Pin panel open'}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--sidebar-text)'; e.currentTarget.style.background = 'var(--sidebar-active)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.color = 'var(--sidebar-muted)'; e.currentTarget.style.background = ''; }}
              onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
              onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
            >
              <ChevronLeft size={15} className={isPanelPinned ? '' : 'rotate-180'} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--sidebar-muted)' }} />
              <input
                type="text"
                placeholder="Search�"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  setShowSearch(true);
                  e.target.style.borderColor = 'var(--sidebar-accent)';
                  e.target.style.boxShadow = 'var(--focus-ring)';
                }}
                onBlur={(e) => {
                  setTimeout(() => setShowSearch(false), 200);
                  e.target.style.borderColor = 'var(--border-hair)';
                  e.target.style.boxShadow = '';
                }}
                className="w-full pl-7 pr-3 py-1.5 rounded-md text-[13px] border transition-colors focus:outline-none"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: 'var(--sidebar-bg)',
                  border: '1px solid var(--border-hair)',
                  color: 'var(--sidebar-text)',
                }}
              />
              {showSearch && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1 py-0.5 rounded border"
                  style={{ color: 'var(--sidebar-muted)', borderColor: 'var(--border-hair)', fontFamily: 'var(--font-mono)' }}
                >
                  ?K
                </span>
              )}
            </div>

            {/* Search results */}
            {showSearch && searchQuery && getFilteredItems().length > 0 && (
              <div
                className="absolute left-14 right-4 mt-0.5 rounded-lg z-50 max-h-56 overflow-y-auto"
                style={{ background: 'var(--sidebar-active)', border: '1px solid var(--border-hair)', boxShadow: 'var(--shadow-lg)' }}
              >
                {getFilteredItems().map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { handleNavigation(item.path); setSearchQuery(''); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none"
                      style={{ color: 'var(--sidebar-text)', fontFamily: 'var(--font-body)' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                      onMouseOut={(e)  => { e.currentTarget.style.background = ''; }}
                      onFocus={(e)     => { e.currentTarget.style.boxShadow = 'var(--focus-ring)'; }}
                      onBlur={(e)      => { e.currentTarget.style.boxShadow = ''; }}
                    >
                      <Icon size={14} style={{ color: 'var(--sidebar-muted)' }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel body */}
          {activePanel === 'signals'
            ? <SignalsPanel />
            : <PanelGroupList groups={currentPanelGroups} />
          }
        </div>
      </aside>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onClose}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />
    </>
  );
};

export default Sidebar;
