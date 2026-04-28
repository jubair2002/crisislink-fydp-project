'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';

const initialsFor = (name?: string | null, email?: string | null): string => {
  const source = (name || email || 'A').trim();
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function Topbar({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    if (pending) return;
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        router.replace('/login');
        router.refresh();
        toast.success('Signed out.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to sign out.');
      }
    });
  };

  return (
    <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-surface-border">
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="lg:hidden w-10" />

        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Admin Console</p>
          <p className="text-sm font-semibold truncate">Welcome back, {profile.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-surface-border">
            <div className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center text-xs font-semibold">
              {initialsFor(profile.name, profile.email)}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-ink">{profile.name}</p>
              <p className="text-xs text-ink-muted truncate max-w-[180px]">{profile.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="p-2 rounded-lg text-ink-muted hover:text-brand-danger hover:bg-brand-danger/10 transition disabled:opacity-60"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
