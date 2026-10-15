'use client';

import React, { useEffect, useState, useRef } from 'react';

interface StatsCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  formatNumber?: boolean;
}

export default function StatsCounter({
  value,
  duration = 1800,
  prefix = '',
  suffix = '',
  label,
  sublabel,
  icon,
  formatNumber = true,
}: StatsCounterProps) {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let frameId: number;

    const startAnimation = () => {
      const startTime = performance.now();
      const endVal = Number(value) || 0;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * endVal);

        setCount(currentVal);

        if (progress < 1) {
          frameId = requestAnimationFrame(animate);
        } else {
          setCount(endVal);
        }
      };

      frameId = requestAnimationFrame(animate);
    };

    if (counterRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            startAnimation();
          }
        },
        { threshold: 0.15 }
      );

      observer.observe(counterRef.current);
    } else {
      startAnimation();
    }

    return () => {
      if (observer) observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, duration, hasAnimated]);

  const displayValue = formatNumber
    ? new Intl.NumberFormat('en-IN').format(count)
    : count;

  return (
    <div
      ref={counterRef}
      className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shadow-md"
    >
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 text-cyan-400 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline">
          {prefix && <span className="text-cyan-400 mr-0.5">{prefix}</span>}
          <span>{displayValue}</span>
          {suffix && <span className="text-cyan-400 ml-0.5">{suffix}</span>}
        </div>
        <div className="text-xs sm:text-sm font-medium text-slate-300">{label}</div>
        {sublabel && <div className="text-[11px] text-slate-400">{sublabel}</div>}
      </div>
    </div>
  );
}
