'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Filter,
  X,
  Compass,
  AlertTriangle,
  RotateCcw,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radio,
  FileEdit,
} from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import { SeverityBadge, StatusBadge, getDisasterTypeMeta } from '@/components/DisasterBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import type { DisasterRow } from '@/types/admin';

// Dynamically import Leaflet with SSR false
const DisasterLeafletMap = dynamic(() => import('@/components/map/DisasterLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-slate-900 text-white rounded-2xl">
      <LoadingSpinner size="lg" label="Initializing OpenStreetMap tiles..." />
    </div>
  ),
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

export default function PublicMapPage() {
  const [disasters, setDisasters] = useState<DisasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterRow | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Check user session
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (mounted) setUser(currentUser);

        // Fetch verified/in progress disasters
        const { data, error } = await supabase
          .from('disasters')
          .select('*')
          .in('status', ['verified', 'response_in_progress', 'reported'])
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching map disasters:', error);
        } else if (data && mounted) {
          setDisasters(data);
          if (data.length > 0 && !selectedDisaster) {
            setSelectedDisaster(data[0]);
          }
        }
      } catch (err) {
        console.error('Map init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    // Realtime channel on postgres_changes for disasters
    const channel = supabase
      .channel('public-disasters')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disasters' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            showToast.warning(
              '⚠️ New disaster reported',
              `A new ${payload.new.disaster_type || 'incident'} has been logged.`
            );
            setDisasters((prev) => [payload.new as DisasterRow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDisasters((prev) =>
              prev.map((d) => (d.id === payload.new.id ? (payload.new as DisasterRow) : d))
            );
            if (selectedDisaster?.id === payload.new.id) {
              setSelectedDisaster(payload.new as DisasterRow);
            }
          } else if (payload.eventType === 'DELETE') {
            setDisasters((prev) => prev.filter((d) => d.id === payload.old.id));
            if (selectedDisaster?.id === payload.old.id) {
              setSelectedDisaster(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter logic
  const filteredDisasters = useMemo(() => {
    return disasters.filter((d) => {
      if (filterType !== 'all' && (d.disaster_type || '').toLowerCase() !== filterType.toLowerCase()) {
        return false;
      }
      if (filterSeverity !== 'all' && (d.severity || '').toLowerCase() !== filterSeverity.toLowerCase()) {
        return false;
      }
      if (filterStatus !== 'all' && (d.status || '').toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [disasters, filterType, filterSeverity, filterStatus]);

  const handleResetFilters = () => {
    setFilterType('all');
    setFilterSeverity('all');
    setFilterStatus('all');
  };

  const selectedMeta = selectedDisaster ? getDisasterTypeMeta(selectedDisaster.disaster_type) : null;

  return (
    <PublicShell className="flex flex-col">
      {/* Top Map Ribbon */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h1 className="font-bold text-sm text-white">Live Disaster Response Map</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-semibold">
              OpenStreetMap · Realtime
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#991B1B] animate-pulse" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F97316]" /> Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Low
            </span>
          </div>
        </div>
      </div>

      {/* Map Layout Area: Sidebar Filters + Leaflet Map (60vh) + Info Panel */}
      <div className="relative flex-1 flex flex-col lg:flex-row bg-[#0F172A] min-h-[60vh] lg:min-h-[75vh]">
        {/* Collapsible Left Filters */}
        <div
          className={`transition-all duration-300 z-10 flex-shrink-0 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 text-white ${
            filtersOpen ? 'w-full lg:w-72 p-5' : 'w-auto p-2 lg:p-3'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white"
            >
              <Filter className="w-4 h-4 text-cyan-400" />
              {filtersOpen && <span>Filters</span>}
              {!filtersOpen && (
                <span className="hidden lg:inline text-[10px] text-cyan-400">Show</span>
              )}
            </button>
            {filtersOpen && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 inline-flex items-center gap-1"
                title="Reset Filters"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="space-y-4 text-xs">
              {/* Type Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Disaster Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="all">All Disaster Types</option>
                  <option value="flood">🌊 Flood</option>
                  <option value="cyclone">🌀 Cyclone</option>
                  <option value="fire">🔥 Fire</option>
                  <option value="landslide">⛰️ Landslide</option>
                  <option value="earthquake">🌋 Earthquake</option>
                  <option value="storm">⛈️ Storm</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Severity
                </label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Operational Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="response_in_progress">Response in Progress</option>
                  <option value="reported">Pending Verification</option>
                </select>
              </div>

              {/* Count Indicator */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                Showing <strong className="text-white">{filteredDisasters.length}</strong> of{' '}
                {disasters.length} active incidents
              </div>
            </div>
          )}
        </div>

        {/* Center: Map Container (60vh minimum) */}
        <div className="relative flex-1 h-[60vh] lg:h-auto min-h-[60vh] w-full">
          <DisasterLeafletMap
            disasters={filteredDisasters}
            selectedDisaster={selectedDisaster}
            onSelectDisaster={(d) => setSelectedDisaster(d)}
          />
        </div>

        {/* Right Info Panel (Desktop) / Bottom Sheet (Mobile) */}
        {selectedDisaster && (
          <div className="z-10 w-full lg:w-96 flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[50vh] lg:max-h-[75vh]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedMeta?.emoji}</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base capitalize">
                    {selectedDisaster.disaster_type} Emergency
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>Reported {formatTimeAgo(selectedDisaster.created_at)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDisaster(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-3 pb-2">
              <SeverityBadge severity={selectedDisaster.severity} />
              <StatusBadge status={selectedDisaster.status} />
            </div>

            {/* Location & Coordinates */}
            <div className="py-2 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                <span>
                  {selectedDisaster.location_label ||
                    `Lat ${selectedDisaster.latitude?.toFixed(4)}, Lng ${selectedDisaster.longitude?.toFixed(4)}`}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pl-6">
                GPS: {selectedDisaster.latitude?.toFixed(4)}° N, {selectedDisaster.longitude?.toFixed(4)}° E
              </div>
            </div>

            {/* Volunteers Responding Count (Read-only) */}
            <div className="my-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800">Volunteers Responding</span>
              </div>
              <span className="font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                4 Active
              </span>
            </div>

            {/* Description */}
            <div className="space-y-1 my-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Situation Description
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedDisaster.description}
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-3 space-y-2 border-t border-slate-100">
              <Link
                href={`/disasters/${selectedDisaster.id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
              >
                <span>View Full Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {user && (
                <Link
                  href="/citizen/report"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
                >
                  <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Report an Update</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
