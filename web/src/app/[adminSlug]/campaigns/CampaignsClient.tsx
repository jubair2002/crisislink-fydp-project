'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { createCampaignAction, updateCampaignStatusAction } from '../_actions/adminActions';
import { AdminModal } from '../_components/AdminModal';
import { buildNavHref } from '@/lib/nav';
import type { CampaignFilters, CampaignRow } from '@/types/admin';

function buildQuery(slug: string, filters: CampaignFilters) {
  const p = new URLSearchParams();
  if (filters.status) p.set('status', filters.status);
  if (filters.search) p.set('q', filters.search);
  if (filters.sortBy) p.set('sortBy', filters.sortBy);
  if (filters.sortDir) p.set('sortDir', filters.sortDir);
  const qs = p.toString();
  const path = buildNavHref(slug, '/campaigns');
  return qs ? `${path}?${qs}` : path;
}

function pct(c: CampaignRow) {
  const target = Math.max(1, Number(c.target_amount ?? 1));
  return Math.min(100, Math.round((Number(c.collected_amount ?? 0) / target) * 100));
}

export default function CampaignsClient({
  slug,
  rows,
  filters,
}: {
  slug: string;
  rows: CampaignRow[];
  filters: CampaignFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    status: filters.status ?? '',
    search: filters.search ?? '',
    sortBy: filters.sortBy ?? 'start_date',
    sortDir: filters.sortDir ?? 'desc',
  });
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    target_amount: '',
    end_date: '',
    media_url: '',
  });

  const applyHref = useMemo(
    () =>
      buildQuery(slug, {
        status: draft.status || undefined,
        search: draft.search || undefined,
        sortBy: draft.sortBy as CampaignFilters['sortBy'],
        sortDir: draft.sortDir as CampaignFilters['sortDir'],
      }),
    [draft, slug],
  );

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        toast.success('Saved');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });
  };

  const handleCreate = () => {
    const amount = Number(form.target_amount);
    if (!form.title.trim() || !amount) {
      toast.error('Title and target amount are required.');
      return;
    }
    run(async () => {
      const id = await createCampaignAction({
        title: form.title,
        description: form.description,
        location: form.location,
        target_amount: amount,
        end_date: form.end_date || null,
        media_url: form.media_url || null,
      });
      setCreateOpen(false);
      setForm({ title: '', description: '', location: '', target_amount: '', end_date: '', media_url: '' });
      router.push(buildNavHref(slug, `/campaigns/${id}`));
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-sm text-ink-muted mt-1">
            Create, monitor, and close fundraising campaigns tied to active disasters.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          onClick={() => setCreateOpen(true)}
        >
          New campaign
        </button>
      </header>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Search title"
            value={draft.search}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
          />
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.sortBy}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sortBy: e.target.value as 'start_date' | 'end_date' | 'collected_amount',
              }))
            }
          >
            <option value="start_date">Sort: Start date</option>
            <option value="end_date">Sort: End date</option>
            <option value="collected_amount">Sort: Collected</option>
          </select>
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.sortDir}
            onChange={(e) => setDraft((d) => ({ ...d, sortDir: e.target.value as 'asc' | 'desc' }))}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={applyHref} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Apply
          </Link>
          <Link href={buildNavHref(slug, '/campaigns')} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium">
            Reset
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm text-left">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">End date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/60 align-top">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-ink-muted mb-1">{pct(row)}%</div>
                    <div className="h-2 w-32 rounded bg-surface-muted overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${pct(row)}%` }} />
                    </div>
                    <div className="text-xs mt-1">
                      ৳{Number(row.collected_amount ?? 0).toLocaleString()} / ৳
                      {Number(row.target_amount ?? 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded border border-surface-border px-2 py-1 text-xs capitalize"
                      value={row.status ?? 'active'}
                      onChange={(e) => run(() => updateCampaignStatusAction(row.id, e.target.value))}
                      disabled={pending}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{row.end_date ? new Date(row.end_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={buildNavHref(slug, `/campaigns/${row.id}`)}
                      className="rounded border border-surface-border px-2 py-1 text-xs"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    No campaigns yet. Create one to start fundraising.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal open={createOpen} title="Create campaign" onClose={() => setCreateOpen(false)} wide>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Campaign title *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[80px]"
            placeholder="Description / beneficiary info"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
          <input
            type="number"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Target amount (BDT) *"
            value={form.target_amount}
            onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))}
          />
          <input
            type="date"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Cover image URL (optional)"
            value={form.media_url}
            onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))}
          />
          <button
            type="button"
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={handleCreate}
            disabled={pending}
          >
            Create campaign
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
