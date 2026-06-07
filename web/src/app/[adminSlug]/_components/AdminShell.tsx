'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '@/types/auth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const STORAGE_KEY = 'cl-admin-sidebar';

interface AdminShellProps {
  slug: string;
  profile: Profile;
  children: React.ReactNode;
}

export default function AdminShell({ slug, profile, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'closed') setDesktopOpen(false);
    } catch {
      /* ignore storage errors */
    }
    setHydrated(true);
  }, []);

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

  const mainPad = hydrated && !desktopOpen ? 'lg:pl-0' : 'lg:pl-64';

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar
        slug={slug}
        mobileOpen={mobileOpen}
        desktopOpen={desktopOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${mainPad}`}
      >
        <Topbar
          profile={profile}
          onToggleSidebar={toggleSidebar}
          sidebarVisible={desktopOpen || mobileOpen}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
