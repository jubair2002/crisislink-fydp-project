import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Clock,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Building,
} from 'lucide-react';
import { getCampaignDetail } from '@/lib/publicService';
import { getCurrentUser, getCurrentProfile } from '@/lib/auth';

interface CitizenCampaignDetailProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: CitizenCampaignDetailProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getCampaignDetail(id);
  if (!data?.campaign) {
    return { title: 'Campaign Not Found · CrisisLink Citizen' };
  }
  return {
    title: `${data.campaign.title} · CrisisLink Citizen`,
    description: data.campaign.description || 'Emergency disaster relief campaign in Bangladesh.',
  };
}

export default async function CitizenCampaignDetailPage({ params }: CitizenCampaignDetailProps) {
  const { id } = await params;
  const [data, user, profile] = await Promise.all([
    getCampaignDetail(id),
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!data || !data.campaign) {
    notFound();
  }

  const { campaign, updates, resources, donations } = data;

  const collected = Number(campaign.collected_amount) || 0;
  const goal = Number(campaign.goal_amount) || Number(campaign.target_amount) || 1;
  const percentage = Math.min(100, Math.round((collected / goal) * 100));

  let daysRemaining: number | null = null;
  if (campaign.end_date) {
    const end = new Date(campaign.end_date).getTime();
    const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? diff : 0;
  }

  const isCompleted =
    (campaign.status || '').toLowerCase() === 'completed' ||
    (daysRemaining === 0 && collected >= goal);

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/citizen/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Campaigns</span>
        </Link>
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-brand/10 text-brand">
          {campaign.status || 'Active'}
        </span>
      </div>

      {/* Main Grid: Left Details (8 cols) + Right Contribution Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Campaign Banner Image */}
          {campaign.media_url ? (
            <div className="relative h-64 sm:h-80 w-full rounded-lg overflow-hidden bg-surface-muted border border-surface-border shadow-card">
              <img
                src={campaign.media_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex items-center gap-2 text-xs font-medium text-white/90 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{campaign.location || 'Bangladesh'}</span>
                  {daysRemaining !== null && (
                    <>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{daysRemaining === 0 ? 'Ends Today' : `${daysRemaining} days left`}</span>
                    </>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white line-clamp-2">
                  {campaign.title}
                </h1>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-surface border border-surface-border shadow-card">
              <div className="flex items-center gap-2 text-xs font-medium text-ink-muted mb-2">
                <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>{campaign.location || 'Bangladesh'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
                {campaign.title}
              </h1>
            </div>
          )}

          {/* Funding Progress (Clean Admin Dashboard Style) */}
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-3">
            <div className="flex items-baseline justify-between text-xs">
              <div>
                <span className="text-xl font-bold text-ink">৳{collected.toLocaleString()}</span>
                <span className="text-ink-muted ml-1.5 font-normal">raised of ৳{goal.toLocaleString()} goal</span>
              </div>
              <span className="font-bold text-brand">{percentage}% funded</span>
            </div>

            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center border-t border-surface-border text-xs">
              <div className="p-2">
                <p className="text-[11px] text-ink-muted font-medium">Raised</p>
                <p className="text-sm font-bold text-ink">৳{collected.toLocaleString()}</p>
              </div>
              <div className="p-2 border-x border-surface-border">
                <p className="text-[11px] text-ink-muted font-medium">Target</p>
                <p className="text-sm font-bold text-ink">৳{goal.toLocaleString()}</p>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-ink-muted font-medium">Status</p>
                <p className="text-sm font-bold text-ink capitalize">{campaign.status || 'Active'}</p>
              </div>
            </div>
          </div>

          {/* Description & Overview */}
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-3">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Campaign Overview</h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed whitespace-pre-line">
              {campaign.description || 'Emergency support and essential aid distribution for affected families.'}
            </p>
          </div>

          {/* Beneficiary Impact */}
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Humanitarian Protocol</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Every contribution is digitally tracked through CrisisLink Network. Relief deliveries are verified on the ground by authorized field coordinators and logged into our public audit trail with photographic proof of dispatch.
            </p>
          </div>

          {/* Resource Deployment (if any) */}
          {resources.length > 0 && (
            <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-3">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Allocated Field Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resources.map((res) => (
                  <div key={res.id} className="p-3 rounded-lg border border-surface-border bg-surface-muted/50 space-y-1 text-xs">
                    <p className="font-bold text-ink capitalize">{res.resource_type}</p>
                    <p className="text-ink-muted">
                      Distributed: <strong className="text-ink">{res.quantity_distributed || 0}</strong> / {res.quantity_pledged || 0}
                    </p>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                      {res.quantity_distributed >= res.quantity_pledged ? 'Completed' : 'Active Dispatch'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Updates Timeline (if any) */}
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Field Situation Updates</h2>
            {updates.length === 0 ? (
              <p className="text-xs text-ink-muted py-2">
                No formal field situation reports posted yet. Operations are actively monitored.
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-surface-border">
                {updates.map((update) => (
                  <div key={update.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="font-semibold text-ink">{update.title}</span>
                      <span>{update.created_at ? new Date(update.created_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                    <p className="text-ink-muted leading-relaxed">{update.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-Dashboard Contribution Flow */}
        <div id="donate" className="lg:col-span-4 space-y-4 sticky top-20">
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-brand uppercase tracking-wider block">
                Direct Humanitarian Aid
              </span>
              <h3 className="text-base font-bold text-ink mt-0.5">Contribute to This Mission</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Your contribution directly funds emergency relief supplies with full transaction tracking.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-surface-muted border border-surface-border space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Campaign:</span>
                <span className="font-semibold text-ink truncate max-w-[170px]">{campaign.title}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Location:</span>
                <span className="text-ink font-medium">{campaign.location || 'Bangladesh'}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Target:</span>
                <span className="text-ink font-semibold">৳{goal.toLocaleString()}</span>
              </div>
            </div>

            {/* Direct Donation Action Button */}
            <Link
              href={`/campaigns/${campaign.id}/donate`}
              className="w-full py-2.5 px-4 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-semibold shadow-card transition flex items-center justify-center gap-2 text-center"
            >
              <CreditCard className="w-4 h-4" />
              <span>Proceed to Donate (৳)</span>
            </Link>

            <div className="text-[11px] text-ink-muted space-y-1 pt-1 border-t border-surface-border">
              <div className="flex items-center gap-1.5 text-ink-muted">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>Instant cryptographically signed receipt</span>
              </div>
              <div className="flex items-center gap-1.5 text-ink-muted">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>100% auditable via national tracking code</span>
              </div>
            </div>
          </div>

          {/* Recent Backers Card */}
          {donations.length > 0 && (
            <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 space-y-3">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Recent Contributions</h4>
              <div className="space-y-2 text-xs divide-y divide-surface-border">
                {donations.slice(0, 5).map((d) => (
                  <div key={d.id} className="pt-2 first:pt-0 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">
                        {d.anonymous ? 'Anonymous Supporter' : d.donor_name || 'Supporter'}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    <span className="font-bold text-ink">৳{Number(d.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
