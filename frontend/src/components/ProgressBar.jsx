import React from 'react';

const ProgressBar = ({ progress = 0, size = 'md', showPercentage = true, animated = true }) => {
  const validProgress = Math.min(100, Math.max(0, progress || 0));

  const heightStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const textStyles = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs'
  };

  // Color based on progress
  const getProgressColor = () => {
    if (validProgress === 0) return 'bg-gray-300';
    if (validProgress < 30) return 'bg-red-500';
    if (validProgress < 60) return 'bg-yellow-500';
    if (validProgress < 90) return 'bg-blue-500';
    if (validProgress < 100) return 'bg-green-500';
    return 'bg-emerald-600';
  };

  const progressColor = getProgressColor();

  return (
    <div className="w-full">
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className={`font-semibold text-gray-600 ${textStyles[size]}`}>
            Progress
          </span>
          <span className={`font-bold ${validProgress === 100 ? 'text-emerald-600' : 'text-gray-700'} ${textStyles[size]}`}>
            {validProgress}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightStyles[size]}`}>
        <div
          className={`${progressColor} ${heightStyles[size]} rounded-full transition-all duration-500 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${validProgress}%` }}
          role="progressbar"
          aria-valuenow={validProgress}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
    </div>
  );
};

export default ProgressBar;
