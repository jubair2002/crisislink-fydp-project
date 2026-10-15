import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Plus,
} from 'lucide-react';
import { getCitizenReports } from '@/lib/citizenService';

export const metadata: Metadata = {
  title: 'My Reports · CrisisLink Citizen',
  description: 'View your submitted disaster reports and field verification status.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return 'recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function CitizenReportsPage() {
  const reports = await getCitizenReports();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">My Incident Reports</h1>
          <p className="text-xs text-ink-muted">
            Track verification progress and assigned response units for your reported incidents.
          </p>
        </div>

        <Link
          href="/citizen/report"
          className="px-3.5 py-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report Disaster</span>
        </Link>
      </div>

      {/* Reports Table (Admin style) */}
      <div className="rounded-lg bg-surface border border-surface-border shadow-card overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted space-y-3">
            <p className="font-medium text-ink">No incident reports filed yet</p>
            <p>Your reports immediately notify regional volunteer responders.</p>
            <Link
              href="/citizen/report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand/90 transition shadow-card"
            >
              <span>File a Report</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/60 text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-muted/50 transition">
                    <td className="py-3 px-4 font-semibold capitalize text-ink">
                      {r.disaster_type}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                        {r.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink truncate max-w-xs">
                      {r.location_label || 'Coordinates only'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand">
                        {r.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-muted">{formatTimeAgo(r.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/disasters/${r.id}`}
                        className="px-2.5 py-1 rounded-md border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
