import React from 'react';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, MapPin, AlertTriangle, HeartHandshake } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* LEFT 40% (Desktop only): Dark (#0F172A) */}
      <div className="hidden lg:flex lg:w-[40%] bg-[#0F172A] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        {/* Subtle ambient mesh background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600 blur-[120px]" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-500 blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Top: Large Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/logo.svg"
              alt="CrisisLink Network"
              width={44}
              height={44}
              className="w-11 h-11 rounded-xl shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="text-xl font-black text-white tracking-tight leading-none block">
                CrisisLink <span className="text-cyan-400">Network</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                National Crisis Response
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Tagline & 3 Highlights */}
        <div className="relative z-10 space-y-8 my-auto py-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-300 text-xs font-semibold">
              <span>🇧🇩 Built for Bangladesh</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
              Coordinate. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">
                Respond. Save Lives.
              </span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Join thousands of citizens, coordinators, and verified relief organizations safeguarding communities.
            </p>
          </div>

          {/* 3 Highlights */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Real-time disaster mapping</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interactive OpenStreetMap with verified flood, cyclone, and hazard zones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Easy disaster reporting</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Submit ground-truth reports with GPS autofill and photo evidence in seconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Transparent donation tracking</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Track every taka from digital wallets to physical supplies with photographic delivery proof.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-xs text-slate-500 border-t border-slate-800/80 pt-6">
          © 2026 CrisisLink Network. Protecting communities across Bangladesh.
        </div>
      </div>

      {/* RIGHT 60%: White Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16">
        {/* Mobile-only header */}
        <div className="lg:hidden w-full max-w-[420px] mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="CrisisLink Network"
              width={38}
              height={38}
              className="w-9 h-9 rounded-lg shadow-sm"
            />
            <span className="text-lg font-black text-slate-900 tracking-tight">
              CrisisLink <span className="text-blue-600">Network</span>
            </span>
          </Link>
        </div>

        {/* Content Container (max-w 420px) */}
        <div className="w-full max-w-[420px] mx-auto">{children}</div>
      </div>
    </div>
  );
}
