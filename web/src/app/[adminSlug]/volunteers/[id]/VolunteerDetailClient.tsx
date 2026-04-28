'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  approveVolunteerAction,
  rejectVolunteerAction,
  suspendVolunteerAction,
} from '../../_actions/adminActions';
import { AdminModal } from '../../_components/AdminModal';
import {
  formatAvailability,
  formatSkill,
  formatVerification,
} from '@/lib/volunteerMeta';
import type { VolunteerDetailPayload } from '@/types/admin';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function VolunteerDetailClient({
  slug,
  detail,
  listHref,
}: {
  slug: string;
  detail: VolunteerDetailPayload;
  listHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const vid = detail.volunteer.id;
  const [reasonOpen, setReasonOpen] = useState<'reject' | 'suspend' | null>(null);
  const [reason, setReason] = useState('');

  const { volunteer: v, profile: p, assignments, auditLog } = detail;

  const run = async (fn: () => Promise<void>) => {
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

  const submitReason = () => {
    const body = reason.trim();
    if (!body) {
      toast.error('Reason is required.');
      return;
    }
    const mode = reasonOpen;
    setReasonOpen(null);
    setReason('');
    if (mode === 'reject') void run(() => rejectVolunteerAction(vid, body));
    if (mode === 'suspend') void run(() => suspendVolunteerAction(vid, body));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={listHref}
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to volunteers
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{p?.name ?? 'Volunteer'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Record <span className="font-mono text-xs">{vid}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.verification_status === 'pending' && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm('Approve this volunteer? They will receive a notification.')) return;
                  void run(() => approveVolunteerAction(vid));
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setReasonOpen('reject')}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {v.verification_status === 'approved' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setReasonOpen('suspend')}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            >
              Suspend
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Personal</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="break-all">{p?.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Phone</dt>
                <dd>{p?.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">City</dt>
                <dd>{p?.city ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Address</dt>
                <dd>{p?.address ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Age / Gender</dt>
                <dd>
                  {v.age ?? '—'} · {v.gender ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Availability</dt>
                <dd>{formatAvailability(v.availability)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-ink-muted mb-1">Skills</dt>
                <dd className="flex flex-wrap gap-1">
                  {(v.skills ?? []).map((s) => (
                    <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                      {formatSkill(s)}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Documents</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Doc href={v.national_id_url} label="National ID" />
              </li>
              <li>
                <Doc href={v.volunteer_cert_url} label="Volunteer certificate" />
              </li>
              <li>
                <Doc href={v.org_proof_url} label="Organization proof" />
              </li>
            </ul>
            <p className="text-xs text-ink-muted">
              Files are served from the{' '}
              <code className="rounded bg-surface-muted px-1">volunteer-docs</code> bucket (public URLs).
            </p>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Task history</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-ink-muted">No assignments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-muted border-b border-surface-border text-xs">
                      <th className="py-2 pr-3">Assignment</th>
                      <th className="py-2 pr-3">Help type</th>
                      <th className="py-2 pr-3">Priority</th>
                      <th className="py-2 pr-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 pr-3 capitalize">{a.status ?? '—'}</td>
                        <td className="py-2 pr-3">{a.tasks?.help_type ?? '—'}</td>
                        <td className="py-2 pr-3">{a.tasks?.priority ?? '—'}</td>
                        <td className="py-2 pr-3 text-ink-muted">
                          {a.completed_at
                            ? new Date(a.completed_at).toLocaleString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Status</h2>
            <p className="text-2xl font-bold text-ink">{formatVerification(v.verification_status)}</p>
            <dl className="text-sm space-y-2 text-ink-muted">
              <div className="flex justify-between gap-2">
                <dt>Tasks completed</dt>
                <dd className="font-semibold text-ink">{v.tasks_completed ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Rating</dt>
                <dd className="font-semibold text-ink">{Number(v.rating ?? 0).toFixed(1)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Volunteer type</dt>
                <dd className="font-semibold text-ink capitalize">{v.volunteer_type ?? '—'}</dd>
              </div>
            </dl>
            <Link
              href={`/${slug}/users?q=${encodeURIComponent(p?.email ?? '')}`}
              className="text-xs text-brand hover:underline block"
            >
              Open user in User Management →
            </Link>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Verification timeline</h2>
            {auditLog.length === 0 ? (
              <p className="text-sm text-ink-muted">No review actions recorded yet.</p>
            ) : (
              <ol className="relative border-l border-surface-border ml-2 space-y-4 pl-5">
                {auditLog.map((log) => (
                  <li key={log.id} className="text-sm">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-brand" />
                    <p className="font-medium text-ink">{log.action?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-ink-muted">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                    </p>
                    {log.details?.reason != null && (
                      <p className="text-xs mt-1 text-red-700">Reason: {String(log.details.reason)}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      <AdminModal
        open={reasonOpen !== null}
        title={reasonOpen === 'suspend' ? 'Suspend volunteer' : 'Reject application'}
        onClose={() => {
          setReasonOpen(null);
          setReason('');
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            The volunteer receives an in-app notification with this reason (and you can extend to Expo push
            by wiring device tokens later).
          </p>
          <textarea
            className="w-full min-h-[120px] rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Reason shown to the volunteer…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-surface-border px-4 py-2 text-sm"
              onClick={() => {
                setReasonOpen(null);
                setReason('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={submitReason}
            >
              Confirm
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

function Doc({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return <span className="text-ink-muted">{label}: not uploaded</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand inline-flex items-center gap-1 hover:underline">
      {label} doc <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}
