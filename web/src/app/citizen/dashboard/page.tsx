'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Siren,
  Megaphone,
  HandCoins,
  Building,
  MapPin,
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  PhoneCall,
  UserCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import CitizenShell from '@/components/dashboard/CitizenShell';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import { useAuth } from '@/context/AuthContext';

interface DisasterAlert {
  id: string;
  title: string;
  type: string;
  district: string;
  severity: 'critical' | 'warning' | 'advisory';
  updatedAt: string;
  affectedPeople: string;
}

const MOCK_ALERTS: DisasterAlert[] = [
  {
    id: '1',
    title: 'Surma & Kushiyara River Flash Flood Alert',
    type: 'Flood',
    district: 'Sylhet & Sunamganj',
    severity: 'critical',
    updatedAt: '12 mins ago',
    affectedPeople: '~45,000 residents',
  },
  {
    id: '2',
    title: 'Tropical Depression Wind Advisory (Signal 3)',
    type: 'Cyclone',
    district: 'Cox’s Bazar & Chittagong',
    severity: 'warning',
    updatedAt: '35 mins ago',
    affectedPeople: 'Coastal zones',
  },
  {
    id: '3',
    title: 'Riverbank Erosion Monitoring & Water Surge',
    type: 'Flood',
    district: 'Kurigram & Lalmonirhat',
    severity: 'advisory',
    updatedAt: '2 hours ago',
    affectedPeople: 'Low-lying char areas',
  },
];

export default function CitizenDashboardPage() {
  const { user, profile } = useAuth();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Citizen';
  const district = profile?.city || 'Bangladesh';

  return (
    <CitizenShell>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Citizen Overview</h1>
            <p className="text-sm text-ink-muted">
              Live snapshot of regional disaster alerts, community aid, and emergency shelters in {district}.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-ink-muted hidden sm:inline">
              Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-card transition"
            >
              <Siren className="w-4 h-4 animate-pulse" />
              <span>Report Emergency / SOS</span>
            </Link>
          </div>
        </header>

        {/* 4 Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardMetricCard
            label="Active Alerts in Region"
            value="3 Active"
            hint="2 Flood Warnings, 1 Coastal Wind"
            icon={Siren}
            tone="danger"
            badge="Live"
          />
          <DashboardMetricCard
            label="Active Relief Campaigns"
            value="14 Campaigns"
            hint="Currently receiving emergency funds"
            icon={Megaphone}
            tone="brand"
          />
          <DashboardMetricCard
            label="Tracked Aid Dispatched"
            value="৳ 1.25M+"
            hint="Verified food & medical supplies"
            icon={HandCoins}
            tone="success"
          />
          <DashboardMetricCard
            label="Designated Safe Shelters"
            value="18 Open"
            hint="In your district perimeter"
            icon={Building}
            tone="secondary"
          />
        </section>

        {/* Main Content Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Live Alerts & Community Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Disaster Alerts Panel */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-surface-border flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Real-time Disaster &amp; Weather Alerts
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Official flood and storm monitoring by Disaster Response BD.
                  </p>
                </div>
                <Link
                  href="/map"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
                >
                  View Map <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-surface-border">
                {MOCK_ALERTS.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-5 hover:bg-surface-muted transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs text-ink-muted">· {alert.district}</span>
                        <span className="text-xs text-ink-muted">· {alert.updatedAt}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-ink leading-snug">
                        {alert.title}
                      </h3>
                      <p className="text-xs text-ink-muted">
                        Impact: <strong className="text-ink">{alert.affectedPeople}</strong>
                      </p>
                    </div>

                    <Link
                      href="/map"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-ink text-xs font-semibold hover:border-blue-500 hover:text-blue-600 transition shrink-0 self-start sm:self-center"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Track on Map</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Citizen Response Actions */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5">
              <h2 className="text-base font-bold text-ink mb-1">Emergency Operations &amp; Support</h2>
              <p className="text-xs text-ink-muted mb-4">
                Access verified emergency services and track crisis relief efforts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/map"
                  className="p-4 rounded-xl border border-surface-border bg-surface-muted hover:border-blue-500 hover:bg-blue-50/30 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-blue-600 transition">
                    Find Shelter
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Locate government shelters &amp; cyclone centers nearby.
                  </p>
                </Link>

                <Link
                  href="/campaigns"
                  className="p-4 rounded-xl border border-surface-border bg-surface-muted hover:border-emerald-500 hover:bg-emerald-50/30 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-emerald-600 transition">
                    Support Relief
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Donate dry rations, medical kits, and clean drinking water.
                  </p>
                </Link>

                <Link
                  href="/track"
                  className="p-4 rounded-xl border border-surface-border bg-surface-muted hover:border-cyan-500 hover:bg-cyan-50/30 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-cyan-600 transition">
                    Track Donation
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Verify batch numbers and relief distribution milestones.
                  </p>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column (1/3): User Emergency Profile & Emergency Helplines */}
          <div className="space-y-6">
            {/* My Emergency Profile Card */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-brand" />
                  My Emergency Profile
                </h2>
                <Link
                  href="/complete-profile"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Edit
                </Link>
              </div>

              <div className="flex items-center gap-3">
                {profile?.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profile_photo_url}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover border border-surface-border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand/10 text-brand font-bold text-base grid place-items-center shrink-0">
                    {displayName[0]?.toUpperCase() || 'C'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink truncate">{displayName}</p>
                  <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> Profile Active
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-1 border-t border-surface-border">
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Phone Number:</span>
                  <span className="font-semibold text-ink">{profile?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">City / District:</span>
                  <span className="font-semibold text-ink">{profile?.city || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Address:</span>
                  <span className="font-semibold text-ink text-right max-w-[160px] truncate">
                    {profile?.address || 'Not provided'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Emergency Contact:</span>
                  <span className="font-semibold text-ink text-right max-w-[160px] truncate">
                    {profile?.emergency_contact || 'None registered'}
                  </span>
                </div>
              </div>
            </div>

            {/* National Emergency Hotline Directory */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 space-y-4">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-red-500" />
                Emergency Hotline Directory
              </h2>
              <p className="text-xs text-ink-muted">
                Tap to copy or dial immediate emergency response lines across Bangladesh.
              </p>

              <div className="space-y-2">
                {[
                  { number: '999', label: 'National Police, Fire & Ambulance', color: 'text-red-600' },
                  { number: '1090', label: 'Flood & Disaster Early Warning', color: 'text-blue-600' },
                  { number: '16123', label: 'Bangladesh Red Crescent Helpline', color: 'text-emerald-600' },
                  { number: '16263', label: 'National Health Service Center', color: 'text-purple-600' },
                ].map((item) => (
                  <div
                    key={item.number}
                    onClick={() => copyToClipboard(item.number)}
                    className="p-3 rounded-lg border border-surface-border bg-surface-muted hover:border-slate-400 hover:bg-surface transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className={`text-base font-extrabold ${item.color}`}>
                        {item.number}
                      </span>
                      <p className="text-[11px] text-ink-muted">{item.label}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 px-2 py-1 rounded bg-surface border border-surface-border">
                      {copiedNumber === item.number ? 'Copied!' : 'Copy'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  During flash floods, keep cellphones charged in waterproof pouches and follow shelter directives from local authorities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CitizenShell>
  );
}
