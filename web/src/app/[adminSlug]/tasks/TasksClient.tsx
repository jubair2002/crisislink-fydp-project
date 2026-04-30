'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import toast from 'react-hot-toast';
import { approveTaskCompletionAction } from '../_actions/adminActions';
import { buildNavHref } from '@/lib/nav';
import type { TaskFilters, TaskRow } from '@/types/admin';

function buildQuery(slug: string, f: TaskFilters) {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.assignmentMode) p.set('mode', f.assignmentMode);
  if (f.priority) p.set('priority', f.priority);
  const qs = p.toString();
  const path = buildNavHref(slug, '/tasks');
  return qs ? `${path}?${qs}` : path;
}

export default function TasksClient({
  slug,
  rows,
  filters,
}: {
  slug: string;
  rows: Array<TaskRow & { disasterLabel: string; assignedCount: number }>;
  filters: TaskFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const applyHref = useMemo(() => buildQuery(slug, filters), [slug, filters]);
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
        toast.success('Updated');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
          <p className="text-sm text-ink-muted mt-1">Review, assign, and approve system tasks.</p>
        </div>
        <Link href={`/${slug}/tasks/monitor`} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium">Live monitor</Link>
      </header>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4 flex flex-wrap gap-3">
        <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" defaultValue={filters.status ?? ''} onChange={(e) => router.push(buildQuery(slug, { ...filters, status: e.target.value || undefined }))}>
          <option value="">All statuses</option><option value="requested">Requested</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
        </select>
        <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" defaultValue={filters.assignmentMode ?? ''} onChange={(e) => router.push(buildQuery(slug, { ...filters, assignmentMode: e.target.value || undefined }))}>
          <option value="">All modes</option><option value="auto">Auto</option><option value="admin">Admin</option>
        </select>
        <select className="rounded-lg border border-surface-border px-3 py-2 text-sm" defaultValue={filters.priority ?? ''} onChange={(e) => router.push(buildQuery(slug, { ...filters, priority: e.target.value || undefined }))}>
          <option value="">All priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <Link href={applyHref} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Apply</Link>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm text-left">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Task type</th>
                <th className="px-4 py-3 font-medium">Disaster</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Assigned volunteers</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/60 align-top">
                  <td className="px-4 py-3">{row.help_type ?? 'General task'}</td>
                  <td className="px-4 py-3">{row.disasterLabel}</td>
                  <td className="px-4 py-3 capitalize">{row.priority ?? '—'}</td>
                  <td className="px-4 py-3">{row.assignedCount}</td>
                  <td className="px-4 py-3 capitalize">{row.status ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Link href={`/${slug}/tasks/assign/${row.id}`} className="rounded border border-surface-border px-2 py-1 text-xs">Assign volunteer</Link>
                      <Link href={`/${slug}/tasks/assign/${row.id}?override=1`} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs">Override auto</Link>
                      <button className="rounded border border-surface-border px-2 py-1 text-xs" onClick={() => router.push(`/${slug}/tasks/assign/${row.id}?reassign=1`)}>Reassign</button>
                      <button className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs" disabled={pending} onClick={() => run(() => approveTaskCompletionAction(row.id))}>Approve completion</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
