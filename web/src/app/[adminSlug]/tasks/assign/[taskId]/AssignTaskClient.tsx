'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { assignVolunteersToTaskAction } from '../../../_actions/adminActions';
import type { TaskRow, VolunteerCandidate } from '@/types/admin';

export default function AssignTaskClient({
  slug,
  task,
  candidates,
  reassign,
}: {
  slug: string;
  task: TaskRow;
  candidates: VolunteerCandidate[];
  reassign: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = useMemo(() => new Set(selected), [selected]);

  const submit = () =>
    startTransition(async () => {
      try {
        await assignVolunteersToTaskAction(task.id, selected, { reassign, overrideAuto: true });
        toast.success('Volunteers assigned and notified');
        router.push(`/${slug}/tasks`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Assignment failed');
      }
    });

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/${slug}/tasks`} className="text-sm text-brand hover:underline">Back to tasks</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Assign volunteers</h1>
        <p className="text-sm text-ink-muted mt-1">Sorted by distance, rating, and skills match.</p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <p className="text-sm"><span className="font-medium">Task:</span> {task.help_type ?? 'General'} · {task.priority ?? '—'} priority</p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-ink-muted"><tr><th className="px-3 py-2">Pick</th><th className="px-3 py-2">Volunteer</th><th className="px-3 py-2">Distance</th><th className="px-3 py-2">Rating</th><th className="px-3 py-2">Skills match</th><th className="px-3 py-2">Skills</th></tr></thead>
          <tbody className="divide-y divide-surface-border">
            {candidates.map((c) => (
              <tr key={c.userId}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={chosen.has(c.userId)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.userId] : s.filter((x) => x !== c.userId)))}
                  />
                </td>
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.distanceKm != null ? `${c.distanceKm.toFixed(1)} km` : '—'}</td>
                <td className="px-3 py-2">{c.rating.toFixed(1)}</td>
                <td className="px-3 py-2">{c.skillMatch ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{c.skills.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={pending || selected.length === 0} onClick={submit}>
          Assign selected volunteers
        </button>
      </div>
    </div>
  );
}
