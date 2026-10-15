'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Circle, Clock, ExternalLink, Image as ImageIcon, X } from 'lucide-react';

export interface TrackingStep {
  step: 1 | 2 | 3 | 4;
  title: string;
  status: 'done' | 'pending';
  date?: string | null;
  description?: string | null;
  proofUrl?: string | null;
}

interface DonationTimelineProps {
  steps: TrackingStep[];
  className?: string;
}

export default function DonationTimeline({ steps, className = '' }: DonationTimelineProps) {
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const defaultStepNames = [
    'Payment Received',
    'Funds Allocated',
    'Resources Purchased',
    'Distributed to Beneficiaries',
  ];

  const fullSteps: TrackingStep[] = [1, 2, 3, 4].map((stepNum) => {
    const existing = steps.find((s) => s.step === stepNum);
    if (existing) return existing;
    return {
      step: stepNum as 1 | 2 | 3 | 4,
      title: defaultStepNames[stepNum - 1],
      status: 'pending',
    };
  });

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
        {fullSteps.map((step) => {
          const isDone = step.status === 'done';

          return (
            <div key={step.step} className="relative flex items-start gap-4 group">
              {/* Step indicator */}
              <div
                className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-500/20'
                    : 'border-slate-300 bg-white text-slate-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 fill-slate-50" />
                )}
              </div>

              {/* Step content */}
              <div
                className={`flex-1 rounded-xl p-4 transition border ${
                  isDone
                    ? 'bg-white border-slate-200/80 shadow-sm'
                    : 'bg-slate-50/70 border-dashed border-slate-200 opacity-70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Step {step.step}
                    </span>
                    <h4
                      className={`text-sm font-bold ${
                        isDone ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </h4>
                  </div>
                  {step.date ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <Clock className="w-3 h-3" />
                      {new Date(step.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Pending</span>
                  )}
                </div>

                {step.description && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {step.description}
                  </p>
                )}

                {step.proofUrl && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProof(step.proofUrl!)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg transition"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      View Verification Proof
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Proof Modal */}
      {selectedProof && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <h5 className="text-sm font-bold text-slate-900">Verification Proof Photo</h5>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-80 w-full rounded-xl overflow-hidden bg-slate-100">
              <Image
                src={selectedProof}
                alt="Donation verification proof"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
