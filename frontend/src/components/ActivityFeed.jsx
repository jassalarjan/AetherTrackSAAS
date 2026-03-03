import React from 'react';
import Avatar from './Avatar';

/**
 * Activity Feed Component
 * Displays real-time activity updates with avatars and timestamps
 * Matches the warm paper design system from ui_inspire.html
 * 
 * @param {array} activities - Array of activity items: 
 *   [{ 
 *     id, 
 *     user: { name, avatar, initials, color }, 
 *     action: string (HTML allowed), 
 *     timestamp: string,
 *     isLive: boolean 
 *   }]
 * @param {number} maxItems - Maximum items to display (default: 10)
 */
const ActivityFeed = ({ activities = [], maxItems = 10, className = '' }) => {
  const displayedActivities = activities.slice(0, maxItems);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hr ago';
    if (diffHours < 24) return `${diffHours} hr ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return activityTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      role="log" 
      aria-live="polite" 
      aria-label="Activity feed"
      className={className}
    >
      {displayedActivities.map((activity) => (
        <div key={activity.id} className="feed-item">
          <div 
            className={`feed-av ${activity.isLive ? 'feed-live' : ''}`}
            style={{ 
              background: activity.user?.color || 'var(--brand)',
            }}
            title={activity.user?.name}
          >
            {activity.user?.initials || activity.user?.name?.substring(0, 2).toUpperCase() || '??'}
          </div>
          <div>
            <div 
              className="feed-text"
              dangerouslySetInnerHTML={{ __html: activity.action }}
            />
            <div className="feed-time">
              {formatTimestamp(activity.timestamp)}
            </div>
          </div>
        </div>
      ))}
      
      {displayedActivities.length === 0 && (
        <div className="feed-item">
          <div className="feed-av" style={{ background: 'var(--bg-surface)' }}>
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          </div>
          <div>
            <div className="feed-text" style={{ color: 'var(--text-muted)' }}>
              No recent activity
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
