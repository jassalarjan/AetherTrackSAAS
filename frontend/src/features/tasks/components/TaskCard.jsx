/**
 * AetherTrack 2030 TaskCard Component
 * Reference: System_UI_Shift.md Section 4.1 - TaskCard
 * 
 * Features:
 * - Priority pip: 3px left border, color-coded
 * - Progress ring replaces static status badge
 * - Due chip: green → yellow → red as deadline nears
 * - Hover: elevation lift + quick-action icons fade in
 * - Avatar stack
 * - Project label
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';

/**
 * Priority colors
 */
const PRIORITY_COLORS = {
  low: 'var(--success)',
  medium: 'var(--warning)', 
  high: 'var(--brand)',
  urgent: 'var(--danger)',
};

/**
 * Status colors for progress ring
 */
const STATUS_COLORS = {
  todo: 'var(--text-muted)',
  in_progress: 'var(--brand)',
  review: 'var(--ai-color)',
  done: 'var(--success)',
};

/**
 * Due date color logic
 */
const getDueChipStyle = (dueDate) => {
  if (!dueDate) return { bg: 'var(--bg-base)', text: 'var(--text-muted)' };
  
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { bg: 'var(--danger-dim)', text: 'var(--danger)' };
  } else if (diffDays <= 1) {
    return { bg: 'var(--warning-dim)', text: 'var(--warning)' };
  } else if (diffDays <= 3) {
    return { bg: 'var(--warning-dim)', text: 'var(--warning)' };
  }
  return { bg: 'var(--success-dim)', text: 'var(--success)' };
};

/**
 * Progress Ring Component
 */
const ProgressRing = ({ progress = 0, size = 24, strokeWidth = 3, status = 'todo' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const color = STATUS_COLORS[status] || STATUS_COLORS.todo;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-base)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <span 
        className="absolute text-[8px] font-medium"
        style={{ color }}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
};

/**
 * Avatar Stack Component
 */
const AvatarStack = ({ users = [], max = 3, size = 24 }) => {
  const visible = users.slice(0, max);
  const remaining = users.length - max;
  
  return (
    <div className="flex -space-x-2">
      {visible.map((user, index) => (
        <div
          key={user._id || user.id || index}
          className="relative rounded-full border-2 border-[var(--bg-canvas)] overflow-hidden"
          style={{ width: size, height: size }}
          title={user.full_name || user.name}
        >
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.full_name || user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center text-[10px] font-medium text-white"
              style={{ backgroundColor: user.color || 'var(--brand)' }}
            >
              {(user.full_name || user.name)?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div 
          className="rounded-full border-2 border-[var(--bg-canvas)] bg-[var(--bg-surface)] flex items-center justify-center text-[10px] font-medium"
          style={{ width: size, height: size }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

/**
 * Due Chip Component
 */
const DueChip = ({ dueDate, className = '' }) => {
  const { bg, text } = getDueChipStyle(dueDate);
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {formatDate(dueDate)}
    </span>
  );
};

/**
 * Quick Actions Component
 */
const QuickActions = ({ onEdit, onDelete, onMove, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}>
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-md hover:bg-[var(--bg-base)] transition-colors"
          aria-label="Edit task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {onMove && (
        <button
          onClick={(e) => { e.stopPropagation(); onMove(); }}
          className="p-1.5 rounded-md hover:bg-[var(--bg-base)] transition-colors"
          aria-label="Move task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-md hover:bg-[var(--danger-dim)] text-[var(--danger)] transition-colors"
          aria-label="Delete task"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Mobile-optimized TaskCard with advanced display features
 */
export const TaskCard = ({
  task,
  onClick,
  onEdit,
  onDelete,
  onMove,
  draggable = false,
  isDragging = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    _id,
    id,
    title,
    description,
    priority = 'medium',
    status = 'todo',
    progress = 0,
    dueDate,
    due_date,
    assignees = [],
    assigned_to,
    project,
    project_id,
    tags = [],
    created_at,
  } = task;

  const taskId = _id || id;
  const normalizedDueDate = dueDate || due_date;
  const normalizedAssignees = assignees.length > 0 ? assignees : (assigned_to || []);
  const normalizedProject = project || project_id;
  
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  
  // Calculate due date status
  const calculateDueStatus = () => {
    if (!normalizedDueDate) return { label: 'No date', icon: '📋', color: 'var(--text-muted)' };
    const d = new Date(normalizedDueDate);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, icon: '⚠️', color: 'var(--danger)' };
    } else if (diffDays === 0) {
      return { label: 'Due today', icon: '🔴', color: 'var(--warning)' };
    } else if (diffDays === 1) {
      return { label: 'Due tomorrow', icon: '🟡', color: 'var(--warning)' };
    } else if (diffDays <= 3) {
      return { label: `${diffDays}d left`, icon: '🟡', color: 'var(--warning)' };
    }
    return { label: `${diffDays}d left`, icon: '✅', color: 'var(--success)' };
  };

  const dueStatus = calculateDueStatus();

  // Status configuration
  const statusConfig = {
    todo: { label: 'To Do', icon: '📋', color: '#6B7280', bg: '#F3F4F6' },
    in_progress: { label: 'In Progress', icon: '⚡', color: 'var(--brand)', bg: 'var(--brand)12' },
    review: { label: 'Review', icon: '👀', color: '#F59E0B', bg: '#FEF3C708' },
    done: { label: 'Done', icon: '✅', color: '#10B981', bg: '#ECFDF508' },
    archived: { label: 'Archived', icon: '📦', color: '#8B5CF6', bg: '#F3E8FF08' },
  };

  const currentStatus = statusConfig[status] || statusConfig.todo;
  
  const handleClick = () => {
    if (onClick) {
      onClick(task);
    } else if (taskId) {
      navigate(`/tasks/${taskId}`);
    }
  };
  
  return (
    <div
      className={cn(
        'task-card-advanced relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-[var(--bg-raised)] to-[var(--bg-raised)]' ,
        'border border-[var(--border-soft)]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
        'active:shadow-lg active:scale-[0.98]',
        'transition-all duration-200 ease-out',
        'cursor-pointer',
        'flex flex-col',
        'group',
        isDragging && 'opacity-50 scale-[0.95]',
        className
      )}
      onClick={handleClick}
      draggable={draggable}
      role="article"
      aria-label={`Task: ${title}`}
    >
      {/* Animated gradient border on top */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-active:opacity-100 transition-opacity"
        style={{
          backgroundImage: `linear-gradient(90deg, ${priorityColor}, ${priorityColor}80)`,
        }}
      />

      {/* Priority indicator - subtle left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ease-out"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Advanced card content */}
      <div className="flex flex-col p-3 pl-4 gap-2.5 flex-1">

        {/* Row 1: Status badge + Priority pill + Quick indicator */}
        <div className="flex items-center justify-between gap-2">
          {/* Status with emoji */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
            style={{ backgroundColor: currentStatus.bg, color: currentStatus.color }}
          >
            <span>{currentStatus.icon}</span>
            <span className="truncate">{currentStatus.label}</span>
          </div>

          {/* Priority badge - compact */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110"
            style={{
              backgroundColor: `${priorityColor}20`,
              color: priorityColor,
              border: `1px solid ${priorityColor}40`,
            }}
            title={`${priority} priority`}
          >
            {priority === 'urgent' && '🔴'}
            {priority === 'high' && '🟠'}
            {priority === 'medium' && '🟡'}
            {priority === 'low' && '🔵'}
          </div>
        </div>

        {/* Row 2: Title - enhanced typography */}
        <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-tight">
          {title}
        </h3>

        {/* Row 3: Description or project info */}
        {description ? (
          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 leading-tight italic opacity-75">
            {description}
          </p>
        ) : normalizedProject ? (
          <span className="text-[10px] font-medium text-[var(--brand)] px-1.5 py-0.5 rounded w-fit bg-[var(--brand)]10">
            📌 {normalizedProject.name || normalizedProject}
          </span>
        ) : null}

        {/* Row 4: Progress bar with percentage */}
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-base)] overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor:
                  progress === 100
                    ? 'var(--success)'
                    : progress >= 75
                      ? 'var(--brand)'
                      : progress >= 50
                        ? 'var(--warning)'
                        : 'var(--danger)',
              }}
            />
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-medium text-[var(--text-muted)]">
              {progress === 100 ? '✨ Complete' : `${progress}% done`}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] opacity-60">
              {(() => {
                if (created_at) {
                  const days = Math.floor(
                    (new Date() - new Date(created_at)) / (1000 * 60 * 60 * 24)
                  );
                  if (days === 0) return 'Today';
                  if (days === 1) return 'Yesterday';
                  if (days < 7) return `${days}d ago`;
                  return `${Math.floor(days / 7)}w ago`;
                }
                return '';
              })()}
            </span>
          </div>
        </div>

        {/* Flexible spacer */}
        <div className="flex-1" />

        {/* Row 5: Due date + Assignee indicators */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-hair)] opacity-85">
          {/* Due date with dynamic styling */}
          <div className="flex items-center gap-1.5 text-[10px] font-medium flex-shrink-0">
            <span style={{ color: dueStatus.color }}>{dueStatus.icon}</span>
            <span style={{ color: dueStatus.color }} className="max-w-[100px] truncate">
              {dueStatus.label}
            </span>
          </div>

          {/* Assignee stack */}
          <div className="flex-1 flex justify-end">
            {normalizedAssignees.length > 0 ? (
              <AvatarStack users={normalizedAssignees} max={2} size={18} />
            ) : (
              <span className="text-[9px] text-[var(--text-muted)] italic">Unassigned</span>
            )}
          </div>
        </div>

        {/* Row 6: Tags if exists */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--bg-base)] text-[var(--text-muted)] font-medium"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[9px] text-[var(--text-muted)] font-medium">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Advanced action bar - always visible, touch-optimized */}
      <div className="flex items-stretch gap-0 border-t border-[var(--border-hair)] bg-gradient-to-r from-transparent to-[var(--bg-base)]10">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-bl-lg text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--brand)]10 active:bg-[var(--brand)]15 transition-all"
            aria-label="Edit task"
            title="Edit task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-[8px] font-bold">Edit</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-br-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]10 active:bg-[var(--danger)]15 transition-all border-l border-[var(--border-hair)]"
            aria-label="Delete task"
            title="Delete task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[8px] font-bold">Delete</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
