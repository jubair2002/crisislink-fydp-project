import { createClient } from '@/lib/supabase/server';

export interface DashboardSummary {
  totalUsers: number;
  activeVolunteers: number;
  activeDisasters: number;
  ongoingCampaigns: number;
  totalDonations: number;
  pendingReports: number;
}

export interface UserSignupPoint {
  date: string;
  label: string;
  count: number;
}

export interface DisasterTypeCount {
  type: string;
  label: string;
  count: number;
}

export interface VolunteerSkillCount {
  skill: string;
  label: string;
  count: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  signupsLast30Days: UserSignupPoint[];
  disastersByTypeThisMonth: DisasterTypeCount[];
  volunteersBySkill: VolunteerSkillCount[];
}

const formatLabel = (slug: string): string =>
  slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const tryCount = async (
  query: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> => {
  try {
    const { count, error } = await query();
    if (error) {
      // Table may not exist yet — surface 0 rather than crashing the page.
      console.warn('[dashboard] count query failed:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn('[dashboard] count query threw:', err);
    return 0;
  }
};

const trySum = async <T extends Record<string, unknown>>(
  query: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  field: keyof T,
): Promise<number> => {
  try {
    const { data, error } = await query();
    if (error || !data) {
      if (error) console.warn('[dashboard] sum query failed:', error.message);
      return 0;
    }
    return data.reduce<number>((acc, row) => {
      const value = row[field];
      const n = typeof value === 'number' ? value : Number(value ?? 0);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  } catch (err) {
    console.warn('[dashboard] sum query threw:', err);
    return 0;
  }
};

const tryRows = async <T>(
  query: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> => {
  try {
    const { data, error } = await query();
    if (error || !data) {
      if (error) console.warn('[dashboard] rows query failed:', error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.warn('[dashboard] rows query threw:', err);
    return [];
  }
};

const buildDailySignupSeries = (
  rows: { created_at: string }[],
  days = 30,
): UserSignupPoint[] => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => {
    const d = new Date(`${date}T00:00:00Z`);
    return {
      date,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count,
    };
  });
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const supabase = await createClient();

  const since30 = new Date();
  since30.setUTCDate(since30.getUTCDate() - 30);
  since30.setUTCHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeVolunteers,
    activeDisasters,
    ongoingCampaigns,
    totalDonations,
    pendingReports,
    signupRows,
    disasterRows,
    volunteerSkillRows,
  ] = await Promise.all([
    tryCount(() =>
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ),
    tryCount(() =>
      supabase
        .from('volunteers')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'approved'),
    ),
    tryCount(() =>
      supabase
        .from('disasters')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'resolved'),
    ),
    tryCount(() =>
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ),
    trySum<{ collected_amount: number | null }>(
      () => supabase.from('campaigns').select('collected_amount'),
      'collected_amount',
    ),
    tryCount(() =>
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted'),
    ),
    tryRows<{ created_at: string }>(() =>
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', since30.toISOString()),
    ),
    tryRows<{ disaster_type: string | null }>(() =>
      supabase
        .from('disasters')
        .select('disaster_type')
        .gte('created_at', startOfMonth.toISOString()),
    ),
    tryRows<{ skills: string[] | null }>(() =>
      supabase.from('volunteers').select('skills').eq('verification_status', 'approved'),
    ),
  ]);

  const signupsLast30Days = buildDailySignupSeries(signupRows);

  const disasterCounts = new Map<string, number>();
  for (const row of disasterRows) {
    const key = row.disaster_type ?? 'unknown';
    disasterCounts.set(key, (disasterCounts.get(key) ?? 0) + 1);
  }
  const disastersByTypeThisMonth: DisasterTypeCount[] = [...disasterCounts.entries()]
    .map(([type, count]) => ({ type, label: formatLabel(type), count }))
    .sort((a, b) => b.count - a.count);

  const skillCounts = new Map<string, number>();
  for (const row of volunteerSkillRows) {
    const skills = Array.isArray(row.skills) ? row.skills : [];
    for (const skill of skills) {
      if (typeof skill !== 'string') continue;
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }
  const volunteersBySkill: VolunteerSkillCount[] = [...skillCounts.entries()]
    .map(([skill, count]) => ({ skill, label: formatLabel(skill), count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalUsers,
      activeVolunteers,
      activeDisasters,
      ongoingCampaigns,
      totalDonations,
      pendingReports,
    },
    signupsLast30Days,
    disastersByTypeThisMonth,
    volunteersBySkill,
  };
};
