import React from 'react';
import { MessageCircleIcon, ClockIcon } from 'lucide-react';

const LatestCommentPreview = ({ comment, size = 'md', maxLength = 60 }) => {
  if (!comment) return null;

  const sizeStyles = {
    sm: 'text-[9px] p-1.5 gap-1',
    md: 'text-[10px] p-2 gap-1.5',
    lg: 'text-xs p-2.5 gap-2'
  };

  const iconSizes = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4'
  };

  const avatarSizes = {
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-7'
  };

  const truncateText = (text, length) => {
    if (!text) return '';
    return text.length > length ? text.slice(0, length) + '...' : text;
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div
      className={`flex items-start bg-gray-50 border border-gray-200 rounded-lg ${sizeStyles[size]} hover:bg-gray-100 transition-colors`}
      title={`${comment.author_id?.full_name || 'Someone'}: ${comment.content}`}
    >
      <MessageCircleIcon className={`${iconSizes[size]} text-gray-400 flex-shrink-0 mt-0.5`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`${avatarSizes[size]} rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-[9px] font-bold">
              {getInitials(comment.author_id?.full_name)}
            </span>
          </div>
          <span className="font-semibold text-gray-700 truncate">
            {comment.author_id?.full_name || 'Unknown'}
          </span>
          <span className="flex items-center gap-0.5 text-gray-400 ml-auto flex-shrink-0">
            <ClockIcon className="size-2.5" />
            <span className="text-[9px]">{getRelativeTime(comment.created_at)}</span>
          </span>
        </div>
        <p className="text-gray-600 leading-snug truncate">
          {truncateText(comment.content, maxLength)}
        </p>
      </div>
    </div>
  );
};

export default LatestCommentPreview;
