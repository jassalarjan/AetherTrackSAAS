import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import api from '@/shared/services/axios';
import { PageLoader } from '@/shared/components/ui/Spinner';
import { Bell, Check, CheckCheck, Trash2, Filter, Calendar, User, AlertCircle } from 'lucide-react';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      console.log('Notifications received:', response.data.notifications);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      await api.patch('/notifications/mark-read', { notificationIds });
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-read', {});
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      // For now, just mark as read. You can add a delete endpoint if needed
      await markAsRead([id]);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read_at);
      case 'read':
        return notifications.filter(n => n.read_at);
      default:
        return notifications;
    }
  };

  const getNotificationMessage = (notification) => {
    // If message exists, use it
    if (notification.message) {
      return notification.message;
    }
    
    // Fallback: Generate message from type and payload
    const payload = notification.payload || {};
    switch (notification.type) {
      case 'task_assigned':
        return `You were assigned to task: "${payload.task_title || 'Untitled Task'}"`;
      case 'task_updated':
        return `Task "${payload.task_title || 'Untitled Task'}" was updated`;
      case 'task_completed':
        return `Task "${payload.task_title || 'Untitled Task'}" was completed`;
      case 'task_overdue':
        return `Task "${payload.task_title || 'Untitled Task'}" is overdue`;
      case 'status_changed':
        return `Task status changed from ${payload.old_status || 'unknown'} to ${payload.new_status || 'unknown'}`;
      case 'comment_added':
        return `New comment on task "${payload.task_title || 'Untitled Task'}"`;
      default:
        return 'You have a new notification';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'task_updated':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'task_completed':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'task_overdue':
        return <Calendar className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = getFilteredNotifications();

  if (loading) return <PageLoader variant="dots" label="Loading notifications…" />;

  return (
    <ResponsivePageLayout
      title="Notifications"
      icon={Bell}
      subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
      actions={unreadCount > 0 ? (
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ background: 'var(--brand)' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--brand-light)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--brand)'; }}
        >
          <CheckCheck size={16} />
          Mark All Read
        </button>
      ) : null}
      noPadding
    >
      {/* Filter Tabs — sticky within scroll container */}
      <div
        className="sticky top-0 z-10 flex items-center gap-1 px-6 py-3 border-b"
        style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-soft)' }}
      >
        {['all', 'unread', 'read'].map((f) => {
          const labels = { all: `All (${notifications.length})`, unread: `Unread (${unreadCount})`, read: `Read (${notifications.length - unreadCount})` };
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none"
              style={{
                background: active ? 'var(--brand-dim)' : 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-surface)'; }}
              onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="p-6">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Bell className="w-16 h-16 mb-4" style={{ color: 'var(--border-mid)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {filter === 'all' ? "You'll see notifications here when something happens" : 'Try changing the filter'}
            </p>
          </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className="border rounded-lg p-4 transition-all hover:shadow-md"
                  style={{
                    background: 'var(--bg-raised)',
                    borderColor: notification.read_at ? 'var(--border-soft)' : 'var(--brand)',
                    borderLeftWidth: notification.read_at ? undefined : '3px',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 p-2 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        {formatDate(notification.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!notification.read_at && (
                        <button
                          onClick={() => markAsRead([notification._id])}
                          className="p-2 rounded transition-colors focus-visible:outline-none"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="p-2 rounded transition-colors focus-visible:outline-none"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Task Link if available */}
                  {notification.task_id && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-hair)' }}>
                      <a
                        href={`/tasks`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: 'var(--brand)' }}
                      >
                        View Task →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </ResponsivePageLayout>
  );
};

export default Notifications;
