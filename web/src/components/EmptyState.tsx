import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 bg-white/70 backdrop-blur-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
        {icon || (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {actionText && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs sm:text-sm hover:bg-blue-700 transition shadow-sm"
          >
            {actionText}
          </Link>
        ) : onAction ? (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs sm:text-sm hover:bg-blue-700 transition shadow-sm"
          >
            {actionText}
          </button>
        ) : null
      )}
    </div>
  );
}
