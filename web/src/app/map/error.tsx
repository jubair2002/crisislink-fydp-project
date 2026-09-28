'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function MapError({ reset }: { reset: () => void }) {
  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <div className="flex-1 max-w-md mx-auto px-4 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Map Loading Error</h2>
        <p className="text-sm text-slate-600 mb-6">
          Unable to load map geospatial layers. Please check your internet connection and try again.
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
      </div>
    </div>
  );
}
