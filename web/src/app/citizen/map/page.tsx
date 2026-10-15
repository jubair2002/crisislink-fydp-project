'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Compass,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DisasterRow } from '@/types/admin';

// Dynamically import Leaflet Map to avoid SSR issues
const DisasterLeafletMap = dynamic(
  () => import('@/components/map/DisasterLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] bg-surface rounded-lg border border-surface-border flex items-center justify-center text-xs text-ink-muted">
        Loading live disaster map...
      </div>
    ),
  }
);

function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return 'recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CitizenMapPage() {
  const [disasters, setDisasters] = useState<DisasterRow[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterRow | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDisasters() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('disasters')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setDisasters(data as DisasterRow[]);
          if (data.length > 0) setSelectedDisaster(data[0] as DisasterRow);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDisasters();
  }, []);

  const filteredDisasters = disasters.filter((d) => {
    const matchesSearch =
      !search ||
      d.disaster_type?.toLowerCase().includes(search.toLowerCase()) ||
      d.location_label?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'all' ||
      d.severity?.toLowerCase() === selectedSeverity.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Active Disasters Map</h1>
          <p className="text-xs text-ink-muted">
            Live geospatial tracking of reported incidents across Bangladesh.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/citizen/report"
            className="px-3.5 py-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Report Disaster</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Map (Left/Center) + Incident List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-190px)] min-h-[580px]">
        {/* MAP CONTAINER (8 cols) */}
        <div className="lg:col-span-8 rounded-lg overflow-hidden border border-surface-border shadow-card bg-surface relative flex flex-col">
          <div className="flex-1 w-full h-full relative">
            <DisasterLeafletMap
              disasters={filteredDisasters}
              selectedDisaster={selectedDisaster}
              onSelectDisaster={(d) => setSelectedDisaster(d)}
            />
          </div>
        </div>

        {/* SIDE PANEL: INCIDENTS LIST (4 cols) */}
        <div className="lg:col-span-4 rounded-lg border border-surface-border shadow-card bg-surface flex flex-col overflow-hidden">
          {/* Filters Bar */}
          <div className="p-3 border-b border-surface-border space-y-2 bg-surface-muted/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search location or type..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-surface-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition ${
                    selectedSeverity === sev
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-surface text-ink-muted border border-surface-border hover:text-ink'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-surface-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredDisasters.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                No disasters found matching your filter criteria.
              </div>
            ) : (
              filteredDisasters.map((d) => {
                const isSelected = selectedDisaster?.id === d.id;
                const isCritical = d.severity === 'critical';
                const isHigh = d.severity === 'high';

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDisaster(d)}
                    className={`p-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-brand/5 border-l-4 border-l-brand'
                        : 'hover:bg-surface-muted/60 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold capitalize text-ink">
                            {d.disaster_type}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              isCritical
                                ? 'bg-brand-danger/10 text-brand-danger'
                                : isHigh
                                ? 'bg-brand-warning/10 text-brand-warning'
                                : 'bg-brand/10 text-brand'
                            }`}
                          >
                            {d.severity}
                          </span>
                        </div>

                        <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{d.location_label || 'Coordinates only'}</span>
                        </p>
                      </div>

                      <span className="text-[10px] text-ink-muted shrink-0">
                        {formatTimeAgo(d.created_at)}
                      </span>
                    </div>

                    {d.description && (
                      <p className="text-[11px] text-ink-muted line-clamp-2 mt-1.5">
                        {d.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-surface-border/60">
                      <Link
                        href={`/citizen/aid-request?disaster_id=${d.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-medium text-brand hover:underline"
                      >
                        Request Aid
                      </Link>

                      <Link
                        href={`/disasters/${d.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-medium text-ink-muted hover:text-ink flex items-center gap-1"
                      >
                        <span>Details</span>
                        <Eye className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
