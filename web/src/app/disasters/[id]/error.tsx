'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Disaster detail error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Incident Details Unavailable</h2>
        <p className="mt-2 text-xs text-slate-500 mb-6">
          Could not retrieve this disaster record. Please verify the ID or return to the active map.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Disaster Map
          </Link>
        </div>
      </div>
    </div>
  );
}
