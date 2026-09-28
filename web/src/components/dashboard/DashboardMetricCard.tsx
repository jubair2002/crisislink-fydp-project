import type { LucideIcon } from 'lucide-react';

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'secondary' | 'success' | 'warning' | 'danger';
  badge?: string;
}

const TONE_STYLES: Record<NonNullable<DashboardMetricCardProps['tone']>, string> = {
  brand: 'bg-blue-500/10 text-blue-600',
  secondary: 'bg-cyan-500/10 text-cyan-600',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  danger: 'bg-red-500/10 text-red-600',
};

export default function DashboardMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  badge,
}: DashboardMetricCardProps) {
  return (
    <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 flex items-start justify-between gap-4 transition hover:shadow-card-lg">
      <div className="flex items-start gap-4 min-w-0">
        <div className={`w-11 h-11 rounded-lg grid place-items-center shrink-0 ${TONE_STYLES[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-muted truncate">{hint}</p>}
        </div>
      </div>
      {badge && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}
