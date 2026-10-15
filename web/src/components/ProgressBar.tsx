import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'gradient';
}

export default function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  className = '',
  color = 'gradient',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? Math.round((value / max) * 100) : 0));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  const colorClasses = {
    gradient: 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400',
    brand: 'bg-blue-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[color];

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
          <span>Progress</span>
          <span className="text-blue-600 font-bold">{percentage}%</span>
        </div>
      )}
      <div
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses} border border-slate-200/60 shadow-inner`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${heightClasses} ${colorClasses} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
