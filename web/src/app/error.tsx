'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed mb-6">
          We encountered an unexpected issue loading this page. Please try refreshing or return to
          the homepage.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
