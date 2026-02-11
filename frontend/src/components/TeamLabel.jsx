import React from 'react';
import { UsersIcon } from 'lucide-react';

const TeamLabel = ({ team, size = 'md', showIcon = true }) => {
  if (!team) return null;

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

  return (
    <div
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded border bg-indigo-50 text-indigo-700 border-indigo-200 ${sizeStyles[size]} transition-all hover:scale-105`}
      title={`Team: ${team.name}`}
    >
      {showIcon && <UsersIcon className={iconSizes[size]} />}
      <span className="truncate max-w-[120px]">{team.name}</span>
    </div>
  );
};

export default TeamLabel;
