import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HeartHandshake, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import { getCampaignDetail } from '@/lib/publicService';

interface DonatePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DonatePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getCampaignDetail(id);
  return {
    title: `Donate to ${data?.campaign?.title || 'Relief Campaign'} · CrisisLink Network`,
  };
}

export default async function CampaignDonatePage({ params }: DonatePageProps) {
  const { id } = await params;
  const data = await getCampaignDetail(id);

  if (!data || !data.campaign) {
    notFound();
  }

  const { campaign } = data;

  return (
    <PublicShell>
      <div className="bg-slate-900 text-white py-8 border-b border-slate-800">
        <div className="max-w-xl mx-auto px-4 text-center space-y-2">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Campaign</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Make a Donation</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto truncate">
            {campaign.title}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/80 border border-blue-100 text-blue-900">
            <HeartHandshake className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div className="text-xs">
              <strong className="block font-bold">100% Direct Relief Delivery</strong>
              Your contribution is pooled into auditable field purchase orders and tracked with
              cryptographic receipts.
            </div>
          </div>

          <form action="/track" method="GET" className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Contribution Amount (BDT)
              </label>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                {['500', '1000', '2500', '5000', '10000', '25000'].map((amt) => (
                  <label
                    key={amt}
                    className="flex items-center justify-center py-3 px-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer font-bold text-sm text-slate-800 transition"
                  >
                    <input type="radio" name="preset_amount" value={amt} className="sr-only" />
                    ৳{amt}
                  </label>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  ৳
                </span>
                <input
                  type="number"
                  placeholder="Or enter custom amount in ৳"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Donor Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank to donate anonymously"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anon"
                defaultChecked
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="anon" className="text-xs font-medium text-slate-600">
                Display as &ldquo;Anonymous Donor&rdquo; on public transparency boards
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition"
              >
                Proceed to Secure Gateway (bKash / SSLCommerz)
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>SSLCommerz 256-bit Bank Grade Encrypted</span>
            </div>
          </form>
        </div>
      </div>
    </PublicShell>
  );
}
