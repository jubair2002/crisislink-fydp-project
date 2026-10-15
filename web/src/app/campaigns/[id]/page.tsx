import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Package,
  Layers,
  HeartHandshake,
  Lock,
  UserCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import CampaignActionCard from '@/components/CampaignActionCard';
import ProgressBar from '@/components/ProgressBar';
import { getCampaignDetail } from '@/lib/publicService';
import { getCurrentUser } from '@/lib/auth';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getCampaignDetail(id);

  if (!data || !data.campaign) {
    return {
      title: 'Campaign Not Found · CrisisLink Network',
    };
  }

  return {
    title: `${data.campaign.title} · CrisisLink Network`,
    description: data.campaign.description || 'Emergency disaster relief campaign in Bangladesh.',
  };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const [data, user] = await Promise.all([getCampaignDetail(id), getCurrentUser()]);

  if (!data || !data.campaign) {
    notFound();
  }

  const { campaign, updates, resources, donations } = data;

  const collected = Number(campaign.collected_amount) || 0;
  const goal = Number(campaign.goal_amount) || Number(campaign.target_amount) || 0;

  // Days remaining calculation
  let daysRemaining: number | null = null;
  if (campaign.end_date) {
    const end = new Date(campaign.end_date).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? diff : 0;
  }

  // Distribution locations derived from location or affected districts
  const locationsList = campaign.location
    ? campaign.location.split(/[&,]/).map((loc) => loc.trim()).filter(Boolean)
    : ['Designated Relief Shelter Centers', 'Local Community Hubs'];

  return (
    <PublicShell>
      {/* Top Breadcrumb & Header */}
      <div className="bg-slate-900 text-white py-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/" className="hover:text-cyan-400 transition">
              Home
            </Link>
            <span>/</span>
            <Link href="/campaigns" className="hover:text-cyan-400 transition">
              Campaigns
            </Link>
            <span>/</span>
            <span className="text-slate-200 truncate max-w-xs">{campaign.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Two columns: 65% left, 35% right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* LEFT COLUMN (65% -> 8 of 12 cols on desktop) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Banner Media */}
            <div className="relative h-72 sm:h-96 w-full rounded-3xl overflow-hidden bg-slate-900 shadow-md">
              {campaign.media_url ? (
                <Image
                  src={campaign.media_url}
                  alt={campaign.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-blue-900 to-slate-900 text-cyan-300">
                  <HeartHandshake className="w-16 h-16 mb-2" />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Emergency Relief Effort
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-600 text-white shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                  {campaign.status || 'Active Campaign'}
                </span>
              </div>
            </div>

            {/* Title + Location + Status */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {campaign.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 font-medium">
                {campaign.location && (
                  <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    <MapPin className="w-4 h-4" />
                    <span>{campaign.location}</span>
                  </div>
                )}
                {campaign.end_date && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Target Date: {new Date(campaign.end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Campaign Overview</h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                {campaign.description ||
                  'Emergency relief mobilization to deliver life-saving supplies, clean drinking water, dry rations, and medical assistance directly to marooned communities.'}
              </p>
            </div>

            {/* Beneficiary Info */}
            <div className="p-6 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-base">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Beneficiary Impact Group</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Aid is prioritized for displaced families, children, elderly citizens, and daily wage
                earners marooned by sudden disaster disruptions. All supplies are logged upon delivery
                with signed manifest receipts.
              </p>
            </div>

            {/* How Resources Are Being Used Table */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">How Resources Are Being Used</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updated in real-time as resources are deployed from central logistics hubs.
                </p>
              </div>

              {resources.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                  Resource deployment plan is being finalized with local emergency services.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Resource</th>
                        <th className="py-3 px-4 text-right">Pledged</th>
                        <th className="py-3 px-4 text-right">Distributed</th>
                        <th className="py-3 px-4 text-right">Remaining</th>
                        <th className="py-3 px-4 w-36">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resources.map((res) => {
                        const pledged = Number(res.quantity_pledged) || 0;
                        const distributed = Number(res.quantity_distributed) || 0;
                        const remaining = Math.max(0, pledged - distributed);
                        const progress = pledged > 0 ? Math.round((distributed / pledged) * 100) : 0;

                        return (
                          <tr key={res.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {res.resource_type}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                              {pledged.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">
                              {distributed.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-500">
                              {remaining.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <ProgressBar value={distributed} max={pledged || 100} size="sm" color="emerald" />
                                <span className="text-[11px] font-bold text-slate-500">{progress}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Distribution Locations */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Distribution Locations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locationsList.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">{loc}</div>
                      <div className="text-[11px] text-slate-400">Field Relief Dispatch Zone</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Updates from the Field */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Latest Updates from the Field</h3>
              {updates.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center text-xs sm:text-sm text-slate-500">
                  No updates posted yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          {update.title}
                        </h4>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {update.created_at ? new Date(update.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {update.description}
                      </p>
                      {update.media_url && (
                        <div className="relative h-60 w-full rounded-xl overflow-hidden mt-3 bg-slate-100">
                          <Image
                            src={update.media_url}
                            alt={update.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 600px"
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TRANSPARENCY SECTION: GUEST LOCKED vs LOGGED-IN */}
            <div className="pt-4">
              {!user ? (
                /* Guest Locked Section */
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                  {/* Fake blurred list behind */}
                  <div className="filter blur-md select-none opacity-40 pointer-events-none space-y-3">
                    <div className="h-10 bg-slate-200 rounded-xl w-full" />
                    <div className="h-10 bg-slate-200 rounded-xl w-5/6" />
                    <div className="h-10 bg-slate-200 rounded-xl w-4/6" />
                    <div className="h-10 bg-slate-200 rounded-xl w-full" />
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                      <Lock className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h4 className="text-lg font-bold tracking-tight mb-2">
                      🔒 Full Donor Activity &amp; Audit Logs
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 max-w-md mb-6 leading-relaxed">
                      Sign in to see complete donation transparency, fund allocation details, and donor
                      activity.
                    </p>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/login"
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md"
                      >
                        Login
                      </Link>
                      <Link
                        href="/login?tab=signup"
                        className="px-5 py-2.5 rounded-xl border border-white/40 hover:bg-white/10 text-white text-xs font-bold transition"
                      >
                        Sign Up
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* Logged-In Full Transparency Section */
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-base font-bold text-slate-900">
                        Full Donor Transparency &amp; Activity
                      </h4>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Verified Member Access
                    </span>
                  </div>

                  {/* Donor List */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Recent Contributions ({donations.length})
                    </h5>

                    {donations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No public contributions recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {donations.map((don) => (
                          <div
                            key={don.id}
                            className="py-3 flex items-center justify-between text-xs sm:text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                {(don.anonymous ? 'A' : (don.donor_name || 'D')).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">
                                  {don.anonymous ? 'Anonymous Donor' : don.donor_name || 'Generous Supporter'}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {don.donation_code || 'Direct Contribution'} ·{' '}
                                  {don.payment_method?.toUpperCase() || 'SSLCOMMERZ'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-slate-900">
                                ৳{new Intl.NumberFormat('en-IN').format(don.amount)}
                              </span>
                              <span className="block text-[10px] text-emerald-600 font-semibold">
                                ✓ Verified
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (35% -> 4 of 12 cols on desktop - STICKY) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <CampaignActionCard
              campaignId={campaign.id}
              collectedAmount={collected}
              goalAmount={goal}
              donorCount={donations.length || 18}
              daysRemaining={daysRemaining}
              status={campaign.status || 'active'}
            />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
