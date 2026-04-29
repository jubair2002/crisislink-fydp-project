import type { DisasterSeverity } from '../types/disaster';

/** Marker colors — match product spec */
export const SEVERITY_MARKER_COLORS: Record<DisasterSeverity, string> = {
  low: '#F59E0B',
  medium: '#F97316',
  high: '#EF4444',
  critical: '#991B1B',
};

export const SEVERITY_LABELS: Record<DisasterSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  verified: 'Verified',
  rejected: 'Rejected',
  false_report: 'Rejected',
  resolved: 'Resolved',
};
