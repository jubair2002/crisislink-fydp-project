'use client';

import { useMemo } from 'react';

export interface TaskMonitorPoint {
  taskId: string;
  taskLabel: string;
  taskLat: number;
  taskLng: number;
  volunteerName: string;
  volunteerLat: number | null;
  volunteerLng: number | null;
}

export default function TaskMonitorMap({ points }: { points: TaskMonitorPoint[] }) {
  const normalized = useMemo(() => {
    if (points.length === 0) return [];
    const lats = points.flatMap((p) => [p.taskLat, ...(p.volunteerLat != null ? [p.volunteerLat] : [])]);
    const lngs = points.flatMap((p) => [p.taskLng, ...(p.volunteerLng != null ? [p.volunteerLng] : [])]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = Math.max(0.0001, maxLat - minLat);
    const lngRange = Math.max(0.0001, maxLng - minLng);
    return points.map((p) => ({
      ...p,
      taskX: ((p.taskLng - minLng) / lngRange) * 100,
      taskY: ((maxLat - p.taskLat) / latRange) * 100,
      volX: p.volunteerLng != null ? ((p.volunteerLng - minLng) / lngRange) * 100 : null,
      volY: p.volunteerLat != null ? ((maxLat - p.volunteerLat) / latRange) * 100 : null,
    }));
  }, [points]);

  return (
    <div className="h-[520px] w-full rounded-xl bg-slate-100 border border-surface-border relative overflow-hidden">
      {normalized.map((p) => (
        <div key={p.taskId}>
          <div
            className="absolute h-3 w-3 rounded-full bg-amber-500 border border-amber-700 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.taskX}%`, top: `${p.taskY}%` }}
            title={`Task: ${p.taskLabel}`}
          />
          {p.volX != null && p.volY != null && (
            <div
              className="absolute h-3 w-3 rounded-full bg-blue-500 border border-blue-700 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.volX}%`, top: `${p.volY}%` }}
              title={`Volunteer: ${p.volunteerName}`}
            />
          )}
        </div>
      ))}
      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs text-ink-muted">
        Task nodes (amber), volunteers (blue)
      </div>
    </div>
  );
}
