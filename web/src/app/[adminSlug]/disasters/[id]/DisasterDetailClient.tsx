'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  deleteDisasterAction,
  markDisasterFalseReportAction,
  markDisasterResolvedAction,
  verifyDisasterAction,
} from '../../_actions/adminActions';
import { AdminModal } from '../../_components/AdminModal';
import type { DisasterDetailPayload } from '@/types/admin';

export default function DisasterDetailClient({
  slug,
  payload,
}: {
  slug: string;
  payload: DisasterDetailPayload;
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const d = payload.disaster;
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
        toast.success('Updated');
        location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={`/${slug}/disasters`} className="text-sm text-brand hover:underline">Back to monitor</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{d.disaster_type ?? 'Disaster'} detail</h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm" disabled={pending} onClick={() => run(() => verifyDisasterAction(d.id))}>Verify</button>
          <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm" disabled={pending} onClick={() => run(() => markDisasterFalseReportAction(d.id))}>False report</button>
          <button className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm" disabled={pending} onClick={() => run(() => markDisasterResolvedAction(d.id))}>Resolved</button>
          <button
            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900"
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <section className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-surface-border bg-surface shadow-card p-4 space-y-2 text-sm">
          <p><span className="font-medium">Location:</span> {d.location_label ?? '—'}</p>
          <p><span className="font-medium">Severity:</span> {d.severity ?? '—'}</p>
          <p><span className="font-medium">Status:</span> {d.status ?? '—'}</p>
          <p><span className="font-medium">Reporter:</span> {payload.reporter?.name ?? 'Unknown'} ({payload.reporter?.email ?? '—'})</p>
          <p><span className="font-medium">Verifier:</span> {payload.verifier?.name ?? '—'}</p>
          <p><span className="font-medium">Description:</span> {d.description ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
          <h2 className="font-semibold">Resource requests</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {payload.resourceRequests.length === 0 ? <li className="text-ink-muted">No requests.</li> : payload.resourceRequests.map((r) => <li key={r.id}>{r.requested_item ?? 'Resource'} · {r.quantity ?? 0} · {r.status ?? 'pending'}</li>)}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <h2 className="font-semibold">Media (photos/videos)</h2>
        <div className="mt-3 grid md:grid-cols-3 gap-3">
          {payload.media.length === 0 ? <p className="text-sm text-ink-muted">No media attached.</p> : payload.media.map((m) => (
            <div key={m.id} className="rounded border border-surface-border p-2">
              {m.media_type === 'video' ? <video controls className="w-full h-40 object-cover" src={m.public_url ?? undefined} /> : <img src={m.public_url ?? ''} alt="Disaster media" className="w-full h-40 object-cover" />}
            </div>
          ))}
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
          <h2 className="font-semibold">Update timeline</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {payload.updates.map((u) => (
              <li key={u.id} className="border-b border-surface-border pb-2">
                <p>{u.body_text}</p>
                <p className="text-xs text-ink-muted">{new Date(u.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
          <h2 className="font-semibold">Volunteer verification records</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {payload.verificationRecords.length === 0 ? <li className="text-ink-muted">No verification records.</li> : payload.verificationRecords.map((v) => <li key={v.id}>{v.volunteer_id.slice(0, 8)} · {v.status ?? 'pending'} · {v.notes ?? '—'}</li>)}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <h2 className="font-semibold">Assigned tasks</h2>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left border-b border-surface-border"><th className="py-2">Task</th><th className="py-2">Priority</th><th className="py-2">Status</th></tr></thead>
          <tbody>{payload.tasks.map((t) => <tr key={t.id}><td className="py-2">{t.help_type ?? 'Task'}</td><td>{t.priority ?? '—'}</td><td>{t.status ?? '—'}</td></tr>)}</tbody>
        </table>
      </section>

      <AdminModal open={deleteOpen} title="Delete disaster" onClose={() => setDeleteOpen(false)}>
        <div className="space-y-3 text-sm">
          <p className="text-ink-muted">
            This will permanently delete this disaster and all related records/files. This action cannot be undone.
          </p>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
            <p className="font-medium">{d.disaster_type ?? 'Disaster'}</p>
            <p className="text-xs">{d.location_label ?? 'Unknown location'}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="rounded-lg border border-surface-border px-4 py-2 text-sm"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await deleteDisasterAction(d.id);
                  location.assign(`/${slug}/disasters`);
                })
              }
            >
              Delete permanently
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
