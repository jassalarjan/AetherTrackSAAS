import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@/features/notifications/notifications.css';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';

const typeToAccent = {
  success: 'var(--aether-notif-success)',
  error: 'var(--aether-notif-error)',
  warning: 'var(--aether-notif-warning)',
  info: 'var(--aether-notif-info)',
};

const TypeGlyph = ({ type }) => {
  const accent = typeToAccent[type] || typeToAccent.info;

  if (type === 'success') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ color: accent }} aria-hidden="true">
        <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'error') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ color: accent }} aria-hidden="true">
        <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'warning') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ color: accent }} aria-hidden="true">
        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <path d="M10.4 4.3L2.8 17.2C2.2 18.3 3 19.7 4.2 19.7H19.8C21 19.7 21.8 18.3 21.2 17.2L13.6 4.3C13 3.2 11 3.2 10.4 4.3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ color: accent }} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
    </svg>
  );
};

const toRelativeTime = (iso) => {
  const value = new Date(iso).getTime();
  const now = Date.now();
  const delta = Math.max(0, now - value);
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(delta / 3600000);
  const days = Math.floor(delta / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} day ago${days > 1 ? 's' : ''}`;

  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const EmptyIllustration = () => (
  <svg className="h-20 w-20" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <rect x="12" y="26" width="96" height="72" rx="14" fill="var(--aether-notif-surface)" stroke="var(--aether-notif-border)" strokeWidth="2" />
    <path d="M30 54H90" stroke="var(--aether-notif-border)" strokeWidth="3" strokeLinecap="round" />
    <path d="M30 70H68" stroke="var(--aether-notif-border)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="89" cy="70" r="7" fill="var(--aether-notif-secondary)" />
    <path d="M60 20C60 14 65 10 71 10C77 10 82 14 82 20" stroke="var(--aether-notif-sidebar)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export function NotificationBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications();

  const latestNotifications = useMemo(
    () => notifications.slice(0, 50),
    [notifications]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markRead(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--aether-notif-text)] transition-colors hover:bg-black/5"
        aria-label="Open notifications"
        aria-expanded={open}
        aria-controls="aether-notification-drawer"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 10a5 5 0 0 1 10 0v4.4l1.4 2.1c.4.6 0 1.5-.8 1.5H6.4c-.8 0-1.2-.9-.8-1.5L7 14.4V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full px-1.5 py-[1px] text-center text-[10px] font-semibold text-white"
            style={{
              backgroundColor: 'var(--aether-notif-primary)',
              fontFamily: 'var(--aether-notif-font)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      <aside
        id="aether-notification-drawer"
        ref={panelRef}
        className={[
          'aether-notification-drawer fixed bottom-0 right-0 top-[var(--header-h,64px)] z-[1090]',
          'w-full border-l border-[var(--aether-notif-border)] bg-[var(--aether-notif-surface)] shadow-xl sm:w-[24rem]',
          open ? 'open' : '',
        ].join(' ')}
        style={{ fontFamily: 'var(--aether-notif-font)' }}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-[var(--aether-notif-border)] px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--aether-notif-text)]">Notifications</h2>
              <p className="text-xs text-[var(--aether-notif-text-muted)]">{unreadCount} unread</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-md border border-[var(--aether-notif-border)] px-2 py-1 text-xs font-medium text-[var(--aether-notif-text)] transition-colors hover:bg-white/60"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-[var(--aether-notif-text-muted)] hover:bg-black/5"
                aria-label="Close notifications"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {latestNotifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <EmptyIllustration />
                <h3 className="mt-4 text-sm font-semibold text-[var(--aether-notif-text)]">No notifications yet</h3>
                <p className="mt-1 text-xs text-[var(--aether-notif-text-muted)]">Updates from your workspace will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--aether-notif-border)]">
                {latestNotifications.map((notification) => (
                  <li key={notification._id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/60"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-[var(--aether-notif-border)]">
                        {notification.avatar ? (
                          <img src={notification.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <TypeGlyph type={notification.type} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--aether-notif-text)]">{notification.title}</p>
                          {!notification.read ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: 'var(--aether-notif-primary)' }} />
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--aether-notif-text-muted)]">{notification.message}</p>
                        <p className="mt-1 text-xs text-[var(--aether-notif-text-muted)]">{toRelativeTime(notification.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default NotificationBell;
