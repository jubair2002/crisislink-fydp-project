import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  HeartHandshake,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { getCitizenCampaigns } from '@/lib/citizenService';

export const metadata: Metadata = {
  title: 'Campaigns · CrisisLink Citizen',
  description: 'Support active emergency relief and disaster recovery campaigns across Bangladesh.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CitizenCampaignsPage() {
  const campaigns = await getCitizenCampaigns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Active Relief Campaigns</h1>
          <p className="text-xs text-ink-muted">
            Direct your humanitarian contributions to verified emergency relief operations.
          </p>
        </div>

        <Link
          href="/citizen/donations"
          className="px-3.5 py-2 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-xs font-medium text-ink transition shadow-card flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>View My Donations</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-ink-muted bg-surface rounded-lg border border-surface-border">
            No active relief campaigns at this time.
          </div>
        ) : (
          campaigns.map((campaign) => {
            const target = Number(campaign.target_amount || campaign.goal_amount) || 1;
            const collected = Number(campaign.collected_amount) || 0;
            const progress = Math.min(100, Math.round((collected / target) * 100));

            return (
              <div
                key={campaign.id}
                className="rounded-lg bg-surface border border-surface-border shadow-card overflow-hidden flex flex-col justify-between hover:border-brand/40 transition"
              >
                <div>
                  {campaign.media_url ? (
                    <Link href={`/citizen/campaigns/${campaign.id}`} className="block h-40 w-full overflow-hidden bg-surface-muted group">
                      <img
                        src={campaign.media_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  ) : (
                    <Link href={`/citizen/campaigns/${campaign.id}`} className="block h-28 w-full bg-brand/5 border-b border-surface-border flex items-center justify-center text-brand">
                      <HeartHandshake className="w-8 h-8 opacity-60" />
                    </Link>
                  )}

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{campaign.location || 'Bangladesh'}</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                        {campaign.status || 'Active'}
                      </span>
                    </div>

                    <Link
                      href={`/citizen/campaigns/${campaign.id}`}
                      className="text-sm font-bold text-ink hover:text-brand hover:underline line-clamp-1 block"
                    >
                      {campaign.title}
                    </Link>

                    {campaign.description && (
                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                        {campaign.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-ink">
                          ৳{collected.toLocaleString()}
                        </span>
                        <span className="text-ink-muted">Goal: ৳{target.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-right text-ink-muted">{progress}% funded</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <Link
                    href={`/citizen/campaigns/${campaign.id}`}
                    className="py-2 px-3 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition shadow-card text-center"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/citizen/campaigns/${campaign.id}#donate`}
                    className="py-2 px-3 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center justify-center gap-1 text-center"
                  >
                    <span>Donate Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
