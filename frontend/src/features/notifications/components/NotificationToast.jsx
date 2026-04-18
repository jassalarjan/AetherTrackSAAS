import '@/features/notifications/notifications.css';

const TOAST_TYPE_STYLE = {
  success: {
    accent: 'var(--aether-notif-success)',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    accent: 'var(--aether-notif-error)',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  warning: {
    accent: 'var(--aether-notif-warning)',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <path d="M10.4 4.3L2.8 17.2C2.2 18.3 3 19.7 4.2 19.7H19.8C21 19.7 21.8 18.3 21.2 17.2L13.6 4.3C13 3.2 11 3.2 10.4 4.3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
  info: {
    accent: 'var(--aether-notif-info)',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 10V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="1" fill="currentColor" />
      </svg>
    ),
  },
};

export function NotificationToast({ toast, onDismiss, onAction }) {
  const typeStyle = TOAST_TYPE_STYLE[toast.type] || TOAST_TYPE_STYLE.info;

  return (
    <article
      role="status"
      aria-live="polite"
      className={[
        'pointer-events-auto overflow-hidden rounded-xl border-l-4 shadow-lg',
        'border border-[var(--aether-notif-border)] bg-[var(--aether-notif-surface-raised)]',
        toast.isExiting ? 'aether-toast-exit' : 'aether-toast-enter',
      ].join(' ')}
      style={{
        borderLeftColor: typeStyle.accent,
        fontFamily: 'var(--aether-notif-font)',
      }}
    >
      <div className="flex items-start gap-3 px-3 py-3">
        <span className="mt-0.5 shrink-0" style={{ color: typeStyle.accent }}>
          {typeStyle.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--aether-notif-text)]">{toast.title}</p>
          <p className="mt-1 text-sm leading-snug text-[var(--aether-notif-text-muted)]">{toast.message}</p>

          {toast.action?.label ? (
            <button
              type="button"
              onClick={() => onAction(toast)}
              className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--aether-notif-primary)',
                fontFamily: 'var(--aether-notif-font)',
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.toastId)}
          className="rounded p-1 text-[var(--aether-notif-text-muted)] transition-colors hover:bg-black/5 hover:text-[var(--aether-notif-text)]"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {!toast.isExiting ? (
        <div className="h-1 w-full bg-black/5">
          <div className="aether-toast-progress h-full" style={{ backgroundColor: typeStyle.accent }} />
        </div>
      ) : null}
    </article>
  );
}

export default NotificationToast;
