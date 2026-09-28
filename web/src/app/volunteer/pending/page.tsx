'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  AlertTriangle,
  RotateCw,
  MapPin,
  HeartHandshake,
  TrendingUp,
  ArrowRight,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function VolunteerPendingPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [volunteerData, setVolunteerData] = useState<{
    verification_status: 'pending' | 'approved' | 'rejected' | 'suspended';
    rejection_reason?: string | null;
  } | null>(null);

  const fetchStatus = async (showToast = false) => {
    if (!user) return;
    setRefreshing(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('verification_status, verification_rejection_reason, rejected_reason')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching volunteer status:', error.message);
      }

      if (data) {
        const status = data.verification_status || 'pending';
        const reason =
          data.verification_rejection_reason || data.rejected_reason || null;

        setVolunteerData({
          verification_status: status,
          rejection_reason: reason,
        });

        if (status === 'approved') {
          toast.success('Your volunteer profile has been approved!');
          router.replace('/volunteer/dashboard');
          return;
        }

        if (showToast) {
          toast.success('Status updated: ' + status);
        }
      }
    } catch (e) {
      console.error('Error in fetchStatus:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isRejected = volunteerData?.verification_status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Header bar */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <Link href="/" className="text-base font-bold text-slate-900 tracking-tight">
          CrisisLink <span className="text-slate-500 font-medium">Network</span>
        </Link>
        <button
          onClick={async () => {
            toast.success('Signed out.');
            await signOut();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Centered Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 text-center">
        {/* Animated Clock / Alert Icon */}
        <div className="mx-auto flex items-center justify-center">
          {isRejected ? (
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center border-4 border-red-50">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : (
            <div className="relative w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border-4 border-amber-50">
              <Clock className="w-8 h-8 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
              </span>
            </div>
          )}
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRejected ? 'Application Needs Revision' : 'Application Under Review'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isRejected
              ? 'Your volunteer profile was reviewed by our team and needs some updates before approval.'
              : 'Your volunteer profile has been submitted and is being reviewed by our admin team. This usually takes 1-2 days.'}
          </p>
        </div>

        {/* Status Badge Card */}
        <div
          className={`p-4 rounded-xl border text-left space-y-1.5 ${
            isRejected
              ? 'bg-red-50/70 border-red-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Verification Status
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isRejected
                  ? 'bg-red-200 text-red-800'
                  : 'bg-amber-200 text-amber-800'
              }`}
            >
              {volunteerData?.verification_status || 'pending'}
            </span>
          </div>

          {isRejected && volunteerData?.rejection_reason && (
            <div className="pt-2 text-xs text-red-900 leading-relaxed border-t border-red-200/60 mt-2">
              <span className="font-semibold block mb-0.5">Admin Note:</span>
              <p>{volunteerData.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Action based on status */}
        {isRejected ? (
          <div className="space-y-3 pt-2">
            <Link
              href="/complete-profile"
              className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm shadow-md shadow-red-500/10 transition flex items-center justify-center gap-2"
            >
              <span>Resubmit Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* While you wait options */
          <div className="space-y-3 pt-2 text-left border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              While you wait, you can still:
            </h4>
            <div className="space-y-2">
              <Link
                href="/campaigns"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition">
                      Browse active campaigns
                    </p>
                    <p className="text-[11px] text-slate-500">Support relief operations</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </Link>

              <Link
                href="/track"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition">
                      Track a donation
                    </p>
                    <p className="text-[11px] text-slate-500">Live aid tracking</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </Link>

              <Link
                href="/map"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition">
                      View disaster map
                    </p>
                    <p className="text-[11px] text-slate-500">Live incident reports</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </Link>
            </div>
          </div>
        )}

        {/* Refresh Status Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-60"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Checking status…' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
