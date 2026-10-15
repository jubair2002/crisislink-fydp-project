'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Map page error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#0F172A] text-white">
      <div className="max-w-md w-full text-center bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Map Engine Unavailable</h2>
        <p className="mt-2 text-xs text-slate-400 mb-6">
          Could not load the interactive map components. Please check your internet connection and
          try again.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Map
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
