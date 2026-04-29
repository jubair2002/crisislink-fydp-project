'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TaskMonitorMap = dynamic(() => import('../../_components/TaskMonitorMap'), { ssr: false });

type Point = {
  taskId: string;
  taskLabel: string;
  status: string;
  taskLat: number;
  taskLng: number;
  volunteerName: string;
  volunteerLat: number | null;
  volunteerLng: number | null;
};

export default function TaskMonitorClient({ slug, points }: { slug: string; points: Point[] }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(timer);
  }, [router]);

  const pipeline = {
    requested: points.filter((p) => p.status === 'requested').length,
    assigned: points.filter((p) => p.status === 'assigned').length,
    inProgress: points.filter((p) => p.status === 'in_progress').length,
    completed: points.filter((p) => p.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-Time Task Monitor</h1>
          <p className="text-sm text-ink-muted mt-1">Live volunteer and task positions (auto refresh every 30 seconds).</p>
        </div>
        <Link href={`/${slug}/tasks`} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium">Back to tasks</Link>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat title="Requested" value={pipeline.requested} />
        <Stat title="Assigned" value={pipeline.assigned} />
        <Stat title="In Progress" value={pipeline.inProgress} />
        <Stat title="Completed" value={pipeline.completed} />
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-3">
        <TaskMonitorMap points={points} />
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
      <p className="text-xs uppercase text-ink-muted">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
