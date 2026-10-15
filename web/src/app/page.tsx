import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  LifeBuoy,
  HeartHandshake,
  MapPin,
  Clock,
  Compass,
  Activity,
  Layers,
  CheckCircle,
  FileCheck2,
  Phone,
  Mail,
  Building2,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Radio,
} from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import StatsCounter from '@/components/StatsCounter';
import CampaignCard from '@/components/CampaignCard';
import { SeverityBadge, StatusBadge, getDisasterTypeMeta } from '@/components/DisasterBadge';
import { getLandingStats, getLiveDisasters, getActiveCampaigns } from '@/lib/publicService';

export const metadata: Metadata = {
  title: 'CrisisLink Network · Emergency Response & Relief',
  description:
    'Real-time disaster management, verified relief coordination, and transparent donation tracking across Bangladesh.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return 'recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function LandingPage() {
  const [stats, liveDisasters, activeCampaigns] = await Promise.all([
    getLandingStats(),
    getLiveDisasters(4),
    getActiveCampaigns(3),
  ]);

  return (
    <PublicShell>
      {/* 1. HERO SECTION (Institutional Dark Navy #0F172A) */}
      <section className="relative overflow-hidden bg-[#0F172A] text-white pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-800">
        {/* Clean architectural subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Rapid Response. Verified Aid. <br />
              <span className="text-sky-400">Zero Administrative Leakage.</span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              CrisisLink Network connects affected communities, authorized emergency coordinators, and
              verified humanitarian donors through real-time incident mapping, ground-truth verification,
              and auditable relief tracking.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-sm transition"
              >
                <Compass className="w-4 h-4" />
                <span>Open Incident Map</span>
              </Link>
              <Link
                href="/campaigns"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition"
              >
                <HeartHandshake className="w-4 h-4 text-sky-400" />
                <span>Active Relief Operations</span>
              </Link>
              <Link
                href="#about"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-slate-400 hover:text-white font-medium text-sm transition"
              >
                <span>About the Network</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="mt-14 lg:mt-18 pt-8 border-t border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatsCounter
                value={stats.totalDisasters}
                label="Total Incidents"
                sublabel="Recorded &amp; Monitored"
                icon={<Activity className="w-5 h-5 text-sky-400" />}
              />
              <StatsCounter
                value={stats.activeCampaignsCount}
                label="Active Missions"
                sublabel="Field Relief Operations"
                icon={<Radio className="w-5 h-5 text-sky-400" />}
              />
              <StatsCounter
                value={stats.totalDonationsAmount}
                prefix="৳"
                label="Direct Aid Raised"
                sublabel="100% Program Allocated"
                icon={<HeartHandshake className="w-5 h-5 text-sky-400" />}
              />
              <StatsCounter
                value={stats.totalDonors}
                suffix="+"
                label="Verified Donors"
                sublabel="Auditable Receipts Issued"
                icon={<ShieldCheck className="w-5 h-5 text-sky-400" />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT CRISISLINK NETWORK SECTION (#about) */}
      <section id="about" className="py-16 sm:py-20 bg-white border-b border-slate-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">
              Institutional Framework
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              About CrisisLink Network
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              CrisisLink Network serves as an integrated digital command and relief coordination infrastructure.
              Established to modernize humanitarian emergency workflows, the platform bridges the critical operational
              gap between crowdsourced citizen reports and rapid ground deployment by verified NGOs and responder agencies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Ground-Truth Telemetry</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Crowdsourced incident alerts captured with exact GPS coordinates, severity metrics, and photographic evidence for rapid verification.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Volunteer Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated task routing and resource allocation to mobilize vetted field volunteers within hours of emergency confirmation.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Auditable Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cryptographically assigned tracking numbers for every contribution. Donors inspect signed field manifests and delivery photographs.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2.5">
              <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Zero Leakage Policy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct escrow allocation ensuring that humanitarian donations reach targeted relief operations without administrative deduction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LIVE INCIDENTS OVERVIEW */}
      <section id="disasters" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1 block">
                Field Telemetry
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Active Emergency Incidents
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Verified incidents undergoing active monitoring and volunteer triage response.
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
            >
              <span>Explore Interactive Map</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {liveDisasters.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
              No critical emergency incidents currently recorded.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {liveDisasters.map((disaster) => {
                const meta = getDisasterTypeMeta(disaster.disaster_type);
                const Icon = meta.icon;

                return (
                  <div
                    key={disaster.id}
                    className="flex flex-col justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          <span className="capitalize">{meta.label}</span>
                        </div>
                        <SeverityBadge severity={disaster.severity} />
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed mb-3">
                        {disaster.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[130px]">
                          {disaster.location_label || `${disaster.latitude?.toFixed(2)}, ${disaster.longitude?.toFixed(2)}`}
                        </span>
                        <span>{formatTimeAgo(disaster.created_at)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <StatusBadge status={disaster.status} />
                        <Link
                          href={`/map?id=${disaster.id}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          View Live &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. VERIFIED RELIEF CAMPAIGNS */}
      <section id="campaigns" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1 block">
                Humanitarian Aid
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Verified Relief Campaigns
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Direct community funding for active disaster relief missions across Bangladesh.
              </p>
            </div>
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
            >
              <span>View All Campaigns</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCampaigns.map((camp) => (
              <CampaignCard key={camp.id} campaign={camp} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. OPERATIONAL WORKFLOW (How It Works) */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1 block">
              Standard Operating Directive
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Operational Response Workflow
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              A transparent, four-phase operational pipeline connecting field observations to targeted disaster relief.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-blue-600">01 / INGESTION</span>
              <h3 className="text-sm font-bold text-slate-900">Incident Reported</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizens report flash floods, hill slope failures, or cyclonic surges with geotagged coordinates and field photos.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-blue-600">02 / VERIFICATION</span>
              <h3 className="text-sm font-bold text-slate-900">Ground Triage</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Crisis coordinators corroborate cross-source reports, designate threat severity, and initialize relief parameters.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-blue-600">03 / DISPATCH</span>
              <h3 className="text-sm font-bold text-slate-900">Resource Routing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Volunteer groups and partner organizations are assigned direct procurement and delivery manifests.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-blue-600">04 / AUDIT</span>
              <h3 className="text-sm font-bold text-slate-900">Verified Delivery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recipients and coordinators sign digital delivery manifests, closing the audit loop for every taka disbursed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OFFICIAL CONTACT & OPERATIONS COMMAND (#contact) */}
      <section id="contact" className="py-16 sm:py-20 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">
              Official Communication
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Headquarters &amp; Emergency Dispatch Desk
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Official operational channels for disaster coordinators, partner relief agencies, citizen inquiries, and emergency dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Box 1: Emergency Helplines */}
            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Phone className="w-4 h-4 text-rose-600" />
                <span>24/7 National Emergency Helplines</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-semibold text-slate-800">Disaster Early Warning:</span>
                  <span className="font-mono font-bold text-blue-700">1090 (Toll Free)</span>
                </li>
                <li className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-semibold text-slate-800">National Emergency Service:</span>
                  <span className="font-mono font-bold text-blue-700">999</span>
                </li>
                <li className="flex items-start justify-between">
                  <span className="font-semibold text-slate-800">CrisisLink Operations Desk:</span>
                  <span className="font-mono font-bold text-blue-700">+880 2 5566-8200</span>
                </li>
              </ul>
            </div>

            {/* Box 2: Central Command Complex */}
            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Central Logistics Command</span>
              </div>
              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  <strong>CrisisLink Network Secretariat</strong><br />
                  Disaster Management Complex, Agargaon<br />
                  Sher-e-Bangla Nagar, Dhaka-1207, Bangladesh
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Active Regional Response Desks: Sylhet, Chittagong, Cox&apos;s Bazar, and Khulna.
                </p>
              </div>
            </div>

            {/* Box 3: Inquiries & Verification */}
            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>Operational Email Directory</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <span className="text-slate-500 block text-[11px]">General Operations:</span>
                  <a href="mailto:operations@crisislink.net" className="font-medium text-blue-600 hover:underline">
                    operations@crisislink.net
                  </a>
                </li>
                <li>
                  <span className="text-slate-500 block text-[11px]">Audits &amp; Financial Tracking:</span>
                  <a href="mailto:audit@crisislink.net" className="font-medium text-blue-600 hover:underline">
                    audit@crisislink.net
                  </a>
                </li>
                <li>
                  <span className="text-slate-500 block text-[11px]">NGO &amp; Volunteer Inquiries:</span>
                  <a href="mailto:partners@crisislink.net" className="font-medium text-blue-600 hover:underline">
                    partners@crisislink.net
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. INSTITUTIONAL CALLOUT (Clean Slate-900 banner) */}
      <section className="py-12 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">Witnessing or Affected by a Local Emergency?</h3>
            <p className="text-xs text-slate-400">
              Submit a ground report or request emergency aid supplies directly through the Citizen Portal.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/citizen/report"
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            >
              Report Incident
            </Link>
            <Link
              href="/citizen/aid-request"
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Request Aid
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
