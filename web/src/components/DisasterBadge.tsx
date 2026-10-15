import React from 'react';
import {
  Flame,
  Waves,
  Wind,
  Mountain,
  Activity,
  AlertTriangle,
  CloudRain,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export type DisasterSeverity = 'low' | 'medium' | 'high' | 'critical' | string;
export type DisasterStatus = 'reported' | 'verified' | 'response_in_progress' | 'resolved' | 'rejected' | string;

export function getDisasterTypeMeta(type: string | null | undefined) {
  const normalized = (type || 'other').toLowerCase();
  switch (normalized) {
    case 'flood':
      return { label: 'Flood', icon: Waves, color: 'text-blue-500', emoji: '🌊' };
    case 'cyclone':
      return { label: 'Cyclone', icon: Wind, color: 'text-teal-500', emoji: '🌀' };
    case 'fire':
      return { label: 'Fire', icon: Flame, color: 'text-amber-500', emoji: '🔥' };
    case 'landslide':
      return { label: 'Landslide', icon: Mountain, color: 'text-amber-700', emoji: '⛰️' };
    case 'earthquake':
      return { label: 'Earthquake', icon: Activity, color: 'text-rose-600', emoji: '🌋' };
    case 'storm':
      return { label: 'Storm', icon: CloudRain, color: 'text-indigo-500', emoji: '⛈️' };
    default:
      return { label: type || 'Emergency', icon: AlertTriangle, color: 'text-red-500', emoji: '⚠️' };
  }
}

export function SeverityBadge({ severity }: { severity: DisasterSeverity | null | undefined }) {
  const s = (severity || 'low').toLowerCase();

  switch (s) {
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-200 border border-rose-800 shadow-sm animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Critical
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          High Severity
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Low
        </span>
      );
  }
}

export function StatusBadge({ status }: { status: DisasterStatus | null | undefined }) {
  const st = (status || 'reported').toLowerCase();

  switch (st) {
    case 'response_in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Response in Progress
        </span>
      );
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          Verified
        </span>
      );
    case 'resolved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
          Resolved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Dismissed
        </span>
      );
    case 'reported':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Pending Verification
        </span>
      );
  }
}

export function DisasterTypeBadge({ type }: { type: string | null | undefined }) {
  const meta = getDisasterTypeMeta(type);
  const Icon = meta.icon;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      <span>{meta.label}</span>
    </span>
  );
}

export default function DisasterBadge({
  severity,
  status,
  type,
}: {
  severity?: DisasterSeverity | null;
  status?: DisasterStatus | null;
  type?: string | null;
}) {
  if (severity) return <SeverityBadge severity={severity} />;
  if (status) return <StatusBadge status={status} />;
  if (type) return <DisasterTypeBadge type={type} />;
  return null;
}
