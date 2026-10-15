import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  label,
  className = '',
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <div
        className={`${sizeMap} rounded-full border-slate-200 border-t-blue-600 border-r-cyan-400 animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {label && <p className="text-sm font-medium text-slate-500 animate-pulse">{label}</p>}
    </div>
  );
}
