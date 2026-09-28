import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

export interface CampaignCardData {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  target_amount?: number | null;
  collected_amount?: number | null;
  goal_amount?: number | null;
  end_date?: string | null;
  status?: string | null;
  media_url?: string | null;
}

interface CampaignCardProps {
  campaign: CampaignCardData;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const goal = Number(campaign.goal_amount || campaign.target_amount || 0);
  const collected = Number(campaign.collected_amount || 0);
  const percentage = goal > 0 ? Math.min(Math.round((collected / goal) * 100), 100) : 0;
  const isActive = (campaign.status || 'active').toLowerCase() === 'active';

  let daysRemaining: number | null = null;
  let isEndingSoon = false;

  if (campaign.end_date) {
    const end = new Date(campaign.end_date).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? diff : 0;
    isEndingSoon = daysRemaining <= 7 && daysRemaining > 0;
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
      {/* Banner Image */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        {campaign.media_url ? (
          <Image
            src={campaign.media_url}
            alt={campaign.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center p-6 text-white text-center">
            <span className="text-sm font-semibold tracking-tight opacity-80">{campaign.title}</span>
          </div>
        )}

        {/* Status & Days tags */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              isActive
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-white'
            }`}
          >
            {isActive ? 'Active' : 'Completed'}
          </span>

          {daysRemaining !== null && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                isEndingSoon
                  ? 'bg-red-600 text-white'
                  : 'bg-black/60 text-white'
              }`}
            >
              {daysRemaining === 0 ? 'Ended' : `${daysRemaining} days left`}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{campaign.location || 'Bangladesh'}</span>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug mb-2">
            <Link href={`/campaigns/${campaign.id}`} className="hover:text-blue-600 transition-colors">
              {campaign.title}
            </Link>
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {campaign.description || 'Emergency disaster response funding.'}
          </p>
        </div>

        {/* Progress & Actions */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div>
            <div className="flex justify-between items-baseline text-xs mb-1.5 font-medium">
              <span className="text-slate-900 font-semibold">
                ৳{collected.toLocaleString('en-IN')}{' '}
                <span className="text-slate-400 font-normal">of ৳{goal.toLocaleString('en-IN')}</span>
              </span>
              <span className="text-slate-500 font-semibold">{percentage}%</span>
            </div>
            <ProgressBar current={collected} target={goal} color="blue" height="sm" />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="flex-1 py-2 text-center rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              Donate Now
            </Link>
            <Link
              href={`/campaigns/${campaign.id}`}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-center"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
