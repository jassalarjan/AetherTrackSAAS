import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { NotificationToast } from '@/features/notifications/components/NotificationToast';

export function NotificationToasts() {
  const navigate = useNavigate();
  const { toasts, dismissToast } = useNotifications();

  const handleAction = (toast) => {
    if (toast.action?.onClick) {
      toast.action.onClick();
      dismissToast(toast.toastId);
      return;
    }

    if (toast.link) {
      navigate(toast.link);
      dismissToast(toast.toastId);
    }
  };

  if (!toasts.length) return null;

  return (
    <section
      className="fixed bottom-4 right-4 z-[1100] flex w-[min(100vw-1rem,24rem)] flex-col gap-2 pointer-events-none sm:bottom-6 sm:right-6"
      aria-label="In-app notifications"
    >
      {toasts.slice(0, 4).map((toast) => (
        <NotificationToast
          key={toast.toastId}
          toast={toast}
          onDismiss={dismissToast}
          onAction={handleAction}
        />
      ))}
    </section>
  );
}

export default NotificationToasts;
