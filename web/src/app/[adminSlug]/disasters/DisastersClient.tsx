'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  addOfficialDisasterUpdateAction,
  deleteDisasterAction,
  markDisasterFalseReportAction,
  markDisasterResolvedAction,
  updateDisasterSeverityAction,
  verifyDisasterAction,
} from '../_actions/adminActions';
import { AdminModal } from '../_components/AdminModal';
import { buildNavHref } from '@/lib/nav';
import type { DisasterFilters, DisasterRow } from '@/types/admin';

function buildQuery(slug: string, filters: DisasterFilters) {
  const p = new URLSearchParams();
  if (filters.type) p.set('type', filters.type);
  if (filters.severity) p.set('severity', filters.severity);
  if (filters.status) p.set('status', filters.status);
  if (filters.dateFrom) p.set('from', filters.dateFrom);
  if (filters.dateTo) p.set('to', filters.dateTo);
  if (filters.sortBy) p.set('sortBy', filters.sortBy);
  if (filters.sortDir) p.set('sortDir', filters.sortDir);
  const qs = p.toString();
  const path = buildNavHref(slug, '/disasters');
  return qs ? `${path}?${qs}` : path;
}

export default function DisastersClient({
  slug,
  rows,
  filters,
}: {
  slug: string;
  rows: DisasterRow[];
  filters: DisasterFilters;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<DisasterRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DisasterRow | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [draft, setDraft] = useState({
    type: filters.type ?? '',
    severity: filters.severity ?? '',
    status: filters.status ?? '',
    from: filters.dateFrom ?? '',
    to: filters.dateTo ?? '',
    sortBy: filters.sortBy ?? 'created_at',
    sortDir: filters.sortDir ?? 'desc',
  });

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        toast.success('Updated');
        location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });
  };

  const applyHref = useMemo(
    () =>
      buildQuery(slug, {
        type: draft.type || undefined,
        severity: draft.severity || undefined,
        status: draft.status || undefined,
        dateFrom: draft.from || undefined,
        dateTo: draft.to || undefined,
        sortBy: draft.sortBy as DisasterFilters['sortBy'],
        sortDir: draft.sortDir as DisasterFilters['sortDir'],
      }),
    [draft, slug],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Disaster Monitor</h1>
        <p className="text-sm text-ink-muted mt-1">{rows.length.toLocaleString()} disasters in current result set.</p>
      </header>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-7">
          <input className="rounded-lg border border-surface-border px-3 py-2 text-sm" placeholder="Type" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} />
          <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" value={draft.severity} onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}>
            <option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
          <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
            <option value="">All statuses</option><option value="reported">Reported</option><option value="verified">Verified</option><option value="false_report">False report</option><option value="resolved">Resolved</option>
          </select>
          <input type="date" className="rounded-lg border border-surface-border px-3 py-2 text-sm" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          <input type="date" className="rounded-lg border border-surface-border px-3 py-2 text-sm" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" value={draft.sortBy} onChange={(e) => setDraft((d) => ({ ...d, sortBy: e.target.value as 'created_at' | 'severity' | 'status' }))}>
            <option value="created_at">Sort: Date</option><option value="severity">Sort: Severity</option><option value="status">Sort: Status</option>
          </select>
          <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" value={draft.sortDir} onChange={(e) => setDraft((d) => ({ ...d, sortDir: e.target.value as 'asc' | 'desc' }))}>
            <option value="desc">Desc</option><option value="asc">Asc</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={applyHref} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Apply</Link>
          <Link href={buildNavHref(slug, '/disasters')} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium">Reset</Link>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reporter</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/60">
                  <td className="px-3 py-2">{row.disaster_type ?? '—'}</td>
                  <td className="px-3 py-2">{row.location_label ?? '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border border-surface-border px-2 py-1 text-xs"
                      value={row.severity ?? 'medium'}
                      onChange={(e) => run(() => updateDisasterSeverityAction(row.id, e.target.value))}
                      disabled={pending}
                    >
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 capitalize">{row.status ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.reporter_user_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-3 py-2">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button className="rounded border border-surface-border px-2 py-1 text-xs" onClick={() => setSelected(row)}>View</button>
                      <button className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs" onClick={() => run(() => verifyDisasterAction(row.id))} disabled={pending}>Verify</button>
                      <button className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs" onClick={() => run(() => markDisasterFalseReportAction(row.id))} disabled={pending}>False</button>
                      <button className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs" onClick={() => run(() => markDisasterResolvedAction(row.id))} disabled={pending}>Resolved</button>
                      <button
                        className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-900"
                        disabled={pending}
                        onClick={() => setDeleteTarget(row)}
                      >
                        Delete
                      </button>
                      <Link href={`/${slug}/disasters/${row.id}`} className="rounded border border-surface-border px-2 py-1 text-xs">Detail</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal open={!!selected} title="Disaster details" onClose={() => setSelected(null)} wide>
        {selected && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Type:</span> {selected.disaster_type ?? '—'}</p>
            <p><span className="font-medium">Location:</span> {selected.location_label ?? '—'}</p>
            <p><span className="font-medium">Status:</span> {selected.status ?? '—'}</p>
            <p><span className="font-medium">Description:</span> {selected.description ?? '—'}</p>
            <textarea className="w-full min-h-[100px] rounded-lg border border-surface-border px-3 py-2" placeholder="Add official update..." value={updateText} onChange={(e) => setUpdateText(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border border-surface-border px-4 py-2 text-sm" onClick={() => setSelected(null)}>Close</button>
              <button
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await addOfficialDisasterUpdateAction(selected.id, updateText);
                    setUpdateText('');
                  })
                }
              >
                Add official update
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        title="Delete disaster"
        onClose={() => setDeleteTarget(null)}
      >
        {deleteTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-ink-muted">
              This will permanently delete the disaster and related media, updates, tasks, assignments, and linked records.
            </p>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
              <p className="font-medium">{deleteTarget.disaster_type ?? 'Disaster'}</p>
              <p className="text-xs">{deleteTarget.location_label ?? 'Unknown location'}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-lg border border-surface-border px-4 py-2 text-sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await deleteDisasterAction(deleteTarget.id);
                    setDeleteTarget(null);
                  })
                }
              >
                Delete permanently
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
