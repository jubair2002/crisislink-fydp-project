import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DisasterDetailClient } from './DisasterDetailClient';

interface DisasterDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DisasterDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: disaster } = await supabase
    .from('disasters')
    .select('disaster_type, severity, description')
    .eq('id', id)
    .maybeSingle();

  if (!disaster) {
    return {
      title: 'Disaster Not Found — CrisisLink Network',
    };
  }

  const titleType = disaster.disaster_type ? disaster.disaster_type.toUpperCase() : 'EMERGENCY';
  return {
    title: `${titleType} Alert — CrisisLink Network`,
    description: disaster.description || 'Verified disaster incident tracking across Bangladesh.',
  };
}

export default async function DisasterDetailPage({ params }: DisasterDetailPageProps) {
  const { id } = await params;
  const supabase = createServiceClient();
  const profile = await getCurrentProfile();

  // Fetch disaster, updates, and media in parallel
  const [disasterRes, updatesRes, mediaRes] = await Promise.all([
    supabase.from('disasters').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('disaster_updates')
      .select('*')
      .eq('disaster_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('disaster_media').select('*').eq('disaster_id', id),
  ]);

  const disaster = disasterRes.data;
  if (!disaster) {
    notFound();
  }

  const updates = updatesRes.data ?? [];
  const media = mediaRes.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <DisasterDetailClient
          initialDisaster={disaster}
          initialUpdates={updates}
          initialMedia={media}
          currentUserProfile={profile}
        />
      </main>

      <Footer />
    </div>
  );
}
