import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800 text-sm">
          {/* Col 1 */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center">
              <span className="font-bold text-white tracking-tight text-base">
                CrisisLink <span className="font-normal text-slate-400">Network</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Unified disaster reporting, volunteer coordination, and relief fund management platform for Bangladesh.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Navigation
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/campaigns" className="hover:text-white transition">
                  Campaigns
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white transition">
                  Disaster Map
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition">
                  Track Donation
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Access
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-white transition">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition">
                  Sign Up
                </Link>
              </li>
              <li>
                <a href="mailto:support@crisislink.bd" className="hover:text-white transition">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>© 2026 CrisisLink Network. Built as a Final Year Project.</div>
          <div>All data verified by authorized response teams.</div>
        </div>
      </div>
    </footer>
  );
}
