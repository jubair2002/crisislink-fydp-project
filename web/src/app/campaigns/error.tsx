'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function CampaignsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto px-4 flex flex-col items-center justify-center text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Failed to load campaigns</h2>
        <p className="text-sm text-slate-600 mb-6">
          There was an issue fetching relief campaigns. Please check your connection and try again.
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
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
