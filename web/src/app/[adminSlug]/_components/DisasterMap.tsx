'use client';

import { useMemo } from 'react';

export interface DisasterMapPoint {
  id: string;
  type: string;
  location: string;
  severity: string;
  status: string;
  lat: number;
  lng: number;
}

export default function DisasterMap({
  points,
  activeId,
}: {
  points: DisasterMapPoint[];
  activeId?: string | null;
}) {
  const normalized = useMemo(() => {
    if (points.length === 0) return [];
    const minLat = Math.min(...points.map((p) => p.lat));
    const maxLat = Math.max(...points.map((p) => p.lat));
    const minLng = Math.min(...points.map((p) => p.lng));
    const maxLng = Math.max(...points.map((p) => p.lng));
    const latRange = Math.max(0.0001, maxLat - minLat);
    const lngRange = Math.max(0.0001, maxLng - minLng);
    return points.map((p) => ({
      ...p,
      x: ((p.lng - minLng) / lngRange) * 100,
      y: ((maxLat - p.lat) / latRange) * 100,
    }));
  }, [points]);

  return (
    <div className="h-[560px] w-full rounded-xl bg-slate-100 border border-surface-border relative overflow-hidden">
      {normalized.map((p) => (
        <div
          key={p.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
            activeId === p.id ? 'h-4 w-4 bg-red-500 border-red-700' : 'h-3 w-3 bg-brand border-blue-800'
          }`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          title={`${p.type} · ${p.location} · ${p.status}`}
        />
      ))}
      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs text-ink-muted">
        Coordinate map view ({points.length} markers)
      </div>
    </div>
  );
}
