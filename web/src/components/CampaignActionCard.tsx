'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Share2, Check, ArrowRight, HeartHandshake, ShieldCheck, Clock, Users } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

interface CampaignActionCardProps {
  campaignId: string;
  collectedAmount: number;
  goalAmount: number;
  donorCount: number;
  daysRemaining: number | null;
  status: string;
}

export default function CampaignActionCard({
  campaignId,
  collectedAmount,
  goalAmount,
  donorCount,
  daysRemaining,
  status,
}: CampaignActionCardProps) {
  const [copied, setCopied] = useState(false);

  const percentage = goalAmount > 0 ? Math.min(100, Math.round((collectedAmount / goalAmount) * 100)) : 0;
  const isEndingSoon = daysRemaining !== null && daysRemaining < 7;
  const isCompleted = (status || '').toLowerCase() === 'completed';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // SVG Circular Gauge calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-7 border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6">
      {/* Top circular % progress + collected sum */}
      <div className="flex items-center gap-5">
        {/* Circular Progress Gauge */}
        <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-100"
              strokeWidth="9"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-blue-600 transition-all duration-1000 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-900 tracking-tight">{percentage}%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Funded</span>
          </div>
        </div>

        {/* Numbers */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Raised so far</span>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ৳{new Intl.NumberFormat('en-IN').format(collectedAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Goal: <strong className="text-slate-700">৳{new Intl.NumberFormat('en-IN').format(goalAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Thick Progress Bar */}
      <div>
        <ProgressBar value={collectedAmount} max={goalAmount || 100} size="lg" color="gradient" />
      </div>

      {/* Meta indicators: Donors count & Days remaining */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-black text-slate-900">{donorCount}</div>
            <div className="text-[11px] text-slate-400 font-medium">Verified Donors</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <Clock className={`w-4 h-4 flex-shrink-0 ${isEndingSoon ? 'text-rose-500' : 'text-cyan-600'}`} />
          <div>
            <div className={`text-sm font-black ${isEndingSoon ? 'text-rose-600' : 'text-slate-900'}`}>
              {daysRemaining !== null ? (daysRemaining === 0 ? 'Ends Today' : `${daysRemaining} days`) : 'Ongoing'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Time Left</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Link
          href={`/campaigns/${campaignId}/donate`}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition duration-200 hover:-translate-y-0.5"
        >
          <HeartHandshake className="w-5 h-5 text-white" />
          <span>Donate Now</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>

        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Campaign Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>Copy Campaign Link</span>
            </>
          )}
        </button>
      </div>

      {/* Trust pill */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>100% auditable via digital donation code</span>
      </div>
    </div>
  );
}
