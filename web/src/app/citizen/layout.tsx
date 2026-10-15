'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  AlertTriangle,
  HeartHandshake,
  Receipt,
  LifeBuoy,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ShieldAlert,
  Bell,
  Home,
} from 'lucide-react';
import CitizenHeader from '@/components/citizen/CitizenHeader';
import { useAuth } from '@/context/AuthContext';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { href: '/citizen/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/citizen/map', label: 'Disaster Map', icon: Compass },
    { href: '/citizen/report', label: 'Report Disaster', icon: AlertTriangle },
    { href: '/citizen/campaigns', label: 'Campaigns & Donate', icon: HeartHandshake },
    { href: '/citizen/donations', label: 'My Donations', icon: Receipt },
    { href: '/citizen/aid-request', label: 'Request Aid', icon: LifeBuoy },
    { href: '/citizen/reports', label: 'My Reports', icon: FileText },
    { href: '/citizen/chat', label: 'Chat', icon: MessageSquare },
    { href: '/citizen/settings', label: 'Settings', icon: Settings },
  ];

  const mobileNavItems = [
    { href: '/citizen/dashboard', label: 'Home', icon: Home },
    { href: '/citizen/map', label: 'Map', icon: Compass },
    { href: '/citizen/report', label: 'Report', icon: AlertTriangle },
    { href: '/citizen/aid-request', label: 'Aid', icon: LifeBuoy },
    { href: '/citizen/notifications', label: 'Alerts', icon: Bell },
  ];

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Citizen';

  return (
    <div className="min-h-screen flex bg-surface-muted text-ink">
      {/* DESKTOP SIDEBAR (240px, Admin-Style) */}
      <aside className="hidden lg:flex w-60 flex-col justify-between bg-sidebar text-white shrink-0 z-30 fixed inset-y-0 left-0 border-r border-white/5">
        <div className="flex flex-col h-full">
          {/* Top Header */}
          <div className="px-5 py-5 border-b border-white/5 flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="CrisisLink Network"
              width={34}
              height={34}
              className="w-8 h-8 rounded-lg shrink-0 shadow-card"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">CrisisLink Network</p>
              <p className="text-[11px] text-slate-400 truncate">Citizen Portal</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/citizen/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-brand text-white shadow-card'
                      : 'text-slate-300 hover:text-white hover:bg-sidebar-hover'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        <CitizenHeader />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-8">{children}</main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Square-Style) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-surface-border z-50 px-2 py-1.5 flex items-center justify-around shadow-card-lg">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-md text-[10px] font-medium transition ${
                isActive ? 'text-brand font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
