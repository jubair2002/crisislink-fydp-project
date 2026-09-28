import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function CampaignsLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse mb-4" />
        <div className="h-4 w-96 bg-slate-200 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-96 p-5 space-y-4 animate-pulse">
              <div className="h-48 bg-slate-200 rounded-xl w-full" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
