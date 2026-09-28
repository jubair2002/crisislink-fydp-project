'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function CampaignDetailError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto px-4 flex flex-col items-center justify-center text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Campaign Error</h2>
        <p className="text-sm text-slate-600 mb-6">
          Unable to display this campaign. It may have been removed or an unexpected error occurred.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
