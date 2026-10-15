import React from 'react';
import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm hover:shadow"
        >
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm hover:shadow"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
