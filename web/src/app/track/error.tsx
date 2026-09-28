'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TrackError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 max-w-md mx-auto px-4 flex flex-col items-center justify-center text-center py-20">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Tracking Service Unavailable</h2>
        <p className="text-sm text-slate-600 mb-6">
          Unable to query the donation ledger at this time. Please retry in a few moments.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
