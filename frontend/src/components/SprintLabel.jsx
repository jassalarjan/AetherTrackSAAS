import React from 'react';
import { ZapIcon, CalendarIcon } from 'lucide-react';

const SprintLabel = ({ sprint, size = 'md', showIcon = true, showDates = false }) => {
  if (!sprint) return null;

  const sizeStyles = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    md: 'text-[10px] px-2 py-1 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const iconSizes = {
    sm: 'size-2.5',
    md: 'size-3',
    lg: 'size-3.5'
  };

  // Determine sprint status based on dates
  const getSprintStatus = () => {
    if (!sprint.start_date || !sprint.end_date) return 'active';
    
    const now = new Date();
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'active';
  };

  const status = getSprintStatus();
  
  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    upcoming: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  const color = statusColors[status];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded border ${color} ${sizeStyles[size]} transition-all hover:scale-105`}
      title={`Sprint: ${sprint.name}${sprint.start_date && sprint.end_date ? ` (${formatDate(sprint.start_date)} - ${formatDate(sprint.end_date)})` : ''}`}
    >
      {showIcon && <ZapIcon className={iconSizes[size]} />}
      <span className="truncate max-w-[120px]">{sprint.name}</span>
      {showDates && sprint.start_date && sprint.end_date && (
        <span className="flex items-center gap-0.5 ml-1 opacity-75">
          <CalendarIcon className={iconSizes[size]} />
          <span className="text-[9px]">{formatDate(sprint.end_date)}</span>
        </span>
      )}
    </div>
  );
};

export default SprintLabel;
