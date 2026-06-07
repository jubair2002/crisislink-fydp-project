import { getReports } from '@/lib/adminService';
import type { ReportFilters } from '@/types/admin';
import ReportsClient from './ReportsClient';

export const metadata = { title: 'Issue Management · CrisisLink Admin' };

function pick(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const filters: ReportFilters = {
    report_type: (pick(sp, 'type') as ReportFilters['report_type']) ?? '',
    status: (pick(sp, 'status') as ReportFilters['status']) ?? '',
    dateFrom: pick(sp, 'from'),
    dateTo: pick(sp, 'to'),
    search: pick(sp, 'q'),
    sortBy: (pick(sp, 'sortBy') as ReportFilters['sortBy']) ?? 'created_at',
    sortDir: (pick(sp, 'sortDir') as ReportFilters['sortDir']) ?? 'desc',
  };
  const rows = await getReports(filters);
  return <ReportsClient slug={adminSlug} rows={rows} filters={filters} />;
}
