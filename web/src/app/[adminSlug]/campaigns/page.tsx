import { getCampaigns } from '@/lib/adminService';
import type { CampaignFilters } from '@/types/admin';
import CampaignsClient from './CampaignsClient';

export const metadata = { title: 'Campaign Management · CrisisLink Admin' };

function pick(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const filters: CampaignFilters = {
    status: pick(sp, 'status'),
    search: pick(sp, 'q'),
    sortBy: (pick(sp, 'sortBy') as CampaignFilters['sortBy']) ?? 'start_date',
    sortDir: (pick(sp, 'sortDir') as CampaignFilters['sortDir']) ?? 'desc',
  };
  const rows = await getCampaigns(filters);
  return <CampaignsClient slug={adminSlug} rows={rows} filters={filters} />;
}
