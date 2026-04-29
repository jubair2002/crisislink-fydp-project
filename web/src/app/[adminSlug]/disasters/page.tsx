import { getDisasters } from '@/lib/adminService';
import type { DisasterFilters } from '@/types/admin';
import DisastersClient from './DisastersClient';

export const metadata = { title: 'Disaster Monitoring · CrisisLink Admin' };

function pick(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function DisastersPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const filters: DisasterFilters = {
    type: pick(sp, 'type'),
    severity: pick(sp, 'severity'),
    status: pick(sp, 'status'),
    dateFrom: pick(sp, 'from'),
    dateTo: pick(sp, 'to'),
    sortBy: (pick(sp, 'sortBy') as DisasterFilters['sortBy']) ?? 'created_at',
    sortDir: (pick(sp, 'sortDir') as DisasterFilters['sortDir']) ?? 'desc',
  };
  const rows = await getDisasters(filters);
  return <DisastersClient slug={adminSlug} rows={rows} filters={filters} />;
}
