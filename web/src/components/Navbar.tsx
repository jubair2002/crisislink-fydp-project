'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, isLoading: loading, signOut } = useAuth();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/campaigns', label: 'Campaigns' },
    { href: '/map', label: 'Disaster Map' },
    { href: '/track', label: 'Track Donation' },
  ];

  const getDashboardHref = (role?: string) => {
    if (role === 'volunteer') return '/volunteer/dashboard';
    if (role === 'admin' || role === 'authority') return '/admin';
    return '/citizen/dashboard';
  };

  const displayName =
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const userRole = profile?.role || (user?.user_metadata?.role as any) || 'citizen';
  const avatarUrl = profile?.profile_photo_url || null;

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Side: Brand Name (No logo) */}
        <Link href="/" className="flex items-center">
          <span className="text-base font-bold tracking-tight text-slate-900">
            CrisisLink <span className="font-medium text-slate-500">Network</span>
          </span>
        </Link>

        {/* Center Links (Desktop only) */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Auth buttons / User Profile */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-8 rounded-md bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <UserCircle className="w-6 h-6 text-slate-400" />
                )}
                <span className="font-medium text-slate-800 max-w-[120px] truncate">{displayName}</span>
              </div>

              <Link
                href={getDashboardHref(userRole)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>

              <button
                onClick={() => signOut()}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-slate-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            {user ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 px-3">
                  Signed in as <span className="font-semibold text-slate-800">{displayName}</span>
                </div>
                <Link
                  href={getDashboardHref(userRole)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white font-medium text-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full text-center py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-center py-2 rounded-lg bg-blue-600 text-white font-medium text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
