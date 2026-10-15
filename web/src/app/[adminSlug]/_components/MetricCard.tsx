import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'secondary' | 'success' | 'warning' | 'danger';
}

const TONE_STYLES: Record<NonNullable<MetricCardProps['tone']>, string> = {
  brand: 'text-brand',
  secondary: 'text-brand-secondary',
  success: 'text-brand-success',
  warning: 'text-brand-warning',
  danger: 'text-brand-danger',
};

export default function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
}: MetricCardProps) {
  return (
    <div className="flex min-h-36 items-start justify-between gap-4 rounded-lg border border-surface-border bg-surface p-5 transition-colors hover:border-slate-300">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <p className="mt-3 truncate text-3xl font-semibold tracking-tight text-ink">{value}</p>
        {hint && <p className="mt-2 truncate text-xs text-ink-muted">{hint}</p>}
      </div>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONE_STYLES[tone]}`} aria-hidden="true" />
    </div>
  );
}
