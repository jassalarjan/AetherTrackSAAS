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
 * Main TaskCard Component
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
  const [isHovered, setIsHovered] = useState(false);
  
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
  } = task;

  const taskId = _id || id;
  const normalizedDueDate = dueDate || due_date;
  const normalizedAssignees = assignees.length > 0 ? assignees : (assigned_to || []);
  const normalizedProject = project || project_id;
  
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  
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
        'task-card group relative bg-[var(--bg-canvas)] rounded-lg',
        'border border-[var(--border-hair)]',
        'shadow-[var(--shadow-sm)]',
        'hover:shadow-[var(--shadow-md)] hover:border-[var(--border-soft)]',
        'transition-all duration-[var(--base)]',
        'cursor-pointer',
        isDragging && 'opacity-50 scale-[0.98]',
        className
      )}
      style={{
        '--tw-shadow-color': 'var(--shadow-color)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      draggable={draggable}
      role="article"
      aria-label={`Task: ${title}`}
    >
      {/* Priority pip - 3px left border */}
      <div 
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ backgroundColor: priorityColor }}
        aria-hidden="true"
      />
      
      <div className="p-3 pl-5">
        {/* Header row: Project label + Priority */}
        <div className="flex items-center justify-between mb-2">
          {normalizedProject && (
            <span className="text-xs font-medium text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-base)]">
              {normalizedProject.name || normalizedProject}
            </span>
          )}
          <span className="text-xs font-medium capitalize px-2 py-0.5 rounded" style={{ color: priorityColor, backgroundColor: `${priorityColor}15` }}>
            {priority}
          </span>
        </div>
        
        {/* Title - 2 lines max, truncate */}
        <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-2">
          {title}
        </h3>
        
        {/* Description preview if exists */}
        {description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-3">
            {description}
          </p>
        )}
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-[var(--text-muted)]">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Footer row: Avatar stack + Due chip + Progress ring */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex-1">
            {normalizedAssignees.length > 0 ? (
              <AvatarStack users={normalizedAssignees} max={3} size={24} />
            ) : (
              <span className="text-xs text-[var(--text-muted)]">Unassigned</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {normalizedDueDate && (
              <DueChip dueDate={normalizedDueDate} />
            )}
            <ProgressRing 
              progress={progress} 
              size={28} 
              strokeWidth={3}
              status={status}
            />
          </div>
        </div>
        
        {/* Quick actions - fade in on hover */}
        <QuickActions 
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          className="absolute top-2 right-2"
        />
      </div>
    </div>
  );
};

export default TaskCard;
