'use client';

import { useEffect, useState } from 'react';

const POLL_MS = 4000;

export default function PendingVolunteerBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch('/api/admin/pending-volunteers-count', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { count?: number };
        if (!cancelled) setCount(typeof body.count === 'number' ? body.count : 0);
      } catch {
        /* ignore */
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (count === null || count === 0) return null;

  return (
    <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-accent text-white text-[10px] font-bold grid place-items-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}
