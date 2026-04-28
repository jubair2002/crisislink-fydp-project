'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  approveVolunteerAction,
  getVolunteerTasksAndLogsAction,
  rejectVolunteerAction,
  suspendVolunteerAction,
} from '../_actions/adminActions';
import { AdminModal } from '../_components/AdminModal';
import { buildNavHref } from '@/lib/nav';
import {
  AVAILABILITY_LABELS,
  SKILL_LABELS,
  formatAvailability,
  formatSkill,
  formatVerification,
} from '@/lib/volunteerMeta';
import type {
  AdminLogRow,
  PaginatedVolunteers,
  TaskAssignmentRow,
  VolunteerListFilters,
  VolunteerListRow,
} from '@/types/admin';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const SKILL_OPTIONS = Object.keys(SKILL_LABELS);

function buildVolunteerQuery(slug: string, base: VolunteerListFilters, page: number): string {
  const p = new URLSearchParams();
  if (base.verificationStatus) p.set('v', base.verificationStatus);
  if (base.skill) p.set('skill', base.skill);
  if (base.availability) p.set('avail', base.availability);
  if (page > 1) p.set('page', String(page));
  const qs = p.toString();
  const path = buildNavHref(slug, '/volunteers');
  return qs ? `${path}?${qs}` : path;
}

function statusBadgeClass(status: string | null | undefined) {
  const s = status ?? '';
  if (s === 'pending') return 'bg-amber-100 text-amber-900';
  if (s === 'approved') return 'bg-emerald-100 text-emerald-900';
  if (s === 'rejected') return 'bg-red-100 text-red-900';
  if (s === 'suspended') return 'bg-slate-200 text-slate-900';
  return 'bg-slate-100 text-slate-800';
}

type ReasonMode = 'reject' | 'suspend' | null;

export default function VolunteersClient({
  slug,
  data,
  filters,
}: {
  slug: string;
  data: PaginatedVolunteers;
  filters: VolunteerListFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [profileRow, setProfileRow] = useState<VolunteerListRow | null>(null);
  const [tasksOpen, setTasksOpen] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState<string | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [assignments, setAssignments] = useState<TaskAssignmentRow[]>([]);
  const [auditLog, setAuditLog] = useState<AdminLogRow[]>([]);

  const [reasonMode, setReasonMode] = useState<ReasonMode>(null);
  const [reasonTarget, setReasonTarget] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');

  const [draft, setDraft] = useState({
    v: filters.verificationStatus ?? '',
    skill: filters.skill ?? '',
    avail: filters.availability ?? '',
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const applyHref = useMemo(() => {
    const f: VolunteerListFilters = {
      verificationStatus: draft.v || undefined,
      skill: draft.skill || undefined,
      availability: draft.avail || undefined,
    };
    return buildVolunteerQuery(slug, f, 1);
  }, [draft, slug]);

  const run = async (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        toast.success('Updated');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });
  };

  const loadTasksLogs = async (volunteerId: string) => {
    setTasksLoading(true);
    try {
      const res = await getVolunteerTasksAndLogsAction(volunteerId);
      setAssignments(res.assignments);
      setAuditLog(res.auditLog);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setTasksLoading(false);
    }
  };

  const openTasks = (id: string) => {
    setTasksOpen(id);
    setAssignments([]);
    void loadTasksLogs(id);
  };

  const openLogs = (id: string) => {
    setLogsOpen(id);
    setAuditLog([]);
    void loadTasksLogs(id);
  };

  const submitReason = () => {
    if (!reasonTarget || !reasonMode) return;
    const body = reasonText.trim();
    if (!body) {
      toast.error('Please enter a reason.');
      return;
    }
    const id = reasonTarget;
    const mode = reasonMode;
    setReasonMode(null);
    setReasonTarget(null);
    setReasonText('');
    if (mode === 'reject') void run(() => rejectVolunteerAction(id, body));
    if (mode === 'suspend') void run(() => suspendVolunteerAction(id, body));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Volunteer Management</h1>
        <p className="text-sm text-ink-muted mt-1">
          Pending applicants are listed first. {data.total.toLocaleString()} volunteers match filters.
        </p>
      </header>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Verification</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.v}
              onChange={(e) => setDraft((d) => ({ ...d, v: e.target.value }))}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Skill</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.skill}
              onChange={(e) => setDraft((d) => ({ ...d, skill: e.target.value }))}
            >
              <option value="">Any skill</option>
              {SKILL_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SKILL_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Availability</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={draft.avail}
              onChange={(e) => setDraft((d) => ({ ...d, avail: e.target.value }))}
            >
              <option value="">Any</option>
              {Object.entries(AVAILABILITY_LABELS).map(([k, lab]) => (
                <option key={k} value={k}>
                  {lab}
                </option>
              ))}
            </select>
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
            href={buildNavHref(slug, '/volunteers')}
            className="inline-flex items-center justify-center rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            Reset
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Skills</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 font-medium">Tasks</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-muted">
                    No volunteers match these filters.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3 font-medium text-ink">
                      <Link
                        href={`/${slug}/volunteers/${row.id}`}
                        className="text-brand hover:underline"
                      >
                        {row.profile?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{row.profile?.email ?? '—'}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="flex flex-wrap gap-1">
                        {(row.skills ?? []).slice(0, 5).map((s) => (
                          <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-800">
                            {formatSkill(s)}
                          </span>
                        ))}
                        {(row.skills?.length ?? 0) > 5 && (
                          <span className="text-[10px] text-ink-muted">+{row.skills!.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.verification_status)}`}
                      >
                        {formatVerification(row.verification_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{row.tasks_completed ?? 0}</td>
                    <td className="px-4 py-3">{Number(row.rating ?? 0).toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setProfileRow(row)}
                          className="rounded-md border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                        >
                          Profile
                        </button>
                        <Link
                          href={`/${slug}/volunteers/${row.id}`}
                          className="rounded-md border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-muted inline-block"
                        >
                          Open
                        </Link>
                        {row.verification_status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                if (!window.confirm('Approve this volunteer?')) return;
                                void run(() => approveVolunteerAction(row.id));
                              }}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                setReasonTarget(row.id);
                                setReasonMode('reject');
                                setReasonText('');
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {row.verification_status === 'approved' && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setReasonTarget(row.id);
                              setReasonMode('suspend');
                              setReasonText('');
                            }}
                            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openTasks(row.id)}
                          className="rounded-md border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                        >
                          Tasks
                        </button>
                        <button
                          type="button"
                          onClick={() => openLogs(row.id)}
                          className="rounded-md border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
                        >
                          Log
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                href={buildVolunteerQuery(slug, filters, Math.max(1, data.page - 1))}
                className={`inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium ${
                  data.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface-muted'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Link>
              <Link
                href={buildVolunteerQuery(slug, filters, Math.min(totalPages, data.page + 1))}
                className={`inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium ${
                  data.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface-muted'
                }`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <AdminModal
        open={!!profileRow}
        title="Volunteer profile"
        onClose={() => setProfileRow(null)}
        wide
      >
        {profileRow && (
          <div className="space-y-4 text-sm">
            <dl className="grid sm:grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-ink-muted">Name</dt>
                <dd className="font-medium">{profileRow.profile?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="break-all">{profileRow.profile?.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">City / Phone</dt>
                <dd>
                  {profileRow.profile?.city ?? '—'} · {profileRow.profile?.phone ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Verification</dt>
                <dd className="font-medium">{formatVerification(profileRow.verification_status)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Availability</dt>
                <dd>{formatAvailability(profileRow.availability)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Volunteer type</dt>
                <dd className="capitalize">{profileRow.volunteer_type ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Organization</dt>
                <dd>{profileRow.organization ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Experience</dt>
                <dd>
                  {profileRow.has_previous_experience
                    ? `${profileRow.years_of_experience ?? 0} yrs`
                    : 'None listed'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-ink-muted mb-1">Skills</dt>
                <dd className="flex flex-wrap gap-1">
                  {(profileRow.skills ?? []).map((s) => (
                    <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {formatSkill(s)}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3 text-xs">
              <DocLink href={profileRow.national_id_url} label="National ID" />
              <DocLink href={profileRow.volunteer_cert_url} label="Certificate" />
              <DocLink href={profileRow.org_proof_url} label="Org proof" />
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={!!tasksOpen}
        title="Assigned tasks"
        onClose={() => setTasksOpen(null)}
        wide
      >
        {tasksLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-ink-muted">No task assignments for this volunteer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-muted border-b border-surface-border">
                  <th className="py-2 pr-3">Assignment</th>
                  <th className="py-2 pr-3">Task help</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Task status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 capitalize">{a.status ?? '—'}</td>
                    <td className="py-2 pr-3">{a.tasks?.help_type ?? '—'}</td>
                    <td className="py-2 pr-3">{a.tasks?.priority ?? '—'}</td>
                    <td className="py-2 pr-3">{a.tasks?.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminModal>

      <AdminModal open={!!logsOpen} title="Admin activity" onClose={() => setLogsOpen(null)} wide>
        {tasksLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : auditLog.length === 0 ? (
          <p className="text-sm text-ink-muted">No admin actions logged for this volunteer yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {auditLog.map((log) => (
              <li key={log.id} className="border-b border-surface-border pb-2">
                <p className="font-medium text-ink">{log.action}</p>
                <p className="text-xs text-ink-muted">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                </p>
                {log.details?.reason != null && (
                  <p className="text-xs mt-1 text-ink-muted">Reason: {String(log.details.reason)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminModal>

      <AdminModal
        open={reasonMode !== null}
        title={reasonMode === 'suspend' ? 'Suspend volunteer' : 'Reject application'}
        onClose={() => {
          setReasonMode(null);
          setReasonTarget(null);
          setReasonText('');
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            This reason is stored in the audit log and sent to the volunteer via notification.
          </p>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Enter a clear reason…"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-surface-border px-4 py-2 text-sm"
              onClick={() => {
                setReasonMode(null);
                setReasonTarget(null);
                setReasonText('');
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

function DocLink({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return <span className="text-ink-muted">{label}: —</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-brand hover:underline"
    >
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
}
