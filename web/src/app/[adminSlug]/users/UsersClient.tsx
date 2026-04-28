'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  blockUserAction,
  exportUsersCsvAction,
  resetAccountAction,
  unblockUserAction,
  upgradeToVolunteerAction,
} from '../_actions/adminActions';
import { AdminModal } from '../_components/AdminModal';
import { buildNavHref } from '@/lib/nav';
import type { PaginatedUsers, UserListFilters } from '@/types/admin';
import type { Profile, UserRole, AccountStatus } from '@/types/auth';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

const ROLES: UserRole[] = ['citizen', 'volunteer', 'admin', 'authority'];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function buildQuery(slug: string, base: UserListFilters, page: number): string {
  const p = new URLSearchParams();
  if (base.search) p.set('q', base.search);
  if (base.role) p.set('role', base.role);
  if (base.city) p.set('city', base.city);
  if (base.status) p.set('status', base.status);
  if (base.dateFrom) p.set('from', base.dateFrom);
  if (base.dateTo) p.set('to', base.dateTo);
  if (page > 1) p.set('page', String(page));
  const qs = p.toString();
  const path = buildNavHref(slug, '/users');
  return qs ? `${path}?${qs}` : path;
}

export default function UsersClient({
  slug,
  data,
  cities,
  filters,
}: {
  slug: string;
  data: PaginatedUsers;
  cities: string[];
  filters: UserListFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [profileModal, setProfileModal] = useState<Profile | null>(null);

  const [draft, setDraft] = useState({
    q: filters.search ?? '',
    role: filters.role ?? '',
    city: filters.city ?? '',
    status: filters.status ?? '',
    from: filters.dateFrom ?? '',
    to: filters.dateTo ?? '',
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const applyHref = useMemo(() => {
    const f: UserListFilters = {
      search: draft.q.trim() || undefined,
      role: (draft.role as UserListFilters['role']) || '',
      city: draft.city || '',
      status: (draft.status as UserListFilters['status']) || '',
      dateFrom: draft.from || '',
      dateTo: draft.to || '',
    };
    return buildQuery(slug, f, 1);
  }, [draft, slug]);

  const exportCsv = async () => {
    const f: UserListFilters = {
      search: draft.q.trim() || undefined,
      role: (draft.role as UserListFilters['role']) || '',
      city: draft.city || '',
      status: (draft.status as UserListFilters['status']) || '',
      dateFrom: draft.from || '',
      dateTo: draft.to || '',
    };
    try {
      const csv = await exportUsersCsvAction(f);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const run = async (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        toast.success('Saved');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-ink-muted mt-1">
            Search, filter, and moderate accounts. {data.total.toLocaleString()} users match current filters.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-card hover:bg-surface-muted disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </header>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-ink-muted">Search</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                className="w-full rounded-lg border border-surface-border pl-10 pr-3 py-2 text-sm"
                placeholder="Name or email"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              />
            </span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Role</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as UserRole | '' }))}
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">City</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Status</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({ ...d, status: e.target.value as AccountStatus | '' }))
              }
            >
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Joined from</span>
            <input
              type="date"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Joined to</span>
            <input
              type="date"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={applyHref}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-card hover:opacity-95"
          >
            Apply filters
          </Link>
          <Link
            href={buildNavHref(slug, '/users')}
            className="inline-flex items-center justify-center rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            Reset
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[880px]">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-muted">
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => {
                  const status = row.account_status ?? 'active';
                  const isBlocked = status === 'blocked';
                  return (
                    <tr key={row.id} className="hover:bg-surface-muted/60">
                      <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                      <td className="px-4 py-3 text-ink-muted">{row.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-800">
                          {row.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{row.city ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-muted">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                            isBlocked
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setProfileModal(row)}
                            className="rounded-md border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                          >
                            View
                          </button>
                          {isBlocked ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => unblockUserAction(row.user_id))}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => blockUserAction(row.user_id))}
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                            >
                              Block
                            </button>
                          )}
                          {row.role === 'citizen' && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => upgradeToVolunteerAction(row.user_id))}
                              className="rounded-md border border-brand/30 bg-brand/5 px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                            >
                              To volunteer
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(() => resetAccountAction(row.user_id))}
                            className="rounded-md border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
                          >
                            Reset pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-surface-muted/40">
            <p className="text-xs text-ink-muted">
              Page {data.page} of {totalPages} · {data.pageSize} per page
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildQuery(slug, filters, Math.max(1, data.page - 1))}
                className={`inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium ${
                  data.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-muted'
                }`}
                aria-disabled={data.page <= 1}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Link>
              <Link
                href={buildQuery(slug, filters, Math.min(totalPages, data.page + 1))}
                className={`inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium ${
                  data.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface-muted'
                }`}
                aria-disabled={data.page >= totalPages}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <AdminModal open={!!profileModal} title="User profile" onClose={() => setProfileModal(null)} wide>
        {profileModal && (
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-ink-muted text-xs">Name</dt>
              <dd className="font-medium">{profileModal.name}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Email</dt>
              <dd className="font-medium break-all">{profileModal.email}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Role</dt>
              <dd className="capitalize">{profileModal.role}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Status</dt>
              <dd>{profileModal.account_status ?? 'active'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">City</dt>
              <dd>{profileModal.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Phone</dt>
              <dd>{profileModal.phone ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted text-xs">Address</dt>
              <dd>{profileModal.address ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted text-xs">Bio</dt>
              <dd>{profileModal.bio ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">Joined</dt>
              <dd>{formatDate(profileModal.created_at)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">User ID</dt>
              <dd className="font-mono text-xs break-all">{profileModal.user_id}</dd>
            </div>
          </dl>
        )}
      </AdminModal>
    </div>
  );
}
