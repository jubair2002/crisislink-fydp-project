import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'secondary' | 'success' | 'warning' | 'danger';
}

const TONE_STYLES: Record<NonNullable<MetricCardProps['tone']>, string> = {
  brand: 'bg-brand/10 text-brand',
  secondary: 'bg-brand-secondary/10 text-brand-secondary',
  success: 'bg-brand-success/10 text-brand-success',
  warning: 'bg-brand-warning/10 text-brand-warning',
  danger: 'bg-brand-danger/10 text-brand-danger',
};

export default function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
}: MetricCardProps) {
  return (
    <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-lg grid place-items-center ${TONE_STYLES[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink truncate">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-muted truncate">{hint}</p>}
      </div>
    </div>
  );
}
