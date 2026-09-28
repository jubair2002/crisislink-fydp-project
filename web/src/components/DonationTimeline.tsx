import React from 'react';
import Image from 'next/image';
import { Check, Clock } from 'lucide-react';

export interface TrackingStepData {
  step: 1 | 2 | 3 | 4;
  title: string;
  isCompleted: boolean;
  timestamp?: string | null;
  description?: string | null;
  proofUrl?: string | null;
  amount?: number | null;
}

interface DonationTimelineProps {
  steps: TrackingStepData[];
  className?: string;
}

export function DonationTimeline({ steps, className = '' }: DonationTimelineProps) {
  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Subtle line */}
      <div className="absolute left-[11px] top-2.5 bottom-2.5 w-px bg-slate-200" />

      {steps.map((item, idx) => {
        const isDone = item.isCompleted;

        return (
          <div key={idx} className="relative">
            {/* Step marker */}
            <div
              className={`absolute -left-[23px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                isDone
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 border border-slate-300 text-slate-400'
              }`}
            >
              {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : item.step}
            </div>

            {/* Step content */}
            <div className={`p-4 rounded-xl border ${isDone ? 'bg-white border-slate-200' : 'bg-slate-50/60 border-slate-200/60'}`}>
              <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                <h4 className={`text-sm font-semibold ${isDone ? 'text-slate-900' : 'text-slate-500'}`}>
                  {item.title}
                </h4>

                {item.timestamp && (
                  <span className="text-xs text-slate-400">
                    {new Date(item.timestamp).toLocaleDateString('en-BD', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {item.description && (
                <p className={`text-xs leading-relaxed ${isDone ? 'text-slate-600' : 'text-slate-400'}`}>
                  {item.description}
                </p>
              )}

              {item.proofUrl && isDone && (
                <div className="mt-3 relative h-40 w-full sm:w-64 rounded-lg overflow-hidden border border-slate-200">
                  <Image
                    src={item.proofUrl}
                    alt="Field proof verification"
                    fill
                    sizes="(max-width: 640px) 100vw, 250px"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
