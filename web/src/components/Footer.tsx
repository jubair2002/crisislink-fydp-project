import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Heart, PhoneCall, ExternalLink, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800">
      {/* Emergency Hotlines Strip */}
      <div className="bg-slate-900 border-b border-slate-800/80 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-bold tracking-wide uppercase">
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>Emergency Hotlines (Bangladesh):</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-semibold">
            <span className="flex items-center gap-1.5 text-slate-200">
              <strong className="text-rose-400">999</strong> National Emergency
            </span>
            <span className="flex items-center gap-1.5 text-slate-200">
              <strong className="text-amber-400">1090</strong> Flood &amp; Disaster Warning
            </span>
            <span className="flex items-center gap-1.5 text-slate-200">
              <strong className="text-cyan-400">16263</strong> Health Services
            </span>
            <span className="flex items-center gap-1.5 text-slate-200">
              <strong className="text-emerald-400">333</strong> Citizen Services &amp; Relief
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Col 1: Logo & Tagline (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/logo.svg"
                alt="CrisisLink Network"
                width={36}
                height={36}
                className="w-8 h-8 rounded-lg shadow-sm"
              />
              <span className="text-xl font-black text-white tracking-tight">
                CrisisLink <span className="text-cyan-400">Network</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Empowering communities and coordinating rapid, transparent disaster relief across
              Bangladesh. Real-time emergency mapping, direct aid requests, and end-to-end fund
              tracking.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
              <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Dhaka &amp; Nationwide Response Hubs, Bangladesh</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-slate-400 hover:text-cyan-400 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/campaigns" className="text-slate-400 hover:text-cyan-400 transition">
                  Active Campaigns
                </Link>
              </li>
              <li>
                <Link href="/map" className="text-slate-400 hover:text-cyan-400 transition">
                  Disaster Map
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-slate-400 hover:text-cyan-400 transition">
                  Track Donation
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Citizen Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Citizen Portal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/citizen/report" className="text-slate-400 hover:text-cyan-400 transition">
                  Report a Disaster
                </Link>
              </li>
              <li>
                <Link href="/citizen/aid-request" className="text-slate-400 hover:text-cyan-400 transition">
                  Request Emergency Aid
                </Link>
              </li>
              <li>
                <Link href="/map" className="text-slate-400 hover:text-cyan-400 transition">
                  Live Emergency Alerts
                </Link>
              </li>
              <li>
                <Link href="/use-mobile" className="text-slate-400 hover:text-cyan-400 transition">
                  Volunteer Mobile App
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Support & Auth */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Access &amp; Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="text-slate-400 hover:text-cyan-400 transition">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/login?tab=signup" className="text-slate-400 hover:text-cyan-400 transition">
                  Sign Up
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@crisislink.net"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 CrisisLink Network. Built as a Final Year Project.</p>
          <p className="flex items-center gap-1">
            Built for resilient communities across Bangladesh 🇧🇩
          </p>
        </div>
      </div>
    </footer>
  );
}
