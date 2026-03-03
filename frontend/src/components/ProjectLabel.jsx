import React from 'react';
import { FolderIcon } from 'lucide-react';

const ProjectLabel = ({ project, size = 'md', showIcon = true }) => {
  if (!project) return null;

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

  const statusColors = {
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    planning: 'bg-purple-50 text-purple-700 border-purple-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    on_hold: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  const color = statusColors[project.status] || statusColors.active;

  return (
    <div
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded border ${color} ${sizeStyles[size]} transition-all hover:scale-105`}
      title={`Project: ${project.name} (${project.status || 'active'})`}
    >
      {showIcon && <FolderIcon className={iconSizes[size]} />}
      <span className="truncate max-w-[120px]">{project.name}</span>
    </div>
  );
};

export default ProjectLabel;
