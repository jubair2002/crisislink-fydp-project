import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TrackLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16">
        <LoadingSpinner size="lg" text="Loading donation tracking..." />
      </main>
      <Footer />
    </div>
  );
}
