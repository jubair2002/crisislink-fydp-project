import type { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-ink-muted">{description}</p>
      </header>

      <div className="rounded-xl bg-surface border border-surface-border shadow-card p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand grid place-items-center mx-auto">
          <Icon className="w-6 h-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-ink">Coming soon</p>
        <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
          This module is scaffolded and ready for implementation. Wire it up to the matching
          Supabase tables to ship the full experience.
        </p>
      </div>
    </div>
  );
}
