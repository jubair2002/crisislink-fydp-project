import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  HeartHandshake,
  CheckCircle2,
  LifeBuoy,
} from 'lucide-react';

export const metadata = {
  title: 'Authentication · CrisisLink',
  description: 'Sign in or register for the CrisisLink Disaster Management Platform',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white selection:bg-blue-500 selection:text-white">
      {/* LEFT PANEL (40% on desktop, hidden on mobile) */}
      <aside className="hidden md:flex md:w-[40%] bg-[#0F172A] text-white p-10 lg:p-14 flex-col justify-between relative overflow-hidden shadow-2xl">
        {/* Subtle Decorative Background Gradients & Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.15),transparent_50%)] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <LifeBuoy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                CrisisLink
              </span>
              <span className="text-xs font-medium text-slate-400 block tracking-wide uppercase">
                Disaster Response BD
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Tagline & 3 Feature Highlights */}
        <div className="relative z-10 my-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Unified Relief Platform
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Coordinate. Respond. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
                Save Lives.
              </span>
            </h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-sm">
              Connecting affected citizens, certified rescue volunteers, and transparent relief aid across Bangladesh in real time.
            </p>
          </div>

          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Real-time disaster mapping
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live SOS alerts, flood level tracking, and hot-zone incident map.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verified volunteer network
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Trained rescue teams, medical personnel, and coordinated dispatch.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Transparent donation tracking
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every taka tracked from donor contribution to field delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Subtle decorative footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} CrisisLink BD</span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-300 font-medium">Emergency grid active</span>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL (60% on desktop, full-width on mobile) */}
      <main className="w-full md:w-[60%] bg-white min-h-screen flex flex-col justify-center items-center p-6 sm:p-10 relative">
        {/* Mobile Header Branding */}
        <div className="md:hidden w-full max-w-[420px] mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">CrisisLink</span>
          </Link>
          <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            Secure Auth
          </span>
        </div>

        <div className="w-full max-w-[420px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
