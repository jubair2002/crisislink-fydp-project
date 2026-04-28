/** Labels aligned with mobile `profile.ts` option values. */

export const SKILL_LABELS: Record<string, string> = {
  medical_assistance: 'Medical Assistance',
  search_rescue: 'Search & Rescue',
  food_distribution: 'Food Distribution',
  logistics_support: 'Logistics Support',
  engineering_support: 'Engineering Support',
  psychological_support: 'Psychological Support',
  other: 'Other',
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  emergency_only: 'Emergency only',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const formatSkill = (s: string) => SKILL_LABELS[s] ?? s.replace(/_/g, ' ');

export const formatAvailability = (a: string | null | undefined) =>
  (a && AVAILABILITY_LABELS[a]) ?? a ?? '—';

export const formatVerification = (v: string | null | undefined) =>
  (v && VERIFICATION_LABELS[v]) ?? v ?? '—';
