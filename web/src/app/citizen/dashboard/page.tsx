import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  LifeBuoy,
  HeartHandshake,
  Search,
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Receipt,
  Compass,
} from 'lucide-react';
import { getCurrentUser, getCurrentProfile } from '@/lib/auth';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { getActiveCampaigns } from '@/lib/publicService';
import type { DisasterRow } from '@/types/admin';

export const metadata: Metadata = {
  title: 'Dashboard · CrisisLink Citizen',
  description: 'Monitor active emergencies, access relief services, and track donations.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return 'recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function CitizenDashboardPage() {
  // Parallelize initial auth and db calls for instant sub-second load time
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

  let db;
  try {
    db = createServiceClient();
  } catch {
    db = await createClient();
  }

  // Parallel database queries
  const [emergencyRes, activeDisastersRes, userDonationsRes, campaigns] = await Promise.all([
    db
      .from('disasters')
      .select('*')
      .eq('status', 'verified')
      .in('severity', ['high', 'critical'])
      .order('created_at', { ascending: false })
      .limit(1),

    db
      .from('disasters')
      .select('*')
      .in('status', ['verified', 'response_in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),

    user?.id
      ? db
          .from('donations')
          .select('id, donation_code, amount, payment_status, created_at, campaigns(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),

    getActiveCampaigns(3),
  ]);

  const emergencyAlert = emergencyRes.data?.[0] as DisasterRow | undefined;
  const activeDisasters = (activeDisastersRes.data || []) as DisasterRow[];
  const userDonations = (userDonationsRes.data || []) as unknown as Array<{
    id: string;
    donation_code: string | null;
    amount: number;
    payment_status: string | null;
    created_at: string | null;
    campaigns?: { title: string | null } | null;
  }>;

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Citizen';

  return (
    <div className="space-y-6">
      {/* Top Banner if Active Emergency exists */}
      {emergencyAlert && (
        <div className="rounded-lg bg-brand-danger/10 border border-brand-danger/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-brand-danger">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Active Emergency Alert</p>
              <p className="text-sm font-semibold">
                {emergencyAlert.disaster_type?.toUpperCase()} reported in{' '}
                {emergencyAlert.location_label || 'Coordinates'}.
              </p>
            </div>
          </div>
          <Link
            href={`/disasters/${emergencyAlert.id}`}
            className="px-3 py-1.5 rounded-lg bg-brand-danger text-white text-xs font-medium hover:bg-brand-danger/90 transition flex items-center gap-1 shrink-0"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Header (Admin Style) */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard Overview</h1>
          <p className="text-sm text-ink-muted">Welcome back, {displayName}. Access emergency aid, monitor alerts, and view donations.</p>
        </div>
        <p className="text-xs text-ink-muted">
          Updated {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
        </p>
      </header>

      {/* 4 Quick Actions (Admin MetricCard Style with square divs) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/citizen/report" className="block hover:opacity-95">
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Report</p>
              <p className="text-sm font-bold text-ink truncate">Report a Disaster</p>
            </div>
          </div>
        </Link>

        <Link href="/citizen/map" className="block hover:opacity-95">
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Explore</p>
              <p className="text-sm font-bold text-ink truncate">Disaster Map</p>
            </div>
          </div>
        </Link>

        <Link href="/citizen/aid-request" className="block hover:opacity-95">
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Relief</p>
              <p className="text-sm font-bold text-ink truncate">Request Aid</p>
            </div>
          </div>
        </Link>

        <Link href="/citizen/campaigns" className="block hover:opacity-95">
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Donate</p>
              <p className="text-sm font-bold text-ink truncate">Relief Campaigns</p>
            </div>
          </div>
        </Link>
      </section>

      {/* Active Disasters Table (Admin Style) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Active Disasters in Progress</h2>
          <Link
            href="/citizen/map"
            className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
          >
            <span>View All on Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-lg bg-surface border border-surface-border shadow-card overflow-hidden">
          {activeDisasters.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              ✓ No active emergency incidents at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/60 text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {activeDisasters.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-muted/50 transition">
                      <td className="py-3 px-4 font-semibold capitalize text-ink">
                        {d.disaster_type}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                          {d.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink truncate max-w-xs">
                        {d.location_label || 'Coordinates on map'}
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{formatTimeAgo(d.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                          {d.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/citizen/map?id=${d.id}`}
                          className="px-2.5 py-1 rounded-md border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Grid: Recent Donations (Left) + Campaigns (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Donations Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">My Recent Donations</h2>
            <Link
              href="/citizen/donations"
              className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-lg bg-surface border border-surface-border shadow-card overflow-hidden">
            {userDonations.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted space-y-2">
                <p>No recent donation records found.</p>
                <Link
                  href="/citizen/campaigns"
                  className="text-brand hover:underline font-medium inline-block"
                >
                  Browse active campaigns &rarr;
                </Link>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/60 text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Tracking Code</th>
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {userDonations.map((d) => {
                    const code = d.donation_code || d.id.slice(0, 8).toUpperCase();
                    return (
                      <tr key={d.id} className="hover:bg-surface-muted/50 transition">
                        <td className="py-3 px-4 font-mono font-medium text-brand">
                          <Link href={`/track?id=${encodeURIComponent(code)}`} className="hover:underline">
                            {code}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-medium text-ink truncate max-w-[140px]">
                          {d.campaigns?.title || 'Relief Fund'}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">
                          ৳{Number(d.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                            {d.payment_status || 'completed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Active Campaigns */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Active Relief Campaigns</h2>
            <Link
              href="/citizen/campaigns"
              className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {campaigns.map((c) => {
              const target = Number(c.target_amount || c.goal_amount) || 1;
              const collected = Number(c.collected_amount) || 0;
              const pct = Math.min(100, Math.round((collected / target) * 100));

              return (
                <div
                  key={c.id}
                  className="rounded-lg bg-surface border border-surface-border shadow-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand/40 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/citizen/campaigns/${c.id}`}
                      className="text-xs font-bold text-ink hover:text-brand hover:underline truncate block"
                    >
                      {c.title}
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                      <span>৳{collected.toLocaleString()}</span>
                      <span>/</span>
                      <span>৳{target.toLocaleString()}</span>
                      <span>({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Link
                      href={`/citizen/campaigns/${c.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition shadow-card"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/citizen/campaigns/${c.id}#donate`}
                      className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card"
                    >
                      Donate
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
