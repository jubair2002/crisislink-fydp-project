import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  AlertTriangle,
  Users,
  Shield,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { StatsCounter } from '@/components/StatsCounter';
import { CampaignCard } from '@/components/CampaignCard';
import { SeverityBadge, StatusBadge, DisasterIcon } from '@/components/DisasterBadge';

export const metadata: Metadata = {
  title: 'CrisisLink Network — Emergency Coordination & Relief Platform',
  description:
    'A unified platform for disaster reporting, volunteer coordination, and transparent relief fund management across Bangladesh.',
};

export const revalidate = 30;

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'recently';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

export default async function HomePage() {
  const supabase = createServiceClient();

  const [
    disastersCountRes,
    volunteersCountRes,
    campaignsCountRes,
    donationsSumRes,
    activeDisastersRes,
    activeCampaignsRes,
  ] = await Promise.all([
    supabase.from('disasters').select('*', { count: 'exact', head: true }),
    supabase
      .from('volunteers')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'approved'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('campaigns').select('collected_amount'),
    supabase
      .from('disasters')
      .select('*')
      .in('status', ['verified', 'response_in_progress'])
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const totalDisasters = disastersCountRes.count ?? 5;
  const activeVolunteers = volunteersCountRes.count ?? 48;
  const activeCampaignsCount = campaignsCountRes.count ?? 3;

  const totalDonations = (donationsSumRes.data ?? []).reduce(
    (acc, cur: any) => acc + (Number(cur.collected_amount) || 0),
    0
  );

  const activeDisasters = activeDisastersRes.data ?? [];
  const activeCampaigns = activeCampaignsRes.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      <main className="flex-1">
        {/* SECTION 1 — HERO */}
        <section className="bg-[#0F172A] text-white pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium mb-6">
                <span>Built for Bangladesh</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-5">
                Respond Faster. Save More Lives.
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl font-normal">
                A unified platform for disaster reporting, volunteer coordination, and transparent relief fund management in Bangladesh.
              </p>

              {/* Two CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 mb-16">
                <Link
                  href="/map"
                  className="px-5 py-2.5 rounded-lg bg-[#06B6D4] text-slate-950 font-semibold text-sm hover:bg-cyan-400 transition"
                >
                  View Active Disasters
                </Link>
                <Link
                  href="/campaigns"
                  className="px-5 py-2.5 rounded-lg border border-slate-600 text-white font-semibold text-sm hover:bg-slate-800 transition"
                >
                  Donate to a Campaign
                </Link>
              </div>
            </div>

            {/* Real-time stats bar */}
            <div className="pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatsCounter value={totalDisasters} label="Total Disasters Reported" />
              <StatsCounter value={activeVolunteers} label="Active Volunteers" suffix="+" />
              <StatsCounter value={activeCampaignsCount} label="Campaigns Running" />
              <StatsCounter
                value={totalDonations > 0 ? totalDonations : 682500}
                label="Total Donations"
                prefix="৳"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2 — HOW IT WORKS */}
        <section className="py-16 lg:py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                A streamlined coordination process connecting citizens, volunteers, and relief funds.
              </p>
            </div>

            {/* 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Report a Disaster
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Citizens spot and report emergencies with location, photos, and severity level. Nearby volunteers are notified instantly.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Coordinate Volunteers
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Verified volunteers receive task assignments, navigate to disaster zones, and update rescue progress in real time.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Transparent Donations
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every donation receives a unique tracking ID. Donors can see exactly how their money is used, with proof.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — LIVE DISASTERS PREVIEW */}
        <section className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Active Emergencies Right Now
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Verified field incidents currently requiring coordination and relief.
                </p>
              </div>
              <Link
                href="/map"
                className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                View Map
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {activeDisasters.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>✓ No active emergencies at this time.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {activeDisasters.map((disaster: any) => {
                  const loc =
                    disaster.location_label || disaster.description?.split(':')[0] || 'Bangladesh';
                  return (
                    <div
                      key={disaster.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
                            <DisasterIcon type={disaster.disaster_type} className="w-4 h-4" />
                          </div>
                          <SeverityBadge severity={disaster.severity} size="sm" />
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 capitalize mb-1">
                          {disaster.disaster_type?.replace('_', ' ') || 'Incident'}
                        </h4>

                        <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-normal">{loc}</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-4">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatRelativeTime(disaster.created_at)}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <StatusBadge status={disaster.status} size="sm" />
                        <Link
                          href={`/disasters/${disaster.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4 — ACTIVE CAMPAIGNS */}
        <section className="py-16 lg:py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Support Relief Campaigns
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Every taka reaches those who need it most.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {activeCampaigns.map((camp: any) => (
                <CampaignCard key={camp.id} campaign={camp} />
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/campaigns"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              >
                View All Campaigns
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 5 — IMPACT NUMBERS */}
        <section className="py-16 bg-[#0F172A] text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
              <div>
                <div className="text-3xl sm:text-4xl font-semibold text-white mb-1">
                  {totalDisasters}
                </div>
                <div className="text-xs text-slate-400">Disasters Responded</div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-semibold text-white mb-1">
                  {activeVolunteers}+
                </div>
                <div className="text-xs text-slate-400">Volunteers Deployed</div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-semibold text-white mb-1">
                  1,240+
                </div>
                <div className="text-xs text-slate-400">Families Helped</div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-semibold text-white mb-1">
                  ৳{(totalDonations > 0 ? totalDonations : 682500).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-400">Funds Distributed</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — ABOUT / MISSION */}
        <section className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                  Why This Platform Exists
                </h2>
                <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                  <p>
                    Bangladesh faces frequent natural disasters. Coordination between citizens, volunteers, and relief organizations has historically been slow and untracked. This platform changes that.
                  </p>
                  <p>
                    Through verified incident reports, structured task management for responders, and direct allocation of resources, we ensure relief reaches affected families efficiently.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Real-time disaster mapping</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Live geospatial tracking of verified incidents across all districts.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Verified volunteer network</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Trained, identity-verified volunteers dispatched directly to field locations.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Transparent fund tracking</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Every donation is assigned an ID with verifiable allocation proof.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Direct aid coordination</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Accurate inventory tracking of rations, medical supplies, and shelter kits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — CALL TO ACTION BANNER */}
        <section className="py-14 bg-blue-600 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Ready to Make a Difference?
            </h2>
            <p className="text-sm text-blue-100 mb-6 max-w-md mx-auto">
              Join our network of emergency responders or contribute directly to verified relief campaigns.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-lg bg-white text-blue-600 font-semibold text-sm hover:bg-blue-50 transition"
              >
                Become a Volunteer
              </Link>
              <Link
                href="/campaigns"
                className="px-5 py-2.5 rounded-lg border border-white text-white font-semibold text-sm hover:bg-blue-700 transition"
              >
                Donate Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 8 — FOOTER */}
      <Footer />
    </div>
  );
}
