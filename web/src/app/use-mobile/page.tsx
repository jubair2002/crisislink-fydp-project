'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, HeartHandshake, MapPin, LogOut, ShieldAlert } from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import { signOut } from '@/lib/authService';

export default function UseMobilePage() {
  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <PublicShell>
      <div className="bg-[#0F172A] text-white py-14 lg:py-20 border-b border-slate-800 text-center">
        <div className="max-w-xl mx-auto px-4 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Mobile-Only Experience
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Field volunteer task allocation &amp; disaster operations
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-14">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
            <ShieldAlert className="w-8 h-8 text-[#F59E0B]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Volunteer accounts work on the mobile app.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
              Volunteer assignment dispatching, live GPS check-ins, supply distribution scans, and
              first-responder coordination are exclusively available through our dedicated mobile
              application.
            </p>
          </div>

          {/* Action Buttons: Browse campaigns, View map, Logout */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/campaigns"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Browse Campaigns</span>
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
              >
                <MapPin className="w-4 h-4 text-cyan-600" />
                <span>View Disaster Map</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
