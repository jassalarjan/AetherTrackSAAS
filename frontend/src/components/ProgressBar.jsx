import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ProgressBar = ({ progress = 0, size = 'md', showPercentage = true, animated = true }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    if (validProgress === 0) return 'bg-gray-400 dark:bg-gray-500';
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
          <span className={`font-semibold ${textStyles[size]} ${isDark ? 'text-[#9da8b9]' : 'text-gray-600'}`}>
            Progress
          </span>
          <span className={`font-bold ${textStyles[size]} ${
            validProgress === 100
              ? 'text-emerald-500'
              : isDark
                ? 'text-[#9da8b9]'
                : 'text-gray-700'
          }`}>
            {validProgress}%
          </span>
        </div>
      )}
      <div className={`w-full rounded-full overflow-hidden ${heightStyles[size]} ${isDark ? 'bg-[#282f39]' : 'bg-gray-200'}`}>
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
