import { getAllUsers, getDistinctProfileCities } from '@/lib/adminService';
import type { UserListFilters } from '@/types/admin';
import type { UserRole } from '@/types/auth';
import UsersClient from './UsersClient';

export const metadata = { title: 'User Management · CrisisLink Admin' };

function pick(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(pick(sp, 'page') ?? '1', 10) || 1);

  const filters: UserListFilters = {
    search: pick(sp, 'q'),
    role: (pick(sp, 'role') as UserRole | '') || '',
    city: pick(sp, 'city') || '',
    status: (pick(sp, 'status') as UserListFilters['status']) || '',
    dateFrom: pick(sp, 'from') || undefined,
    dateTo: pick(sp, 'to') || undefined,
  };

  const [data, cities] = await Promise.all([
    getAllUsers(filters, page, 20),
    getDistinctProfileCities(),
  ]);

  return <UsersClient slug={adminSlug} data={data} cities={cities} filters={filters} />;
}
