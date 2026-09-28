'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Filter,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  X,
  PlusCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/Navbar';
import { SeverityBadge, StatusBadge, DisasterIcon } from '@/components/DisasterBadge';
import { showToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { MapDisaster } from '@/components/LeafletMap';

const DynamicLeafletMap = dynamic(
  () => import('@/components/LeafletMap').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="md" text="Loading map..." />
      </div>
    ),
  }
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

export default function DisasterMapPage() {
  const [disasters, setDisasters] = useState<MapDisaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<MapDisaster | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        setUser(authData?.user || null);

        const { data, error } = await supabase
          .from('disasters')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setDisasters(data as MapDisaster[]);
          if (data.length > 0) {
            setSelectedDisaster(data[0] as MapDisaster);
          }
        }
      } catch (err) {
        console.error('Failed to load map disasters:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const channel = supabase
      .channel('public-disasters')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disasters' },
        (payload) => {
          showToast.warning('New disaster reported');
          if (payload.eventType === 'INSERT') {
            setDisasters((prev) => [payload.new as MapDisaster, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDisasters((prev) =>
              prev.map((d) => (d.id === payload.new.id ? (payload.new as MapDisaster) : d))
            );
            if (selectedDisaster?.id === payload.new.id) {
              setSelectedDisaster(payload.new as MapDisaster);
            }
          } else if (payload.eventType === 'DELETE') {
            setDisasters((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredDisasters = useMemo(() => {
    return disasters.filter((d) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(d.disaster_type || '')) {
        return false;
      }
      if (
        selectedSeverities.length > 0 &&
        !selectedSeverities.includes((d.severity || '').toLowerCase())
      ) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes((d.status || '').toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [disasters, selectedTypes, selectedSeverities, selectedStatuses]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    );
  };

  const toggleStatus = (st: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedSeverities([]);
    setSelectedStatuses([]);
  };

  const disasterTypesList = [
    { id: 'flood', label: 'Flood' },
    { id: 'cyclone', label: 'Cyclone' },
    { id: 'landslide', label: 'Landslide' },
    { id: 'fire', label: 'Fire' },
    { id: 'earthquake', label: 'Earthquake' },
  ];

  const severitiesList = [
    { id: 'critical', label: 'Critical', color: 'bg-red-900' },
    { id: 'high', label: 'High', color: 'bg-red-600' },
    { id: 'medium', label: 'Medium', color: 'bg-orange-500' },
    { id: 'low', label: 'Low', color: 'bg-amber-400' },
  ];

  const statusesList = [
    { id: 'verified', label: 'Verified' },
    { id: 'response_in_progress', label: 'Response in Progress' },
    { id: 'reported', label: 'Reported' },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <Navbar />

      <div className="relative flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLLAPSIBLE FILTER PANEL */}
        <div
          className={`absolute lg:relative z-20 h-full bg-white border-r border-slate-200 transition-all duration-200 flex flex-col ${
            filterPanelOpen
              ? 'w-72 translate-x-0'
              : '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'
          }`}
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
              Filter Incidents
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset
              </button>
              <button
                onClick={() => setFilterPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {/* By Disaster Type */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 block">Incident Type</span>
              <div className="space-y-1">
                {disasterTypesList.map((t) => {
                  const checked = selectedTypes.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="capitalize text-slate-700">{t.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleType(t.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* By Severity */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 block">Severity</span>
              <div className="space-y-1">
                {severitiesList.map((s) => {
                  const checked = selectedSeverities.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span className="text-slate-700">{s.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSeverity(s.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* By Status */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 block">Status</span>
              <div className="space-y-1">
                {statusesList.map((st) => {
                  const checked = selectedStatuses.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="text-slate-700">{st.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStatus(st.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MAP CONTAINER */}
        <div className="relative flex-1 h-[60vh] lg:h-full w-full">
          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-sm hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {filterPanelOpen ? 'Hide Filters' : 'Filters'}
          </button>

          <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-md bg-white/95 text-slate-800 text-xs font-medium shadow-sm border border-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{filteredDisasters.length} Active Incidents</span>
          </div>

          <DynamicLeafletMap
            disasters={filteredDisasters}
            selectedDisasterId={selectedDisaster?.id}
            onSelectDisaster={(d) => setSelectedDisaster(d)}
          />
        </div>

        {/* RIGHT INFO PANEL */}
        <div className="lg:w-80 w-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto flex flex-col justify-between z-10">
          {selectedDisaster ? (
            <div className="p-5 space-y-5 flex-1">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                      <DisasterIcon type={selectedDisaster.disaster_type} className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 capitalize">
                      {selectedDisaster.disaster_type?.replace('_', ' ') || 'Incident'}
                    </span>
                  </div>
                  <SeverityBadge severity={selectedDisaster.severity} size="sm" />
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {selectedDisaster.location_label ||
                      selectedDisaster.description?.split(':')[0] ||
                      'Bangladesh'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Reported {formatRelativeTime(selectedDisaster.created_at)}</span>
                  <span>•</span>
                  <StatusBadge status={selectedDisaster.status} size="sm" />
                </div>
              </div>

              {/* Volunteers Responding */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Volunteers responding</span>
                <span className="font-semibold text-slate-900">14 active</span>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase text-slate-400">Description</span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">
                  {selectedDisaster.description || 'Emergency situation report pending.'}
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/disasters/${selectedDisaster.id}`}
                  className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                >
                  View Full Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {user ? (
                  <Link
                    href={`/disasters/${selectedDisaster.id}#updates`}
                    className="w-full py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Report an Update
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="w-full text-center py-1.5 text-xs text-slate-500 hover:text-slate-700 block"
                  >
                    Sign in to report field updates
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 my-auto text-xs">
              Select an incident marker on the map to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
