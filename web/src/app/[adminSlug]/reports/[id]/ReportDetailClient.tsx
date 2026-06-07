'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  addReportResponseAction,
  updateReportStatusAction,
} from '../../_actions/adminActions';
import { AdminModal } from '../../_components/AdminModal';
import type { ReportDetailPayload, ReportStatus, ReportType } from '@/types/admin';

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

export default function ReportDetailClient({
  slug,
  payload,
}: {
  slug: string;
  payload: ReportDetailPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const r = payload.report;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${slug}/reports`} className="text-sm text-brand hover:underline">
            Back to issue management
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{TYPE_LABELS[r.report_type]}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Submitted {new Date(r.created_at).toLocaleString()} · Status: {STATUS_LABELS[r.status]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status !== 'in_review' && r.status !== 'resolved' && r.status !== 'rejected' ? (
            <button
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm"
              disabled={pending}
              onClick={() =>
                run(() => updateReportStatusAction(r.id, 'in_review', 'Report is being reviewed.'))
              }
            >
              Mark in review
            </button>
          ) : null}
          {r.status !== 'resolved' ? (
            <button
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"
              disabled={pending}
              onClick={() => setResolveOpen(true)}
            >
              Resolve
            </button>
          ) : null}
          {r.status !== 'rejected' && r.status !== 'resolved' ? (
            <button
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm"
              disabled={pending}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </button>
          ) : null}
        </div>
      </div>

      <section className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-surface-border bg-surface shadow-card p-4 space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{r.description}</p>
          {r.image_url ? (
            <img
              src={r.image_url}
              alt="Report attachment"
              className="rounded-lg border border-surface-border max-h-80 object-cover"
            />
          ) : null}
          {r.location_label ? (
            <p>
              <span className="font-medium">Location:</span> {r.location_label}
            </p>
          ) : null}
          {r.campaign ? (
            <p>
              <span className="font-medium">Campaign:</span>{' '}
              <Link href={`/${slug}/campaigns/${r.campaign.id}`} className="text-brand hover:underline">
                {r.campaign.title}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4 space-y-2 text-sm">
          <h2 className="font-semibold">Reporter</h2>
          <p>{r.reporter?.name ?? 'Unknown'}</p>
          <p className="text-ink-muted">{r.reporter?.email ?? '—'}</p>
          <p className="text-ink-muted">{r.reporter?.city ?? '—'}</p>
          {r.status === 'resolved' && r.resolution_message ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-medium text-emerald-900">Resolution</p>
              <p className="mt-1 text-emerald-900/90">{r.resolution_message}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
          <h2 className="font-semibold">Status timeline</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {payload.statusEvents.length === 0 ? (
              <li className="text-ink-muted">No timeline events.</li>
            ) : (
              payload.statusEvents.map((ev) => (
                <li key={ev.id} className="border-b border-surface-border pb-2">
                  <p className="font-medium">{STATUS_LABELS[ev.status as ReportStatus] ?? ev.status}</p>
                  {ev.note ? <p className="text-ink-muted">{ev.note}</p> : null}
                  <p className="text-xs text-ink-muted mt-1">{new Date(ev.created_at).toLocaleString()}</p>
                </li>
              ))
            )}
          </ol>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
          <h2 className="font-semibold">Responses</h2>
          <div className="mt-3 space-y-3 text-sm">
            {payload.responses.length === 0 ? (
              <p className="text-ink-muted">No responses yet.</p>
            ) : (
              payload.responses.map((res) => (
                <div key={res.id} className="rounded-lg border border-surface-border bg-surface-muted/50 p-3">
                  <p className="font-medium">{res.responder?.name ?? 'Support'}</p>
                  <p className="text-xs text-ink-muted mb-1">{new Date(res.created_at).toLocaleString()}</p>
                  <p>{res.message}</p>
                </div>
              ))
            )}
          </div>
          {r.status !== 'resolved' && r.status !== 'rejected' ? (
            <div className="mt-4 space-y-2">
              <textarea
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[90px]"
                placeholder="Write a response to the reporter…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={pending || !reply.trim()}
                onClick={() =>
                  run(async () => {
                    await addReportResponseAction(r.id, reply.trim());
                    setReply('');
                  })
                }
              >
                Send response
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <AdminModal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve report">
        <p className="text-sm text-ink-muted mb-3">Add a resolution message for the reporter.</p>
        <textarea
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[100px]"
          value={resolutionText}
          onChange={(e) => setResolutionText(e.target.value)}
          placeholder="Explain how this was resolved…"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-lg border border-surface-border px-4 py-2 text-sm" onClick={() => setResolveOpen(false)}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await updateReportStatusAction(
                  r.id,
                  'resolved',
                  resolutionText.trim() || 'Your report has been resolved.',
                );
                setResolveOpen(false);
                setResolutionText('');
              })
            }
          >
            Confirm resolve
          </button>
        </div>
      </AdminModal>

      <AdminModal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject report">
        <p className="text-sm text-ink-muted mb-3">Optionally explain why this report is being closed.</p>
        <textarea
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[100px]"
          value={resolutionText}
          onChange={(e) => setResolutionText(e.target.value)}
          placeholder="Reason for rejection…"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-lg border border-surface-border px-4 py-2 text-sm" onClick={() => setRejectOpen(false)}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await updateReportStatusAction(
                  r.id,
                  'rejected',
                  resolutionText.trim() || 'Your report was reviewed and closed.',
                );
                setRejectOpen(false);
                setResolutionText('');
              })
            }
          >
            Confirm reject
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
