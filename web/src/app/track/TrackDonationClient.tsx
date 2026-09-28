'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, CheckCircle2, AlertCircle, CreditCard, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DonationTimeline, TrackingStepData } from '@/components/DonationTimeline';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface TrackDonationClientProps {
  initialCode?: string;
}

export function TrackDonationClient({ initialCode = '' }: TrackDonationClientProps) {
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const fetchTracking = async (codeToSearch: string) => {
    const code = codeToSearch.trim();
    if (!code) return;

    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const supabase = createClient();
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        'get_donation_tracking_by_code',
        { p_code: code }
      );

      if (!rpcErr && rpcData && rpcData.donation) {
        setResult(rpcData);
        setLoading(false);
        return;
      }

      const { data: donation, error: donErr } = await supabase
        .from('donations')
        .select('*, campaigns(id, title, location), donation_tracking(*)')
        .eq('donation_code', code)
        .maybeSingle();

      if (donation && !donErr) {
        setResult({
          donation: {
            id: donation.id,
            donation_code: donation.donation_code,
            amount: donation.amount,
            donor_name: donation.anonymous ? 'Anonymous Donor' : donation.donor_name,
            payment_status: donation.payment_status,
            payment_method: donation.payment_method,
            created_at: donation.created_at,
            campaign_id: donation.campaign_id,
          },
          campaign: donation.campaigns || { id: '', title: 'General Relief Fund', location: 'Bangladesh' },
          tracking: donation.donation_tracking || [],
          resources: [],
        });
      } else {
        setResult(null);
      }
    } catch (err) {
      console.error('Error tracking donation:', err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchTracking(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(trackingCode);
  };

  const handleSampleClick = (code: string) => {
    setTrackingCode(code);
    fetchTracking(code);
  };

  const buildTimelineSteps = (): TrackingStepData[] => {
    if (!result || !result.donation) return [];

    const don = result.donation;
    const trackingList: any[] = result.tracking || [];

    const isPaid = (don.payment_status || '').toLowerCase() === 'paid';
    const hasAllocated = trackingList.some((t) => (t.status || '').toLowerCase().includes('allocat'));
    const hasPurchased = trackingList.some((t) => (t.status || '').toLowerCase().includes('purchas'));
    const hasDistributed = trackingList.some((t) => (t.status || '').toLowerCase().includes('distribut'));

    const allocRecord = trackingList.find((t) => (t.status || '').toLowerCase().includes('allocat'));
    const purchRecord = trackingList.find((t) => (t.status || '').toLowerCase().includes('purchas'));
    const distRecord = trackingList.find((t) => (t.status || '').toLowerCase().includes('distribut'));

    return [
      {
        step: 1,
        title: 'Payment Received',
        isCompleted: isPaid,
        timestamp: don.created_at,
        description: isPaid
          ? `Your donation of ৳${Number(don.amount).toLocaleString('en-IN')} has been received.`
          : 'Payment confirmation pending.',
      },
      {
        step: 2,
        title: 'Funds Allocated',
        isCompleted: hasAllocated || isPaid,
        timestamp: allocRecord?.updated_at || (isPaid ? don.created_at : null),
        description:
          allocRecord?.description ||
          `Funds allocated to ${result.campaign?.title || 'Relief Campaign'}.`,
        amount: allocRecord?.amount || don.amount,
      },
      {
        step: 3,
        title: 'Resources Purchased',
        isCompleted: hasPurchased,
        timestamp: purchRecord?.updated_at || null,
        description:
          purchRecord?.description ||
          'Dry rations, clean drinking water, and emergency kits procured.',
        proofUrl: purchRecord?.proof_url || null,
      },
      {
        step: 4,
        title: 'Distributed to Beneficiaries',
        isCompleted: hasDistributed,
        timestamp: distRecord?.updated_at || null,
        description:
          distRecord?.description ||
          'Relief packages distributed to verified families in disaster zones.',
        proofUrl: distRecord?.proof_url || null,
      },
    ];
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Track Your Donation
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
          Enter your unique Donation ID to see exactly how your contribution is making a difference.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Donation ID
            </label>
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Enter your tracking ID  e.g. DON-2026-000123"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-mono text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track Donation'}
          </button>
        </form>

        {/* Sample IDs */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Sample test IDs:</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {['DON-2026-000007', 'DON-2026-000008'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleSampleClick(code)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner text="Querying donation records..." />}

      {/* RESULT CARD */}
      {!loading && searched && result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          {/* Top Section */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Donation Found</h2>
            </div>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {result.donation.donation_code}
            </span>
          </div>

          {/* Donor Info Row */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">Donor</span>
              <span className="font-semibold text-slate-900">
                {result.donation.donor_name || 'Anonymous Donor'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">Campaign</span>
              {result.campaign?.id ? (
                <Link
                  href={`/campaigns/${result.campaign.id}`}
                  className="font-semibold text-blue-600 hover:underline line-clamp-1"
                >
                  {result.campaign.title}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900">
                  {result.campaign?.title || 'Relief Campaign'}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">Amount</span>
              <span className="font-bold text-sm text-slate-900">
                ৳{Number(result.donation.amount).toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">Payment Method</span>
              <span className="font-medium text-slate-700">
                {result.donation.payment_method?.toUpperCase() || 'Card / SSL'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">Date</span>
              <span className="text-slate-700">
                {new Date(result.donation.created_at).toLocaleDateString('en-BD', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">Payment Status</span>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  (result.donation.payment_status || '').toLowerCase() === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {(result.donation.payment_status || '').toLowerCase() === 'paid'
                  ? 'Completed'
                  : 'Pending'}
              </span>
            </div>
          </div>

          {/* TIMELINE */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Tracking Timeline
            </h3>
            <DonationTimeline steps={buildTimelineSteps()} />
          </div>
        </div>
      )}

      {/* NOT FOUND STATE */}
      {!loading && searched && !result && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-red-900">No donation found</h3>
          <p className="text-xs text-red-700 max-w-xs mx-auto leading-relaxed">
            We couldn&apos;t find a donation with ID <span className="font-mono font-semibold">&quot;{trackingCode}&quot;</span>. Please check the ID and try again.
          </p>
          <div className="text-[11px] text-red-600 pt-1">
            If you need help, contact support at{' '}
            <a href="mailto:support@crisislink.bd" className="underline font-medium">
              support@crisislink.bd
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
