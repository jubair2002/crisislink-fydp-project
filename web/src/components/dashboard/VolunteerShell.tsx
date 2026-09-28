'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  HeartHandshake,
  TrendingUp,
  UserCheck,
  MoreVertical,
  Bell,
  LogOut,
  X,
  ShieldCheck,
  Clock,
  ExternalLink,
  Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'cl-volunteer-sidebar';

interface VolunteerShellProps {
  children: React.ReactNode;
}

const VOLUNTEER_NAV = [
  { href: '/volunteer/dashboard', label: 'Hub Overview', icon: LayoutDashboard },
  { href: '/map', label: 'Incident Field Map', icon: MapPin },
  { href: '/campaigns', label: 'Relief Operations', icon: HeartHandshake },
  { href: '/track', label: 'Supply Tracking', icon: TrendingUp },
  { href: '/volunteer/pending', label: 'Verification Status', icon: Clock },
  { href: '/complete-profile', label: 'Volunteer Profile', icon: UserCheck },
];

const initialsFor = (name?: string | null, email?: string | null): string => {
  const source = (name || email || 'V').trim();
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function VolunteerShell({ children }: VolunteerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | 'suspended'>('pending');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'closed') setDesktopOpen(false);
    } catch {
      /* ignore */
    }
    setHydrated(true);

    if (user?.id) {
      const supabase = createClient();
      supabase
        .from('volunteers')
        .select('verification_status')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.verification_status) {
            setVerificationStatus(data.verification_status);
          }
        });
    }
  }, [user?.id]);

  const toggleSidebar = useCallback(() => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile) {
      setMobileOpen((v) => !v);
      return;
    }
    setDesktopOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'open' : 'closed');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      toast.success('Signed out.');
      await signOut();
    } catch {
      window.location.href = '/login';
    }
  };

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Volunteer';
  const displayEmail = profile?.email || user?.email || '';

  const mainPad = hydrated && !desktopOpen ? 'lg:pl-0' : 'lg:pl-64';

  const NavList = (
    <nav className="px-3 py-4 space-y-1">
      {VOLUNTEER_NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/volunteer/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              active
                ? 'bg-brand text-white shadow-card'
                : 'text-slate-300 hover:text-white hover:bg-sidebar-hover'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1">{item.label}</span>
            {item.href === '/volunteer/pending' && verificationStatus === 'pending' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const Header = (
    <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
      <Link href="/" className="w-9 h-9 rounded-lg bg-emerald-600 grid place-items-center text-white font-bold shrink-0 hover:opacity-90 transition">
        C
      </Link>
      <div className="flex-1 min-w-0">
        <Link href="/" className="text-sm font-semibold text-white truncate block hover:text-emerald-300 transition">
          CrisisLink
        </Link>
        <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3 h-3 shrink-0" /> Volunteer Hub
        </p>
      </div>
    </div>
  );

  const Footer = (
    <div className="px-4 py-4 border-t border-white/5 space-y-2">
      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Field Dispatch
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Emergency response channels open 24/7.
        </p>
      </div>
      <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
        <span>Volunteer Network BD</span>
        <Link href="/" className="hover:text-slate-300 flex items-center gap-0.5">
          Home <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-white flex-col transition-transform duration-200 ease-in-out ${
          desktopOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!desktopOpen}
      >
        {Header}
        <div className="flex-1 overflow-y-auto">{NavList}</div>
        {Footer}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative w-72 max-w-[80vw] bg-sidebar text-white flex flex-col shadow-card-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">{Header}</div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mt-4 mr-3 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-sidebar-hover shrink-0"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{NavList}</div>
            {Footer}
          </aside>
        </div>
      )}

      {/* Main content wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${mainPad}`}>
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-surface-border">
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition shrink-0 cursor-pointer"
                aria-label={desktopOpen || mobileOpen ? 'Hide sidebar' : 'Show sidebar'}
                title={desktopOpen || mobileOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-ink-muted">Volunteer Operations</p>
                <p className="text-sm font-semibold truncate text-ink">Welcome, {displayName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Status Badge */}
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize border ${
                  verificationStatus === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : verificationStatus === 'rejected'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    verificationStatus === 'approved'
                      ? 'bg-emerald-500'
                      : verificationStatus === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                {verificationStatus === 'approved'
                  ? 'Approved Responder'
                  : verificationStatus === 'rejected'
                  ? 'Application Rejected'
                  : 'Pending Review'}
              </span>

              <button
                type="button"
                className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>

              <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-surface-border">
                {profile?.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profile_photo_url}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white grid place-items-center text-xs font-semibold">
                    {initialsFor(displayName, displayEmail)}
                  </div>
                )}
                <div className="leading-tight">
                  <p className="text-sm font-medium text-ink truncate max-w-[150px]">{displayName}</p>
                  <p className="text-xs text-ink-muted truncate max-w-[150px]">{displayEmail}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="p-2 rounded-lg text-ink-muted hover:text-brand-danger hover:bg-brand-danger/10 transition disabled:opacity-60 cursor-pointer ml-1"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
