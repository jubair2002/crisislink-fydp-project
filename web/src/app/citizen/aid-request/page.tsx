'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  LifeBuoy,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/Toast';
import type { DisasterRow } from '@/types/admin';

// Dynamically load map
const ReportLeafletMap = dynamic(
  () => import('@/components/citizen/ReportLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-44 bg-surface-muted rounded-lg border border-surface-border flex items-center justify-center text-xs text-ink-muted">
        Loading map pin...
      </div>
    ),
  }
);

interface ResourceDefinition {
  id: string;
  label: string;
  icon: string;
  unit: string;
  defaultQty: number;
}

const AVAILABLE_RESOURCES: ResourceDefinition[] = [
  { id: 'food_packs', label: 'Food Packs', icon: '🍱', unit: 'packs', defaultQty: 4 },
  { id: 'drinking_water', label: 'Drinking Water', icon: '💧', unit: 'liters/cans', defaultQty: 10 },
  { id: 'medicine_kits', label: 'Medicine Kits', icon: '💊', unit: 'kits', defaultQty: 2 },
  { id: 'medical_supplies', label: 'Medical Supplies', icon: '🛡', unit: 'sets', defaultQty: 1 },
  { id: 'blankets', label: 'Blankets', icon: '🛏', unit: 'pcs', defaultQty: 4 },
  { id: 'clothes', label: 'Clothes', icon: '👕', unit: 'sets', defaultQty: 4 },
  { id: 'shelter_tents', label: 'Shelter Tents', icon: '⛺', unit: 'tents', defaultQty: 1 },
  { id: 'hygiene_kits', label: 'Hygiene Kits', icon: '🧴', unit: 'kits', defaultQty: 2 },
  { id: 'baby_food', label: 'Baby Food', icon: '🍼', unit: 'packs', defaultQty: 2 },
];

const URGENCY_LEVELS = [
  { id: 'low', label: 'Low', description: 'Needed in 48-72h' },
  { id: 'medium', label: 'Medium', description: 'Needed in 24h' },
  { id: 'high', label: 'High', description: 'Needed in 6-12h' },
  { id: 'critical', label: 'Critical', description: 'Immediate threat to survival' },
];

export default function CitizenAidRequestPage() {
  const searchParams = useSearchParams();
  const prefilledDisasterId = searchParams.get('disaster_id') || '';

  const { user } = useAuth();
  const supabase = createClient();

  const [activeDisasters, setActiveDisasters] = useState<DisasterRow[]>([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>(prefilledDisasterId);

  const [locationText, setLocationText] = useState('Chittagong Coastal Zone, Bangladesh');
  const [latitude, setLatitude] = useState<number>(22.3569);
  const [longitude, setLongitude] = useState<number>(91.7832);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [affectedPeople, setAffectedPeople] = useState<number>(4);

  const [selectedResources, setSelectedResources] = useState<Record<string, { checked: boolean; quantity: number }>>(
    () => {
      const initial: Record<string, { checked: boolean; quantity: number }> = {};
      AVAILABLE_RESOURCES.forEach((r) => {
        initial[r.id] = { checked: r.id === 'food_packs' || r.id === 'drinking_water', quantity: r.defaultQty };
      });
      return initial;
    }
  );

  const [urgency, setUrgency] = useState<string>('high');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDisasters() {
      try {
        const { data } = await supabase
          .from('disasters')
          .select('*')
          .neq('status', 'resolved')
          .neq('status', 'false_report')
          .order('created_at', { ascending: false });

        if (data) setActiveDisasters(data as DisasterRow[]);
      } catch (err) {
        console.error(err);
      }
    }
    loadDisasters();
  }, []);

  const toggleResource = (resourceId: string) => {
    setSelectedResources((prev) => {
      const current = prev[resourceId];
      const resDef = AVAILABLE_RESOURCES.find((r) => r.id === resourceId);
      return {
        ...prev,
        [resourceId]: {
          checked: !current?.checked,
          quantity: current?.quantity || resDef?.defaultQty || 1,
        },
      };
    });
  };

  const updateQuantity = (resourceId: string, delta: number) => {
    setSelectedResources((prev) => {
      const current = prev[resourceId];
      return {
        ...prev,
        [resourceId]: {
          ...current,
          quantity: Math.max(1, (current?.quantity || 1) + delta),
        },
      };
    });
  };

  const handlePositionChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      showToast.error('Please log in to submit an emergency aid request.');
      return;
    }

    const checkedResources = Object.entries(selectedResources).filter(
      ([, val]) => val.checked && val.quantity > 0
    );

    if (checkedResources.length === 0) {
      showToast.error('Select at least one resource kit.');
      return;
    }

    if (!locationText.trim()) {
      showToast.error('Please enter delivery location or shelter name.');
      return;
    }

    setSubmitting(true);
    try {
      const summaryItems = checkedResources.map(([resId, val]) => {
        const def = AVAILABLE_RESOURCES.find((r) => r.id === resId);
        return `${def?.label || resId} (${val.quantity})`;
      });
      const requestedItemSummary = summaryItems.join(', ');
      const totalQuantity = checkedResources.reduce((sum, [, val]) => sum + val.quantity, 0);

      // Insert into resource_requests
      const { data: requestRow, error: requestError } = await supabase
        .from('resource_requests')
        .insert({
          disaster_id: selectedDisasterId || null,
          requested_item: requestedItemSummary,
          quantity: totalQuantity,
          resource_type: checkedResources[0][0],
          status: 'open',
          requested_by: user.id,
          latitude,
          longitude,
          location_label: locationText.trim(),
          affected_people: affectedPeople,
          urgency,
          description: description.trim(),
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Insert into resource_request_items
      const itemRows = checkedResources.map(([resId, val]) => ({
        request_id: requestRow.id,
        resource_type: resId,
        quantity: val.quantity,
      }));

      await supabase.from('resource_request_items').insert(itemRows);

      setSubmittedRequestId(requestRow.id);
      showToast.success('Aid request logged successfully.');
    } catch (err: any) {
      console.error(err);
      showToast.error('Submission failed', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRequestId) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="rounded-lg bg-surface border border-surface-border p-6 shadow-card text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand grid place-items-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-ink">Emergency Aid Request Logged</h2>
            <p className="text-xs text-ink-muted mt-1">
              Your request has been prioritized for field volunteer units and relief supply depots.
            </p>
          </div>

          <div className="p-2.5 rounded-md bg-surface-muted border border-surface-border text-xs font-mono text-ink">
            Request ID: <span className="font-bold text-brand">{submittedRequestId}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/citizen/dashboard"
              className="py-2 px-3 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card text-center"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedRequestId(null);
                setDescription('');
              }}
              className="py-2 px-3 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition"
            >
              New Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink tracking-tight">Request Emergency Aid</h1>
        <p className="text-xs text-ink-muted">
          Specify required supplies, medicine kits, or shelter packs for your location.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-6">
        {/* Disaster Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            1. Related Disaster Incident
          </label>
          <div className="relative">
            <select
              value={selectedDisasterId}
              onChange={(e) => setSelectedDisasterId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-xs text-ink appearance-none focus:outline-none focus:ring-1 focus:ring-brand pr-8"
            >
              <option value="">Not related to a specific disaster (Standalone Emergency)</option>
              {activeDisasters.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.disaster_type?.toUpperCase()} — {d.location_label || 'Location Unspecified'} (Severity: {d.severity})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Location Text + Map Pin Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              2. Delivery Location / Shelter
            </label>
            <button
              type="button"
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{showMapPicker ? 'Hide Map' : 'Pick on Map'}</span>
            </button>
          </div>

          <input
            type="text"
            required
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Shelter school name, building or street address..."
            className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
          />

          {showMapPicker && (
            <div className="rounded-lg overflow-hidden border border-surface-border h-56 mt-2">
              <ReportLeafletMap
                latitude={latitude}
                longitude={longitude}
                severity={urgency}
                onPositionChange={handlePositionChange}
              />
            </div>
          )}
        </div>

        {/* Affected People Stepper */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            3. People Affected
          </label>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-surface-border rounded-lg bg-surface">
              <button
                type="button"
                onClick={() => setAffectedPeople((prev) => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-l-lg hover:bg-surface-muted text-ink flex items-center justify-center text-xs font-bold transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-12 text-center text-xs font-bold text-ink">
                {affectedPeople}
              </div>
              <button
                type="button"
                onClick={() => setAffectedPeople((prev) => prev + 1)}
                className="w-8 h-8 rounded-r-lg hover:bg-surface-muted text-ink flex items-center justify-center text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 4, 8, 15].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setAffectedPeople(cnt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    affectedPeople === cnt
                      ? 'bg-brand text-white'
                      : 'border border-surface-border bg-surface text-ink-muted hover:text-ink'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resources Multi-Select with Quantity */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            4. Required Supplies
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {AVAILABLE_RESOURCES.map((res) => {
              const state = selectedResources[res.id] || { checked: false, quantity: res.defaultQty };
              const isChecked = state.checked;

              return (
                <div
                  key={res.id}
                  className={`p-3 rounded-lg border transition ${
                    isChecked
                      ? 'border-brand bg-brand/5 shadow-xs'
                      : 'border-surface-border bg-surface hover:bg-surface-muted'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleResource(res.id)}
                      className="rounded text-brand focus:ring-brand border-surface-border"
                    />
                    <span className="text-base">{res.icon}</span>
                    <span className="text-xs font-medium text-ink">{res.label}</span>
                  </label>

                  {isChecked && (
                    <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                      <span className="text-ink-muted text-[11px]">Qty:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(res.id, -1)}
                          className="w-5 h-5 rounded border border-surface-border bg-surface hover:bg-surface-muted flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold text-ink">
                          {state.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(res.id, 1)}
                          className="w-5 h-5 rounded border border-surface-border bg-surface hover:bg-surface-muted flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgency */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            5. Urgency Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {URGENCY_LEVELS.map((level) => {
              const isSelected = urgency === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setUrgency(level.id)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    isSelected
                      ? 'border-brand bg-brand/5 shadow-xs'
                      : 'border-surface-border hover:bg-surface-muted'
                  }`}
                >
                  <span className="text-xs font-bold text-ink block">{level.label}</span>
                  <span className="text-[10px] text-ink-muted block mt-0.5">{level.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            6. Specific Needs (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Special medication requirements, pregnant mothers, infant formula..."
            rows={2}
            className="w-full p-2.5 rounded-lg border border-surface-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand resize-none"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 border-t border-surface-border">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LifeBuoy className="w-4 h-4" />
            )}
            <span>Submit Aid Request</span>
          </button>
        </div>
      </form>
    </div>
  );
}
