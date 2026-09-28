import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function DisasterDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6 animate-pulse">
            <div className="h-44 bg-slate-200 rounded-3xl w-full" />
            <div className="h-28 bg-slate-200 rounded-3xl w-full" />
            <div className="h-60 bg-slate-200 rounded-3xl w-full" />
          </div>
          <div className="lg:col-span-4 h-96 bg-slate-200 rounded-3xl animate-pulse" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
