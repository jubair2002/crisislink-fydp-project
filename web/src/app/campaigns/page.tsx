import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CampaignCard } from '@/components/CampaignCard';
import { EmptyState } from '@/components/EmptyState';

export const metadata: Metadata = {
  title: 'Relief Campaigns — CrisisLink Network',
  description:
    'Browse active and completed relief campaigns across Bangladesh. Every taka is tracked transparently from donor to beneficiary.',
};

export const revalidate = 30;

interface CampaignsPageProps {
  searchParams: Promise<{
    status?: string;
    sort?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const sortOption = params.sort || 'newest';
  const searchQuery = (params.q || '').trim();
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = 12;

  const supabase = createServiceClient();

  let query = supabase.from('campaigns').select('*', { count: 'exact' });

  if (statusFilter === 'active') {
    query = query.eq('status', 'active');
  } else if (statusFilter === 'completed') {
    query = query.neq('status', 'active');
  }

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
  }

  if (sortOption === 'most_funded') {
    query = query.order('collected_amount', { ascending: false });
  } else if (sortOption === 'ending_soon') {
    query = query.order('end_date', { ascending: true, nullsFirst: false });
  } else if (sortOption === 'goal_amount') {
    query = query.order('target_amount', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: campaigns, count } = await query;
  const totalCampaigns = count || 0;
  const totalPages = Math.ceil(totalCampaigns / pageSize);

  const statusTabs = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  const sortOptions = [
    { label: 'Newest', value: 'newest' },
    { label: 'Most Funded', value: 'most_funded' },
    { label: 'Ending Soon', value: 'ending_soon' },
    { label: 'Goal Amount', value: 'goal_amount' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Relief Campaigns
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Support emergency relief operations across Bangladesh. All funds are itemized and verified.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {statusTabs.map((tab) => {
              const isSelected = statusFilter === tab.value;
              const newParams = new URLSearchParams();
              if (tab.value !== 'all') newParams.set('status', tab.value);
              if (sortOption !== 'newest') newParams.set('sort', sortOption);
              if (searchQuery) newParams.set('q', searchQuery);

              return (
                <Link
                  key={tab.value}
                  href={`/campaigns${newParams.toString() ? `?${newParams.toString()}` : ''}`}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-3">
            <form method="GET" action="/campaigns" className="relative w-48 sm:w-60">
              {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
              {sortOption !== 'newest' && <input type="hidden" name="sort" value={sortOption} />}
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </form>

            <div className="flex items-center gap-1">
              {sortOptions.map((opt) => {
                const isSelected = sortOption === opt.value;
                const newParams = new URLSearchParams();
                if (statusFilter !== 'all') newParams.set('status', statusFilter);
                if (opt.value !== 'newest') newParams.set('sort', opt.value);
                if (searchQuery) newParams.set('q', searchQuery);

                return (
                  <Link
                    key={opt.value}
                    href={`/campaigns${newParams.toString() ? `?${newParams.toString()}` : ''}`}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Campaign Grid */}
        {!campaigns || campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns found"
            description="There are currently no relief campaigns matching your search filters."
            actionText="Clear Filters"
            actionHref="/campaigns"
          />
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((camp: any) => (
                <CampaignCard key={camp.id} campaign={camp} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10 pt-6 border-t border-slate-200">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const newParams = new URLSearchParams();
                  if (statusFilter !== 'all') newParams.set('status', statusFilter);
                  if (sortOption !== 'newest') newParams.set('sort', sortOption);
                  if (searchQuery) newParams.set('q', searchQuery);
                  newParams.set('page', String(pageNum));

                  const isCurrent = pageNum === currentPage;
                  return (
                    <Link
                      key={pageNum}
                      href={`/campaigns?${newParams.toString()}`}
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition ${
                        isCurrent
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
