import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Receipt,
  HeartHandshake,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { getCitizenDonations } from '@/lib/citizenService';

export const metadata: Metadata = {
  title: 'My Donations · CrisisLink Citizen',
  description: 'View your humanitarian contribution receipts and verification tracking.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface UserDonation {
  id: string;
  donation_code: string | null;
  amount: number;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string | null;
  campaigns?: {
    id: string;
    title: string | null;
    media_url: string | null;
  } | null;
}

export default async function CitizenDonationsPage() {
  const rawDonations = await getCitizenDonations();
  const donations = (rawDonations || []) as unknown as UserDonation[];

  const totalAmount = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalCampaigns = new Set(donations.map((d) => d.campaigns?.id).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">My Donations & Receipts</h1>
          <p className="text-xs text-ink-muted">
            Track your humanitarian contributions and monitor transparency receipts.
          </p>
        </div>

        <Link
          href="/citizen/campaigns"
          className="px-3.5 py-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center gap-1.5 self-start sm:self-auto"
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Support Campaigns</span>
        </Link>
      </div>

      {/* Metric Cards (Admin Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Total Donated
            </p>
            <p className="text-xl font-bold text-ink">৳{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Contributions
            </p>
            <p className="text-xl font-bold text-ink">{donations.length} receipts</p>
          </div>
        </div>

        <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Campaigns
            </p>
            <p className="text-xl font-bold text-ink">{totalCampaigns} supported</p>
          </div>
        </div>
      </div>

      {/* Donations Table (Admin style) */}
      <div className="rounded-lg bg-surface border border-surface-border shadow-card overflow-hidden">
        {donations.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted space-y-3">
            <p className="font-medium text-ink">No donations found</p>
            <p>You have not made any donations yet under your citizen account.</p>
            <Link
              href="/citizen/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand/90 transition shadow-card"
            >
              <span>Explore Campaigns</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/60 text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {donations.map((d) => {
                  const code = d.donation_code || d.id.slice(0, 8).toUpperCase();
                  const dateStr = d.created_at
                    ? new Date(d.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recent';

                  return (
                    <tr key={d.id} className="hover:bg-surface-muted/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-brand">
                        <Link
                          href={`/track?id=${encodeURIComponent(code)}`}
                          className="hover:underline inline-flex items-center gap-1"
                        >
                          <span>{code}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">
                        {d.campaigns?.title || 'Emergency Disaster Relief Fund'}
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">
                        ৳{Number(d.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                          {d.payment_status || 'completed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{dateStr}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/track?id=${encodeURIComponent(code)}`}
                          className="px-2.5 py-1 rounded-md border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition"
                        >
                          Track
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
