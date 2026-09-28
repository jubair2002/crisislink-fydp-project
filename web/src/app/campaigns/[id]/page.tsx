import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Calendar,
  Users,
  Shield,
  Package,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProgressBar } from '@/components/ProgressBar';
import { CampaignDetailActionCard } from './CampaignDetailActionCard';

export const revalidate = 15;

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('title, description')
    .eq('id', id)
    .maybeSingle();

  if (!campaign) {
    return {
      title: 'Campaign Not Found — CrisisLink Network',
    };
  }

  return {
    title: `${campaign.title} — CrisisLink Network`,
    description: campaign.description || 'Emergency disaster relief fund in Bangladesh.',
  };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const supabase = createServiceClient();
  const currentUser = await getCurrentUser();

  const [campaignRes, updatesRes, resourcesRes, donationsRes] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('campaign_updates')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_resources')
      .select('*')
      .eq('campaign_id', id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('donations')
      .select('*')
      .eq('campaign_id', id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false }),
  ]);

  const campaign = campaignRes.data;
  if (!campaign) {
    notFound();
  }

  const updates = updatesRes.data ?? [];
  const resources = resourcesRes.data ?? [];
  const donations = donationsRes.data ?? [];

  const goal = Number(campaign.goal_amount || campaign.target_amount || 0);
  const collected = Number(campaign.collected_amount || 0);
  const percentage = goal > 0 ? Math.min(Math.round((collected / goal) * 100), 100) : 0;
  const donorCount = donations.length;

  let daysRemaining: number | null = null;
  let isEndingSoon = false;
  if (campaign.end_date) {
    const end = new Date(campaign.end_date).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? diff : 0;
    isEndingSoon = daysRemaining <= 7 && daysRemaining > 0;
  }

  const distributionLocations = [
    { name: campaign.location || 'Sylhet Sadar', items: '820 dry ration packs, 2,100 water tablets' },
    { name: 'Gowainghat Upazila High School Shelter', items: '340 emergency kits, tarpaulins' },
    { name: 'Companiganj Riverside Char', items: 'Water purification supplies, child nutrient packs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 font-medium">
          <Link href="/" className="hover:text-slate-900 transition">Home</Link>
          <span>/</span>
          <Link href="/campaigns" className="hover:text-slate-900 transition">Campaigns</Link>
          <span>/</span>
          <span className="text-slate-800 truncate max-w-[240px]">{campaign.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (65%) */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Banner */}
            <div className="relative h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
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
                <div className="w-full h-full bg-slate-900 flex items-center justify-center p-6 text-white text-center">
                  <h1 className="text-xl font-bold">{campaign.title}</h1>
                </div>
              )}
            </div>

            {/* 2. Title & Status */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {campaign.location || 'Bangladesh'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                    campaign.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {campaign.status === 'active' ? 'Active Campaign' : 'Completed'}
                </span>
                {daysRemaining !== null && (
                  <span className="px-2.5 py-0.5 rounded text-xs text-slate-500 bg-slate-100">
                    {daysRemaining === 0 ? 'Ended' : `${daysRemaining} days left`}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {campaign.title}
              </h1>
            </div>

            {/* 3. Description */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Campaign Overview</h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
                <p>
                  {campaign.description ||
                    'Emergency relief distribution targeting displaced families in vulnerable zones.'}
                </p>
                <p>
                  All resources are purchased through verified local suppliers and cataloged with photographic delivery receipts for transparency.
                </p>
              </div>
            </div>

            {/* 4. Beneficiary Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Beneficiary Information
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <div className="text-xl font-bold text-slate-900">1,200+</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Families</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <div className="text-xl font-bold text-slate-900">4,800+</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Beneficiaries</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <div className="text-xl font-bold text-slate-900">100%</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Verified Delivery</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aid packages prioritize female-headed households, elderly individuals, and families with young children residing in flooded char settlements.
              </p>
            </div>

            {/* 5. Campaign Updates */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Latest Updates from the Field
                </h3>
                <span className="text-xs text-slate-400">{updates.length} updates</span>
              </div>

              {updates.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-slate-50 text-xs text-slate-500">
                  No updates posted yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((update: any) => (
                    <div key={update.id} className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">{update.title}</span>
                        <span>
                          {new Date(update.created_at).toLocaleDateString('en-BD', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{update.description}</p>
                      {update.media_url && (
                        <div className="relative h-48 w-full rounded-md overflow-hidden border border-slate-200 mt-2">
                          <Image
                            src={update.media_url}
                            alt={update.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 700px"
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Resource Transparency (VISIBLE TO ALL) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  How Resources Are Being Used
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Itemized allocation of purchased and delivered relief goods.
                </p>
              </div>

              {resources.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                  Resource allocations currently being compiled.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                        <th className="pb-2 pr-3">Resource</th>
                        <th className="pb-2 px-3 text-center">Pledged</th>
                        <th className="pb-2 px-3 text-center">Distributed</th>
                        <th className="pb-2 px-3 text-center">Remaining</th>
                        <th className="pb-2 pl-3 min-w-[120px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resources.map((res: any) => {
                        const total = Number(res.quantity_pledged || 0);
                        const dist = Number(res.quantity_distributed || 0);
                        const rem = Math.max(0, total - dist);
                        return (
                          <tr key={res.id}>
                            <td className="py-3 pr-3 font-medium text-slate-900">{res.resource_type}</td>
                            <td className="py-3 px-3 text-center text-slate-600">{total}</td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-900">{dist}</td>
                            <td className="py-3 px-3 text-center text-slate-500">{rem}</td>
                            <td className="py-3 pl-3">
                              <ProgressBar current={dist} target={total} color="blue" height="sm" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic">
                Updated in real-time as resources are deployed.
              </p>
            </div>

            {/* 7. Distribution Locations */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                Distribution Locations
              </h3>
              <div className="space-y-2">
                {distributionLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs gap-1.5"
                  >
                    <span className="font-semibold text-slate-900">{loc.name}</span>
                    <span className="text-slate-500">{loc.items}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. GUEST LOCKED vs LOGGED IN */}
            {!currentUser ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Full Donor Activity
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Sign in to see complete donation transparency, fund allocation details, and donor activity.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Verified Donor Ledger
                </h3>

                {donations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                    No donations recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                          <th className="pb-2 pr-3">Donor</th>
                          <th className="pb-2 px-3">Tracking Code</th>
                          <th className="pb-2 px-3">Date</th>
                          <th className="pb-2 pl-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {donations.map((don: any) => (
                          <tr key={don.id}>
                            <td className="py-2.5 pr-3 font-medium text-slate-900">
                              {don.anonymous ? 'Anonymous Donor' : don.donor_name || 'Supporter'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {don.donation_code || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(don.created_at).toLocaleDateString('en-BD', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-semibold text-slate-900">
                              ৳{Number(don.amount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (STICKY, 35%) */}
          <div className="lg:col-span-4 sticky top-20">
            <CampaignDetailActionCard
              campaignId={campaign.id}
              campaignTitle={campaign.title}
              collected={collected}
              goal={goal}
              percentage={percentage}
              donorCount={donorCount}
              daysRemaining={daysRemaining}
              isEndingSoon={isEndingSoon}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
