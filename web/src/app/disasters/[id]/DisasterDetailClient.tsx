'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Clock,
  User,
  Users,
  PlusCircle,
  LifeBuoy,
  X,
  Send,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SeverityBadge, StatusBadge, DisasterIcon } from '@/components/DisasterBadge';
import { showToast } from '@/components/Toast';

const DynamicDisasterMiniMap = dynamic(
  () => import('@/components/DisasterMiniMap').then((mod) => mod.DisasterMiniMap),
  { ssr: false }
);

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'recently';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

interface DisasterDetailClientProps {
  initialDisaster: any;
  initialUpdates: any[];
  initialMedia: any[];
  currentUserProfile: any | null;
}

export function DisasterDetailClient({
  initialDisaster,
  initialUpdates,
  initialMedia,
  currentUserProfile,
}: DisasterDetailClientProps) {
  const [disaster, setDisaster] = useState(initialDisaster);
  const [updates, setUpdates] = useState<any[]>(initialUpdates);
  const [enlargedMedia, setEnlargedMedia] = useState<string | null>(null);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const isVolunteer =
    currentUserProfile?.role === 'volunteer' || currentUserProfile?.role === 'admin';

  const displayMedia =
    initialMedia && initialMedia.length > 0
      ? initialMedia
      : [
          {
            id: 'demo-1',
            public_url:
              'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1000&q=80',
          },
          {
            id: 'demo-2',
            public_url:
              'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80',
          },
        ];

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`disaster-updates-${disaster.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'disaster_updates',
          filter: `disaster_id=eq.${disaster.id}`,
        },
        (payload) => {
          showToast.info('New field update received');
          setUpdates((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [disaster.id]);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    setSubmittingUpdate(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast.error('Please sign in to post updates');
        return;
      }

      const { data, error } = await supabase
        .from('disaster_updates')
        .insert({
          disaster_id: disaster.id,
          user_id: user.id,
          body_text: updateText.trim(),
        })
        .select()
        .single();

      if (error) {
        showToast.error(error.message);
      } else {
        showToast.success('Update recorded');
        setUpdateText('');
        setShowUpdateModal(false);
        if (data) {
          setUpdates((prev) => [data, ...prev]);
        }
      }
    } catch (err) {
      showToast.error('Failed to post update');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const loc =
    disaster.location_label || disaster.description?.split(':')[0] || 'Incident Zone';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-slate-900 transition">Home</Link>
        <span>/</span>
        <Link href="/map" className="hover:text-slate-900 transition">Disaster Map</Link>
        <span>/</span>
        <span className="text-slate-800 capitalize truncate max-w-[200px]">
          {disaster.disaster_type?.replace('_', ' ') || 'Incident'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (65%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <DisasterIcon type={disaster.disaster_type} className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 capitalize">
                  {disaster.disaster_type?.replace('_', ' ') || 'Incident Report'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={disaster.severity} size="md" />
                <StatusBadge status={disaster.status} size="md" />
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{loc}</span>
              </div>

              {disaster.latitude && disaster.longitude && (
                <div className="text-slate-400 pl-5 font-mono text-[11px]">
                  {Number(disaster.latitude).toFixed(4)}° N, {Number(disaster.longitude).toFixed(4)}° E
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Citizen Reporter
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatRelativeTime(disaster.created_at)}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
            <h3 className="text-xs font-semibold uppercase text-slate-400">Situation Summary</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {disaster.description || 'Emergency situation report pending initial assessment.'}
            </p>
          </div>

          {/* Media Gallery */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400">Photographs</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {displayMedia.map((m: any, idx: number) => (
                <button
                  key={m.id || idx}
                  onClick={() => setEnlargedMedia(m.public_url)}
                  className="relative h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer"
                >
                  <Image
                    src={m.public_url}
                    alt="Incident reconnaissance"
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover hover:opacity-90 transition"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div id="updates" className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-semibold uppercase text-slate-400">Updates Timeline</h3>
              <span className="text-[11px] text-slate-400">Live feed</span>
            </div>

            {updates.length === 0 ? (
              <div className="p-4 text-center rounded bg-slate-50 text-xs text-slate-500">
                No field updates recorded yet.
              </div>
            ) : (
              <div className="relative pl-5 space-y-4 text-xs">
                <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-slate-200" />
                {updates.map((upd: any) => (
                  <div key={upd.id} className="relative">
                    <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {upd.profiles?.name || 'Field Responder'}
                        </span>
                        <span>
                          {new Date(upd.created_at).toLocaleTimeString('en-BD', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{upd.body_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (35%, Sticky) */}
        <div className="lg:col-span-4 sticky top-20 space-y-5">
          {/* Mini Map */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase block">Location Pin</span>
            {disaster.latitude && disaster.longitude ? (
              <DynamicDisasterMiniMap
                latitude={Number(disaster.latitude)}
                longitude={Number(disaster.longitude)}
                disasterType={disaster.disaster_type}
                severity={disaster.severity}
              />
            ) : (
              <div className="h-40 bg-slate-50 rounded flex items-center justify-center text-xs text-slate-400">
                Coordinates unavailable
              </div>
            )}
          </div>

          {/* Indicators Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Severity</span>
              <SeverityBadge severity={disaster.severity} size="md" />
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Current Status</span>
              <StatusBadge status={disaster.status} size="md" />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Volunteers Assigned</span>
              <span className="font-semibold text-slate-900">18 responders</span>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                href={`/citizen/aid-request?disaster_id=${disaster.id}`}
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold text-center hover:bg-red-700 transition block"
              >
                Request Help
              </Link>

              {isVolunteer ? (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="w-full py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Verify / Add Update
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full text-center py-1 text-slate-500 hover:text-slate-700 block text-[11px]"
                >
                  Volunteer login to verify
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {enlargedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEnlargedMedia(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[80vh] h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={enlargedMedia}
              alt="Enlarged photo"
              fill
              className="object-contain rounded-lg"
            />
            <button
              onClick={() => setEnlargedMedia(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Field Update</h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Incident Update Notes
                </label>
                <textarea
                  rows={4}
                  required
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Record latest water levels, road access, or evacuation status..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUpdate || !updateText.trim()}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingUpdate ? 'Submitting...' : 'Post Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
