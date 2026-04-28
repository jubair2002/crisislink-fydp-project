import { getAllVolunteers } from '@/lib/adminService';
import type { VolunteerListFilters } from '@/types/admin';
import VolunteersClient from './VolunteersClient';

export const metadata = { title: 'Volunteer Management · CrisisLink Admin' };

function pick(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function VolunteersPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(pick(sp, 'page') ?? '1', 10) || 1);

  const filters: VolunteerListFilters = {
    verificationStatus: pick(sp, 'v') || undefined,
    skill: pick(sp, 'skill') || undefined,
    availability: pick(sp, 'avail') || undefined,
  };

  const data = await getAllVolunteers(filters, page, 20);

  return <VolunteersClient slug={adminSlug} data={data} filters={filters} />;
}
