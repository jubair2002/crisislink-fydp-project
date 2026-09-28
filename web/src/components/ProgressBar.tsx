import React from 'react';

interface ProgressBarProps {
  current: number;
  target: number;
  color?: 'blue' | 'cyan' | 'emerald' | 'amber';
  height?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  current,
  target,
  color = 'blue',
  height = 'md',
  showPercentage = false,
  className = '',
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  const colorClasses = {
    blue: 'bg-blue-600',
    cyan: 'bg-cyan-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
  }[color];

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }[height];

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-1.5">
          <span>Funded</span>
          <span className="font-semibold text-slate-900">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses}`}>
        <div
          className={`${heightClasses} rounded-full transition-all duration-500 ease-out ${colorClasses}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
