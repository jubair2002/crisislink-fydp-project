'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, X } from 'lucide-react';
import { ADMIN_NAV, buildNavHref } from '@/lib/nav';
import PendingVolunteerBadge from './PendingVolunteerBadge';

const isActive = (href: string, pathname: string, root: string) => {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
};

interface SidebarProps {
  slug: string;
  mobileOpen: boolean;
  desktopOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ slug, mobileOpen, desktopOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const root = `/${slug}`;

  const NavList = (
    <nav className="px-3 py-4 space-y-1">
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        const href = buildNavHref(slug, item.path);
        const active = isActive(href, pathname, root);
        return (
          <Link
            key={href}
            href={href}
            prefetch
            onClick={onMobileClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              active
                ? 'bg-brand text-white shadow-card'
                : 'text-slate-300 hover:text-white hover:bg-sidebar-hover'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1">{item.label}</span>
            {item.path === '/volunteers' ? <PendingVolunteerBadge /> : null}
          </Link>
        );
      })}
    </nav>
  );

  const Header = (
    <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
      <div className="w-9 h-9 rounded-lg bg-brand grid place-items-center text-white font-bold shrink-0">
        C
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">CrisisLink</p>
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 shrink-0" /> Admin Console
        </p>
      </div>
    </div>
  );

  const Footer = (
    <div className="px-5 py-4 text-[11px] text-slate-500 border-t border-white/5">
      v0.1.0 · {new Date().getFullYear()}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
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

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink/60" onClick={onMobileClose} aria-hidden />
          <aside className="relative w-72 max-w-[80vw] bg-sidebar text-white flex flex-col shadow-card-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">{Header}</div>
              <button
                type="button"
                onClick={onMobileClose}
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
      ) : null}
    </>
  );
}
