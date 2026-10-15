'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ShieldAlert,
  HeartHandshake,
  MapPin,
  Search,
  User as UserIcon,
  LogOut,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user, profile, isLoading: loading, signOut } = useAuth();

  // Determine dashboard link based on role
  let dashboardHref = '/citizen/dashboard';
  if (profile?.role === 'admin') {
    dashboardHref = '/admin';
  } else if (profile?.role === 'volunteer') {
    dashboardHref = '/use-mobile';
  }

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    await signOut();
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: null },
    { href: '/#about', label: 'About', icon: null },
    { href: '/campaigns', label: 'Relief Campaigns', icon: HeartHandshake },
    { href: '/map', label: 'Disaster Map', icon: MapPin },
    { href: '/track', label: 'Track Aid', icon: Search },
    { href: '/#contact', label: 'Contact', icon: null },
  ];

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-extrabold text-slate-900 group tracking-tight"
          >
            <img
              src="/logo.svg"
              alt="CrisisLink Network"
              width={38}
              height={38}
              className="w-9 h-9 rounded-lg shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="text-base sm:text-lg font-black tracking-tight leading-none text-slate-900">
              CrisisLink <span className="text-brand">Network</span>
            </span>
          </Link>

          {/* Center (Desktop nav links) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth Controls */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition shadow-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                    {profile?.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Dropdown */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200/80 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 capitalize">
                        {profile?.role || 'Citizen'}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href={dashboardHref}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-blue-500" />
                        Dashboard
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : !loading ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-bold text-blue-600 border border-blue-600/40 rounded-xl hover:bg-blue-50 transition shadow-sm"
                >
                  Login
                </Link>
                <Link
                  href="/login?tab=signup"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm hover:shadow"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="w-24 h-8 bg-slate-100 animate-pulse rounded-xl" />
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Auth actions */}
          <div className="pt-4 border-t border-slate-100">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{displayName}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{profile?.role || 'Citizen'}</p>
                  </div>
                </div>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 rounded-xl border border-blue-600 text-xs font-bold text-blue-600 hover:bg-blue-50 text-center"
                >
                  Login
                </Link>
                <Link
                  href="/login?tab=signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 text-center shadow-sm"
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
