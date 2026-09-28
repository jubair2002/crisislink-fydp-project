import React from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TrackDonationClient } from './TrackDonationClient';

export const metadata: Metadata = {
  title: 'Track Your Donation — CrisisLink Network',
  description:
    'Enter your unique Donation ID to see itemized timeline proof of how your contribution is deployed on the ground in Bangladesh.',
};

interface TrackPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function TrackPage({ searchParams }: TrackPageProps) {
  const params = await searchParams;
  const initialCode = (params.code || '').trim();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <TrackDonationClient initialCode={initialCode} />
      </main>

      <Footer />
    </div>
  );
}
