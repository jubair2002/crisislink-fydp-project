'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, HeartHandshake, ArrowRight, ShieldCheck } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

export interface CampaignCardData {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  media_url?: string | null;
  collected_amount?: number | null;
  goal_amount?: number | null;
  target_amount?: number | null;
  status?: string | null;
  end_date?: string | null;
  start_date?: string | null;
}

interface CampaignCardProps {
  campaign: CampaignCardData;
  className?: string;
}

export default function CampaignCard({ campaign, className = '' }: CampaignCardProps) {
  const [imageError, setImageError] = useState(false);

  const collected = Number(campaign.collected_amount) || 0;
  const goal = Number(campaign.goal_amount) || Number(campaign.target_amount) || 0;
  const percentage = goal > 0 ? Math.min(100, Math.round((collected / goal) * 100)) : 0;

  // Days remaining calculation
  let daysRemaining: number | null = null;
  if (campaign.end_date) {
    const end = new Date(campaign.end_date).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? diff : 0;
  }

  const isEndingSoon = daysRemaining !== null && daysRemaining < 7;
  const isCompleted = (campaign.status || '').toLowerCase() === 'completed' || (daysRemaining === 0 && goal > 0 && collected >= goal);

  const formattedCollected = new Intl.NumberFormat('en-IN').format(collected);
  const formattedGoal = new Intl.NumberFormat('en-IN').format(goal);

  return (
    <div
      className={`group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${className}`}
    >
      {/* Media Banner */}
      <div className="relative h-52 w-full overflow-hidden bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-800">
        {campaign.media_url && !imageError ? (
          <Image
            src={campaign.media_url}
            alt={campaign.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-6 text-white text-center">
            <HeartHandshake className="w-12 h-12 text-cyan-300 mb-2 opacity-80" />
            <span className="text-xs font-semibold tracking-wider uppercase text-cyan-200">
              Relief Mission
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
              isCompleted
                ? 'bg-emerald-500/90 text-white'
                : 'bg-blue-600/90 text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isCompleted ? 'Completed' : 'Active Relief'}
          </span>
        </div>

        {/* Days remaining badge */}
        {daysRemaining !== null && (
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${
                isEndingSoon
                  ? 'bg-rose-600/95 text-white animate-pulse'
                  : 'bg-black/60 text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              {daysRemaining === 0 ? 'Ends Today' : `${daysRemaining}d left`}
            </span>
          </div>
        )}

        {/* Location pill */}
        {campaign.location && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-xs text-white/95 font-medium truncate drop-shadow">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">{campaign.location}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Title - 2 lines max */}
          <Link href={`/campaigns/${campaign.id}`} className="group-hover:text-blue-600 transition">
            <h3 className="font-bold text-slate-900 text-lg leading-snug line-clamp-2 mb-2">
              {campaign.title}
            </h3>
          </Link>

          {/* Description - 2 lines max */}
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {campaign.description || 'Emergency support and essential aid distribution for affected families.'}
          </p>
        </div>

        <div>
          {/* Progress Section */}
          <div className="mb-3">
            <div className="flex justify-between items-baseline mb-1.5">
              <div>
                <span className="text-base font-extrabold text-slate-900">৳{formattedCollected}</span>
                <span className="text-xs text-slate-400 ml-1">of ৳{formattedGoal}</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700">
                {percentage}%
              </span>
            </div>
            <ProgressBar value={collected} max={goal || 100} size="md" color="gradient" />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="inline-flex items-center justify-center py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              View Details
            </Link>
            <Link
              href={`/campaigns/${campaign.id}/donate`}
              className="inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm hover:shadow"
            >
              <span>Donate Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
