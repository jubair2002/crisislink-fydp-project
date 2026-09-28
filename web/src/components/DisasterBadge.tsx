import React from 'react';
import {
  Droplets,
  Wind,
  Flame,
  Mountain,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';

interface SeverityBadgeProps {
  severity?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SeverityBadge({ severity, className = '', size = 'md' }: SeverityBadgeProps) {
  const norm = (severity || 'medium').toLowerCase();

  let bg = 'bg-slate-50 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';
  let label = 'Medium';

  if (norm === 'low') {
    bg = 'bg-amber-50 text-amber-800 border-amber-200/80';
    dot = 'bg-amber-500';
    label = 'Low';
  } else if (norm === 'medium') {
    bg = 'bg-orange-50 text-orange-800 border-orange-200/80';
    dot = 'bg-orange-500';
    label = 'Medium';
  } else if (norm === 'high') {
    bg = 'bg-red-50 text-red-700 border-red-200/80';
    dot = 'bg-red-500';
    label = 'High';
  } else if (norm === 'critical') {
    bg = 'bg-rose-100 text-rose-900 border-rose-300 font-semibold';
    dot = 'bg-rose-600';
    label = 'Critical';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs font-medium',
    lg: 'px-3 py-1 text-xs font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${bg} ${sizeClasses} tracking-tight ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  const norm = (status || 'reported').toLowerCase();

  let bg = 'bg-slate-50 text-slate-700 border-slate-200';
  let label = 'Reported';

  if (norm === 'verified') {
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    label = 'Verified';
  } else if (norm === 'response_in_progress' || norm === 'in_progress') {
    bg = 'bg-blue-50 text-blue-800 border-blue-200';
    label = 'In Progress';
  } else if (norm === 'resolved') {
    bg = 'bg-slate-100 text-slate-600 border-slate-200';
    label = 'Resolved';
  } else if (norm === 'false_report') {
    bg = 'bg-slate-100 text-slate-500 border-slate-200 line-through';
    label = 'False Report';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-md border ${bg} ${sizeClasses} tracking-tight ${className}`}
    >
      {label}
    </span>
  );
}

export function DisasterIcon({
  type,
  className = 'w-4 h-4',
}: {
  type?: string | null;
  className?: string;
}) {
  const norm = (type || '').toLowerCase();
  if (norm.includes('flood')) return <Droplets className={className} />;
  if (norm.includes('cyclone') || norm.includes('storm')) return <Wind className={className} />;
  if (norm.includes('landslide')) return <Mountain className={className} />;
  if (norm.includes('fire')) return <Flame className={className} />;
  if (norm.includes('earthquake')) return <Activity className={className} />;
  return <AlertTriangle className={className} />;
}

export function getDisasterEmoji(type?: string | null): string {
  // Kept for backward compatibility if referenced
  return '';
}
