'use client';

import React, { useEffect, useState } from 'react';

interface StatsCounterProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

export function StatsCounter({
  value,
  label,
  prefix = '',
  suffix = '',
  durationMs = 1200,
  className = '',
}: StatsCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const endValue = value;

    if (endValue === 0) {
      setDisplayValue(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeProgress * endValue);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, durationMs]);

  return (
    <div className={`flex flex-col text-left ${className}`}>
      <div className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white flex items-baseline gap-0.5">
        {prefix && <span className="text-slate-400 text-xl sm:text-2xl mr-0.5 font-normal">{prefix}</span>}
        <span>{displayValue.toLocaleString('en-IN')}</span>
        {suffix && <span className="text-slate-400 text-xl font-normal ml-0.5">{suffix}</span>}
      </div>
      <div className="text-xs font-normal text-slate-400 mt-1">
        {label}
      </div>
    </div>
  );
}
