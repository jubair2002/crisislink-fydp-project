import Link from 'next/link';
import {
  HandCoins,
  HeartHandshake,
  Megaphone,
  Siren,
  Users,
  FileText,
} from 'lucide-react';
import MetricCard from './_components/MetricCard';
import DashboardCharts from './_components/DashboardCharts';
import { fetchDashboardData } from '@/lib/dashboardMetrics';
import { buildNavHref } from '@/lib/nav';

export const metadata = { title: 'Dashboard · CrisisLink Admin' };

// Always render fresh data on each request — admins expect live numbers.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const numberFmt = new Intl.NumberFormat();
const currencyFmt = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ adminSlug: string }>;
}) {
  const { adminSlug } = await params;
  const { summary, signupsLast30Days, disastersByTypeThisMonth, volunteersBySkill } =
    await fetchDashboardData();

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Admin workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Overview</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
            A clear view of community activity, disaster response, and fundraising.
          </p>
        </div>
        <p className="text-xs text-ink-muted">
          Updated{' '}
          {new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </header>

      <section aria-label="Platform summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Users"
          value={numberFmt.format(summary.totalUsers)}
          hint="All registered profiles"
          icon={Users}
          tone="brand"
        />
        <MetricCard
          label="Active Volunteers"
          value={numberFmt.format(summary.activeVolunteers)}
          hint="Verification approved"
          icon={HeartHandshake}
          tone="success"
        />
        <MetricCard
          label="Active Disasters"
          value={numberFmt.format(summary.activeDisasters)}
          hint="Not yet resolved"
          icon={Siren}
          tone="danger"
        />
        <MetricCard
          label="Ongoing Campaigns"
          value={numberFmt.format(summary.ongoingCampaigns)}
          hint="Currently fundraising"
          icon={Megaphone}
          tone="secondary"
        />
        <MetricCard
          label="Total Donations"
          value={currencyFmt.format(summary.totalDonations)}
          hint="Sum of collected amounts"
          icon={HandCoins}
          tone="success"
        />
        <Link href={`${buildNavHref(adminSlug, '/reports')}?status=submitted`} className="block hover:opacity-95">
          <MetricCard
            label="Open Issues"
            value={numberFmt.format(summary.pendingReports)}
            hint="Submitted or in review"
            icon={FileText}
            tone="warning"
          />
        </Link>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="activity-heading" className="text-lg font-semibold tracking-tight text-ink">
              Platform activity
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Trends and breakdowns from across CrisisLink.
            </p>
          </div>
        </header>
        <DashboardCharts
          signups={signupsLast30Days}
          disasters={disastersByTypeThisMonth}
          volunteerSkills={volunteersBySkill}
        />
      </section>
    </div>
  );
}
