import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import CampaignCard from '@/components/CampaignCard';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getCampaignsList } from '@/lib/publicService';

export const metadata: Metadata = {
  title: 'Active Relief Campaigns · CrisisLink Network',
  description:
    'Browse verified relief fundraising campaigns in Bangladesh. Direct aid, verified field updates, and transparent tracking.',
};

interface CampaignsPageProps {
  searchParams: Promise<{
    tab?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = await searchParams;
  const currentTab = params.tab || 'all';
  const currentSort = params.sort || 'newest';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));

  const { campaigns, total, totalPages, page } = await getCampaignsList({
    tab: currentTab,
    sortBy: currentSort,
    page: currentPage,
    pageSize: 12,
  });

  const tabs = [
    { key: 'all', label: 'All Campaigns' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  const sortOptions = [
    { key: 'newest', label: 'Newest' },
    { key: 'most_funded', label: 'Most Funded' },
    { key: 'ending_soon', label: 'Ending Soon' },
    { key: 'goal_amount', label: 'Goal Amount' },
  ];

  const buildUrl = (overrides: { tab?: string; sort?: string; page?: number }) => {
    const p = new URLSearchParams();
    const t = overrides.tab !== undefined ? overrides.tab : currentTab;
    const s = overrides.sort !== undefined ? overrides.sort : currentSort;
    const pg = overrides.page !== undefined ? overrides.page : 1;

    if (t && t !== 'all') p.set('tab', t);
    if (s && s !== 'newest') p.set('sort', s);
    if (pg > 1) p.set('page', String(pg));

    const qs = p.toString();
    return qs ? `/campaigns?${qs}` : '/campaigns';
  };

  return (
    <PublicShell>
      {/* Page Header */}
      <section className="bg-gradient-to-b from-[#0F172A] to-slate-900 text-white py-12 lg:py-16 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold mb-4">
              <HeartHandshake className="w-4 h-4" />
              <span>Transparent Humanitarian Relief</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Relief Campaigns
            </h1>
            <p className="mt-3 text-base text-slate-300 leading-relaxed max-w-2xl">
              Support on-ground emergency missions across Bangladesh. Every donation is assigned a
              unique tracking receipt with full operational transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200">
            {/* Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/70 overflow-x-auto">
              {tabs.map((tab) => {
                const isActive = currentTab === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={buildUrl({ tab: tab.key, page: 1 })}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* Sort Dropdown / Links */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
                {sortOptions.map((opt) => {
                  const isActive = currentSort === opt.key;
                  return (
                    <Link
                      key={opt.key}
                      href={buildUrl({ sort: opt.key, page: 1 })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid: 3 cols (desktop), 2 cols (tablet), 1 col (mobile) */}
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading relief campaigns..." />}>
            {campaigns.length === 0 ? (
              <EmptyState
                icon={HeartHandshake}
                title="No campaigns found"
                description={`There are currently no campaigns matching the "${currentTab}" filter. Try switching tabs to view other relief operations.`}
                actionText="View All Campaigns"
                actionHref="/campaigns"
              />
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {campaigns.map((camp) => (
                    <CampaignCard key={camp.id} campaign={camp} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Showing page <strong className="text-slate-900">{page}</strong> of{' '}
                      <strong className="text-slate-900">{totalPages}</strong> ({total} campaigns)
                    </p>

                    <div className="flex items-center gap-2">
                      {page > 1 ? (
                        <Link
                          href={buildUrl({ page: page - 1 })}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-300 cursor-not-allowed">
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </span>
                      )}

                      {page < totalPages ? (
                        <Link
                          href={buildUrl({ page: page + 1 })}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-300 cursor-not-allowed">
                          <span>Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Suspense>
        </div>
      </section>
    </PublicShell>
  );
}
