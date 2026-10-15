'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Users,
  Compass,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  LifeBuoy,
  X,
  Radio,
  FileText,
  User,
  Activity,
  Maximize2,
} from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import { SeverityBadge, StatusBadge, getDisasterTypeMeta } from '@/components/DisasterBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import type { DisasterRow, DisasterUpdateRow, DisasterMediaRow } from '@/types/admin';

// Dynamically import mini map
const DisasterMiniMap = dynamic(() => import('@/components/map/DisasterMiniMap'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-slate-100 animate-pulse rounded-2xl" />,
});

function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return 'recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DisasterDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [disaster, setDisaster] = useState<DisasterRow | null>(null);
  const [updates, setUpdates] = useState<DisasterUpdateRow[]>([]);
  const [media, setMedia] = useState<DisasterMediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!id) return;

      try {
        // User session check
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (mounted) setUser(currentUser);

        // Fetch disaster row
        const { data: d, error: dError } = await supabase
          .from('disasters')
          .select('*')
          .eq('id', id)
          .single();

        if (d && mounted) {
          setDisaster(d);
        }

        // Fetch updates
        const { data: up } = await supabase
          .from('disaster_updates')
          .select('*')
          .eq('disaster_id', id)
          .order('created_at', { ascending: false });

        if (up && mounted) setUpdates(up);

        // Fetch media
        const { data: med } = await supabase
          .from('disaster_media')
          .select('*')
          .eq('disaster_id', id);

        if (med && mounted) setMedia(med);
      } catch (err) {
        console.error('Error loading disaster detail:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    // Realtime channel for disaster updates
    const updatesChannel = supabase
      .channel(`disaster-updates-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'disaster_updates',
          filter: `disaster_id=eq.${id}`,
        },
        (payload) => {
          setUpdates((prev) => [payload.new as DisasterUpdateRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(updatesChannel);
    };
  }, [id]);

  if (loading) {
    return (
      <PublicShell>
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading emergency situation report..." />
        </div>
      </PublicShell>
    );
  }

  if (!disaster) {
    return (
      <PublicShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Incident Not Found</h2>
          <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
            The disaster record you requested does not exist or has been resolved and archived.
          </p>
          <Link
            href="/map"
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            Return to Disaster Map
          </Link>
        </div>
      </PublicShell>
    );
  }

  const meta = getDisasterTypeMeta(disaster.disaster_type);
  const Icon = meta.icon;

  return (
    <PublicShell>
      {/* Top Breadcrumb */}
      <div className="bg-slate-900 text-white py-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/" className="hover:text-cyan-400 transition">
              Home
            </Link>
            <span>/</span>
            <Link href="/map" className="hover:text-cyan-400 transition">
              Disaster Map
            </Link>
            <span>/</span>
            <span className="text-slate-200 capitalize">
              {disaster.disaster_type} Incident
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* LEFT COLUMN (65% -> 8 of 12 cols on desktop) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Type Heading + Severity + Status */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-xl font-bold text-sm border border-blue-100">
                  <Icon className="w-4 h-4 text-blue-600" />
                  <span className="capitalize">{disaster.disaster_type} Emergency</span>
                </div>
                <SeverityBadge severity={disaster.severity} />
                <StatusBadge status={disaster.status} />
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {disaster.description?.split('.')[0] || `${meta.label} Response Operations`}
              </h1>

              {/* Location + Coordinates + Reported by */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                  <span>
                    {disaster.location_label ||
                      `Coordinates: ${disaster.latitude?.toFixed(4)}, ${disaster.longitude?.toFixed(4)}`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reported {formatTimeAgo(disaster.created_at)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  <span>Reported by Verified Citizen</span>
                </div>
              </div>
            </div>

            {/* Situation Description */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900">Situation Report</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {disaster.description}
              </p>
            </div>

            {/* Media Gallery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Incident Media &amp; Photos</h3>
                <span className="text-xs text-slate-400 font-medium">
                  {media.length} photos attached
                </span>
              </div>

              {media.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No photographic media attached with this initial report.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {media.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => m.public_url && setSelectedImage(m.public_url)}
                      className="group relative h-40 rounded-2xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200 hover:shadow-lg transition"
                    >
                      {m.public_url && (
                        <Image
                          src={m.public_url}
                          alt="Incident documentation"
                          fill
                          sizes="(max-width: 768px) 50vw, 300px"
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Updates Timeline (Realtime) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                  <h3 className="text-lg font-bold text-slate-900">Live Field Updates Timeline</h3>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Realtime Stream
                </span>
              </div>

              {updates.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center text-xs sm:text-sm text-slate-400">
                  No subsequent field notes published yet. Community teams are deployed.
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-slate-200">
                  {updates.map((up) => (
                    <div key={up.id} className="relative flex items-start gap-4 pl-1">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold ring-4 ring-white shadow-sm">
                        ✓
                      </div>
                      <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold text-slate-700">Official Field Team Note</span>
                          <span>{formatTimeAgo(up.created_at)}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                          {up.body_text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (35% -> 4 of 12 cols - STICKY) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            {/* Mini Map */}
            {disaster.latitude && disaster.longitude && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Incident Coordinates Pin
                </h4>
                <DisasterMiniMap
                  latitude={disaster.latitude}
                  longitude={disaster.longitude}
                  severity={disaster.severity}
                />
                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>GPS Lat: {disaster.latitude.toFixed(4)}° N</span>
                  <span>GPS Lng: {disaster.longitude.toFixed(4)}° E</span>
                </div>
              </div>
            )}

            {/* Severity Guidance Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Severity Assessment
              </h4>
              <div className="flex items-center justify-between">
                <SeverityBadge severity={disaster.severity} />
                <span className="text-xs font-extrabold text-slate-900 uppercase">
                  {disaster.severity || 'Standard'} Priority
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                Evaluated based on population density, water level flood markers, or fire proximity.
                Field resources are prioritized accordingly.
              </p>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Operational Status
              </h4>
              <div className="flex items-center justify-between">
                <StatusBadge status={disaster.status} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                Verified incident status confirms localized response teams have established
                communications on-site.
              </p>
            </div>

            {/* Volunteers Assigned Count (Read-only) */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Volunteers Assigned</span>
              </div>
              <span className="font-black text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200">
                4 Active Field Responders
              </span>
            </div>

            {/* Logged-in: "Request Help" Button */}
            {user ? (
              <div className="pt-2">
                <Link
                  href={`/citizen/aid-request?disaster_id=${disaster.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition"
                >
                  <LifeBuoy className="w-4 h-4" />
                  <span>Request Help for This Disaster</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-600">
                  Affected by this incident? Sign in to request direct rescue or emergency relief.
                </p>
                <Link
                  href={`/login?redirect=/disasters/${disaster.id}`}
                  className="inline-block text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Sign In to Request Aid
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enlarged Photo Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden p-3 border border-slate-800 shadow-2xl"
          >
            <div className="flex justify-end p-1">
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative h-96 sm:h-[550px] w-full rounded-xl overflow-hidden bg-black">
              <Image
                src={selectedImage}
                alt="Enlarged incident view"
                fill
                sizes="(max-width: 1200px) 100vw, 1000px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
