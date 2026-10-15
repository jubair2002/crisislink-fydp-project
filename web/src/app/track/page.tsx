import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Receipt,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Calendar,
  Layers,
} from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import DonationTimeline, { TrackingStep } from '@/components/DonationTimeline';
import { trackDonationByCode } from '@/lib/publicService';

export const metadata: Metadata = {
  title: 'Track Your Donation · CrisisLink Network',
  description:
    'Track your disaster relief contribution in Bangladesh from initial payment to field delivery with verified photo evidence.',
};

interface TrackPageProps {
  searchParams: Promise<{
    id?: string;
    code?: string;
  }>;
}

export default async function TrackPage({ searchParams }: TrackPageProps) {
  const params = await searchParams;
  const searchCode = (params.id || params.code || '').trim();

  let donationResult = null;
  let searched = false;

  if (searchCode) {
    searched = true;
    donationResult = await trackDonationByCode(searchCode);
  }

  // Map tracking timeline steps if donation found
  let timelineSteps: TrackingStep[] = [];

  if (donationResult) {
    const trackingRows = (donationResult.donation_tracking || []) as Array<{
      status?: string | null;
      description?: string | null;
      proof_url?: string | null;
      updated_at?: string | null;
    }>;

    // Step 1: Payment Received
    const isPaid = (donationResult.payment_status || '').toLowerCase() === 'paid';
    const receivedRow = trackingRows.find((r) => (r.status || '').toLowerCase() === 'received');
    timelineSteps.push({
      step: 1,
      title: 'Payment Received',
      status: isPaid || receivedRow ? 'done' : 'pending',
      date: donationResult.created_at || receivedRow?.updated_at,
      description:
        receivedRow?.description ||
        `Donation payment of ৳${donationResult.amount} verified via ${donationResult.payment_method || 'gateway'}.`,
    });

    // Step 2: Funds Allocated
    const allocatedRow = trackingRows.find((r) => (r.status || '').toLowerCase() === 'allocated');
    timelineSteps.push({
      step: 2,
      title: 'Funds Allocated',
      status: allocatedRow ? 'done' : 'pending',
      date: allocatedRow?.updated_at,
      description:
        allocatedRow?.description ||
        (allocatedRow ? 'Funds pooled into operational procurement order.' : 'Pending allocation.'),
    });

    // Step 3: Resources Purchased
    const purchasedRow = trackingRows.find(
      (r) =>
        (r.status || '').toLowerCase() === 'purchased' ||
        (r.status || '').toLowerCase() === 'procured'
    );
    timelineSteps.push({
      step: 3,
      title: 'Resources Purchased',
      status: purchasedRow ? 'done' : 'pending',
      date: purchasedRow?.updated_at,
      description:
        purchasedRow?.description ||
        (purchasedRow ? 'Emergency relief supplies procured.' : 'Awaiting procurement batch dispatch.'),
      proofUrl: purchasedRow?.proof_url,
    });

    // Step 4: Distributed to Beneficiaries
    const distributedRow = trackingRows.find(
      (r) =>
        (r.status || '').toLowerCase() === 'distributed' ||
        (r.status || '').toLowerCase() === 'completed'
    );
    timelineSteps.push({
      step: 4,
      title: 'Distributed to Beneficiaries',
      status: distributedRow ? 'done' : 'pending',
      date: distributedRow?.updated_at,
      description:
        distributedRow?.description ||
        (distributedRow ? 'Supplies delivered to affected families.' : 'Scheduled for field handover.'),
      proofUrl: distributedRow?.proof_url,
    });
  }

  return (
    <PublicShell>
      <div className="bg-gradient-to-b from-[#0F172A] to-slate-900 text-white py-12 lg:py-16 border-b border-slate-800">
        <div className="max-w-xl mx-auto px-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
            <Receipt className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Track Your Donation
          </h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Enter your unique donation tracking code to see real-time allocation, supply procurement,
            and field distribution receipts.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Search Input Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-lg space-y-4 mb-8">
          <form action="/track" method="GET" className="space-y-3">
            <label
              htmlFor="track-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Enter Donation Tracking Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="track-input"
                  name="id"
                  type="text"
                  defaultValue={searchCode}
                  placeholder="e.g. DON-2026-000007"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-sm"
              >
                Track
              </button>
            </div>
          </form>

          {/* Quick test suggestion */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <span>Demo tracking code:</span>
            <Link
              href="/track?id=DON-2026-000007"
              className="text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-md"
            >
              DON-2026-000007
            </Link>
          </div>
        </div>

        {/* Search Results */}
        {searched && donationResult && (
          /* FOUND CARD */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-8 animate-in fade-in duration-300">
            {/* Header / Found Banner */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Donation Found</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {donationResult.donation_code || donationResult.id}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      ✓ {donationResult.payment_status || 'Paid'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Contributed</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  ৳{new Intl.NumberFormat('en-IN').format(donationResult.amount)}
                </span>
              </div>
            </div>

            {/* Donation Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                  Donor
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {donationResult.anonymous
                    ? 'Anonymous Donor'
                    : donationResult.donor_name || 'Generous Donor'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                  Payment Method
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 uppercase block">
                  {donationResult.payment_method || 'SSLCommerz'}
                </span>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                  Assigned Campaign
                </span>
                {donationResult.campaigns ? (
                  <Link
                    href={`/campaigns/${donationResult.campaign_id}`}
                    className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-0.5 text-xs sm:text-sm"
                  >
                    <span>{donationResult.campaigns.title}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    General Disaster Relief Fund
                  </span>
                )}
              </div>
            </div>

            {/* Timeline Stepper */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
                Live Relief Lifecycle
              </h4>
              <DonationTimeline steps={timelineSteps} />
            </div>
          </div>
        )}

        {searched && !donationResult && (
          /* NOT FOUND CARD */
          <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No donation found</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
              We couldn&apos;t find a donation with ID{' '}
              <strong className="text-slate-900 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                {searchCode}
              </strong>
              . Please check the ID and try again.
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@crisislink.net"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
