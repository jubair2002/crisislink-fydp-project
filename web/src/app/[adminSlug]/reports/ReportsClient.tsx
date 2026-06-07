'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buildNavHref } from '@/lib/nav';
import type { ReportFilters, ReportListRow, ReportStatus, ReportType } from '@/types/admin';

const TYPE_LABELS: Record<ReportType, string> = {
  campaign: 'Campaign Issue',
  platform: 'Platform Issue',
  feedback: 'General Feedback',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

function typeBadgeClass(type: ReportType) {
  if (type === 'campaign') return 'bg-amber-100 text-amber-900';
  if (type === 'platform') return 'bg-rose-100 text-rose-900';
  return 'bg-sky-100 text-sky-900';
}

function statusBadgeClass(status: ReportStatus) {
  if (status === 'submitted') return 'bg-slate-100 text-slate-800';
  if (status === 'in_review') return 'bg-sky-100 text-sky-900';
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-900';
  return 'bg-red-100 text-red-900';
}

function buildQuery(slug: string, filters: ReportFilters) {
  const p = new URLSearchParams();
  if (filters.report_type) p.set('type', filters.report_type);
  if (filters.status) p.set('status', filters.status);
  if (filters.dateFrom) p.set('from', filters.dateFrom);
  if (filters.dateTo) p.set('to', filters.dateTo);
  if (filters.search) p.set('q', filters.search);
  if (filters.sortBy) p.set('sortBy', filters.sortBy);
  if (filters.sortDir) p.set('sortDir', filters.sortDir);
  const qs = p.toString();
  const path = buildNavHref(slug, '/reports');
  return qs ? `${path}?${qs}` : path;
}

export default function ReportsClient({
  slug,
  rows,
  filters,
}: {
  slug: string;
  rows: ReportListRow[];
  filters: ReportFilters;
}) {
  const [draft, setDraft] = useState({
    type: filters.report_type ?? '',
    status: filters.status ?? '',
    from: filters.dateFrom ?? '',
    to: filters.dateTo ?? '',
    q: filters.search ?? '',
    sortBy: filters.sortBy ?? 'created_at',
    sortDir: filters.sortDir ?? 'desc',
  });

  const applyHref = useMemo(
    () =>
      buildQuery(slug, {
        report_type: (draft.type as ReportType) || undefined,
        status: (draft.status as ReportStatus) || undefined,
        dateFrom: draft.from || undefined,
        dateTo: draft.to || undefined,
        search: draft.q || undefined,
        sortBy: draft.sortBy as ReportFilters['sortBy'],
        sortDir: draft.sortDir as ReportFilters['sortDir'],
      }),
    [draft, slug],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Issue Management</h1>
        <p className="text-sm text-ink-muted mt-1">
          Campaign issues, platform bugs, and user feedback submitted from the mobile app.
        </p>
      </header>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ReportType | '' }))}
          >
            <option value="">All types</option>
            <option value="campaign">Campaign Issue</option>
            <option value="platform">Platform Issue</option>
            <option value="feedback">General Feedback</option>
          </select>
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ReportStatus | '' }))}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="date"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
          />
          <input
            className="rounded-lg border border-surface-border px-3 py-2 text-sm lg:col-span-2"
            placeholder="Search description…"
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
          />
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.sortBy}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sortBy: e.target.value as NonNullable<ReportFilters['sortBy']>,
              }))
            }
          >
            <option value="created_at">Sort: Date</option>
            <option value="status">Sort: Status</option>
            <option value="report_type">Sort: Type</option>
          </select>
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.sortDir}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sortDir: e.target.value as NonNullable<ReportFilters['sortDir']>,
              }))
            }
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={applyHref} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Apply
          </Link>
          <Link href={buildNavHref(slug, '/reports')} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium">
            Reset
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm text-left">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                    No reports match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-surface-border hover:bg-surface-muted/40">
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${typeBadgeClass(row.report_type)}`}>
                        {TYPE_LABELS[row.report_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="line-clamp-2">{row.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.reporter?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-ink-muted">{row.reporter?.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{row.campaign?.title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={buildNavHref(slug, `/reports/${row.id}`)}
                        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
