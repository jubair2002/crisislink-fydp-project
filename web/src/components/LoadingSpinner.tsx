import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center p-6 gap-3 ${className}`}>
      <div
        className={`${sizeClasses} rounded-full border-slate-200 border-t-blue-600 animate-spin`}
      />
      {text && <p className="text-xs sm:text-sm font-medium text-slate-500 animate-pulse">{text}</p>}
    </div>
  );
}
