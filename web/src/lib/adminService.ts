import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/auth';
import type {
  AdminLogRow,
  PaginatedUsers,
  PaginatedVolunteers,
  TaskAssignmentRow,
  UserListFilters,
  VolunteerDetailPayload,
  VolunteerListFilters,
  VolunteerListRow,
} from '@/types/admin';

const DEFAULT_PAGE_SIZE = 20;

function db() {
  try {
    return createServiceClient();
  } catch (error) {
    throw new Error(
      '[Admin setup] Service-role Supabase client failed. Check SUPABASE_SERVICE_ROLE_KEY in your web env.',
      { cause: error },
    );
  }
}

function unwrapAdminError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.message.includes('Invalid API key')) {
      return new Error(
        '[Admin setup] Invalid SUPABASE_SERVICE_ROLE_KEY. Use the project service_role key (not anon/publishable key).',
      );
    }
    return error;
  }
  return new Error('Unknown admin service error');
}

export async function logAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown> | null,
): Promise<void> {
  const supabase = db();
  const { error } = await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? null,
    timestamp: new Date().toISOString(),
  });
  if (error) console.error('[adminService] logAction failed:', error.message);
}

async function insertVolunteerNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
): Promise<void> {
  const supabase = db();
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    is_read: false,
  });
  if (error) console.error('[adminService] notification insert failed:', error.message);
}

export async function getDistinctProfileCities(): Promise<string[]> {
  const supabase = db();
  const { data, error } = await supabase.from('profiles').select('city');
  if (error || !data) return [];
  const cities = new Set<string>();
  for (const row of data) {
    const c = row.city?.trim();
    if (c) cities.add(c);
  }
  return [...cities].sort((a, b) => a.localeCompare(b));
}

export async function getAllUsers(
  filters: UserListFilters,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedUsers> {
  const supabase = db();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase.from('profiles').select('*', { count: 'exact' });

  const search = filters.search?.trim();
  if (search) {
    const esc = search.replace(/%/g, '\\%');
    q = q.or(`name.ilike.%${esc}%,email.ilike.%${esc}%`);
  }
  if (filters.role) q = q.eq('role', filters.role);
  if (filters.city) q = q.eq('city', filters.city);
  if (filters.status) q = q.eq('account_status', filters.status);
  if (filters.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);

  q = q.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw unwrapAdminError(new Error(error.message));
  return {
    rows: (data as Profile[]) ?? [],
    total: count ?? 0,
    page: safePage,
    pageSize,
  };
}

/** Export up to this many rows for CSV to avoid accidental huge downloads. */
const EXPORT_CAP = 10_000;

export async function getUsersForExport(filters: UserListFilters): Promise<Profile[]> {
  const supabase = db();

  let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(EXPORT_CAP);

  const search = filters.search?.trim();
  if (search) {
    const esc = search.replace(/%/g, '\\%');
    q = q.or(`name.ilike.%${esc}%,email.ilike.%${esc}%`);
  }
  if (filters.role) q = q.eq('role', filters.role);
  if (filters.city) q = q.eq('city', filters.city);
  if (filters.status) q = q.eq('account_status', filters.status);
  if (filters.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);

  const { data, error } = await q;
  if (error) throw unwrapAdminError(new Error(error.message));
  return (data as Profile[]) ?? [];
}

export async function getUserById(profileId: string): Promise<Profile | null> {
  const supabase = db();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (error) throw unwrapAdminError(new Error(error.message));
  return (data as Profile) ?? null;
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = db();
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw unwrapAdminError(new Error(error.message));
  return (data as Profile) ?? null;
}

export async function blockUser(adminId: string, userId: string): Promise<void> {
  const supabase = db();
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new Error('User not found');

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'blocked', updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw unwrapAdminError(new Error(error.message));

  await logAction(adminId, 'blocked_user', 'profile', profile.id, { target_user_id: userId });
}

export async function unblockUser(adminId: string, userId: string): Promise<void> {
  const supabase = db();
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new Error('User not found');

  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'active', updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw unwrapAdminError(new Error(error.message));

  await logAction(adminId, 'unblocked_user', 'profile', profile.id, { target_user_id: userId });
}

export async function upgradeToVolunteer(adminId: string, userId: string): Promise<void> {
  const supabase = db();
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new Error('User not found');
  if (profile.role === 'admin') throw new Error('Cannot change role for an admin account.');

  const { error: pErr } = await supabase
    .from('profiles')
    .update({
      role: 'volunteer',
      profile_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (pErr) throw new Error(pErr.message);

  const { data: existing } = await supabase.from('volunteers').select('id').eq('user_id', userId).maybeSingle();

  if (!existing) {
    const { error: vErr } = await supabase.from('volunteers').insert({
      user_id: userId,
      skills: [],
      preferred_disaster_types: [],
      verification_status: 'pending',
      volunteer_type: 'casual',
      has_previous_experience: false,
      years_of_experience: 0,
      availability_status: 'offline',
    });
    if (vErr) throw new Error(vErr.message);
  }

  await logAction(adminId, 'upgraded_to_volunteer', 'profile', profile.id, { target_user_id: userId });
}

export async function sendPasswordResetForUser(adminId: string, userId: string): Promise<void> {
  const profile = await getProfileByUserId(userId);
  if (!profile?.email) throw new Error('User not found');

  const supabase = db();
  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:3000');
  const redirectTo =
    process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT ?? `${origin.replace(/\/$/, '')}/login`;

  const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { redirectTo });
  if (error) throw unwrapAdminError(new Error(error.message));

  await logAction(adminId, 'password_reset_sent', 'profile', profile.id, {
    target_user_id: userId,
  });
}

export async function getAllVolunteers(
  filters: VolunteerListFilters,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedVolunteers> {
  const supabase = db();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase.from('volunteers').select('*', { count: 'exact' });

  if (filters.verificationStatus) q = q.eq('verification_status', filters.verificationStatus);
  if (filters.skill) q = q.contains('skills', [filters.skill]);
  if (filters.availability) q = q.eq('availability', filters.availability);

  q = q
    .order('verification_sort', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await q;
  if (error) throw unwrapAdminError(new Error(error.message));

  const volunteerRows = (data ?? []) as Record<string, unknown>[];
  const userIds = volunteerRows
    .map((r) => (typeof r.user_id === 'string' ? r.user_id : null))
    .filter((v): v is string => !!v);
  const profileByUserId = await getProfilesMapByUserIds(userIds);

  const rows: VolunteerListRow[] = volunteerRows.map((row) => {
    const userId = typeof row.user_id === 'string' ? row.user_id : '';
    return {
      ...(row as unknown as VolunteerListRow),
      profile: userId ? (profileByUserId.get(userId) ?? null) : null,
    };
  });

  return {
    rows,
    total: count ?? 0,
    page: safePage,
    pageSize,
  };
}

export async function getVolunteerRowById(volunteerId: string): Promise<VolunteerListRow | null> {
  const supabase = db();
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', volunteerId)
    .maybeSingle();

  if (error) throw unwrapAdminError(new Error(error.message));
  if (!data) return null;
  const rest = data as Record<string, unknown>;
  const userId = typeof rest.user_id === 'string' ? rest.user_id : '';
  const profileByUserId = userId ? await getProfilesMapByUserIds([userId]) : new Map();
  return {
    ...(rest as unknown as VolunteerListRow),
    profile: userId ? (profileByUserId.get(userId) ?? null) : null,
  };
}

async function getProfilesMapByUserIds(
  userIds: string[],
): Promise<Map<string, VolunteerListRow['profile']>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const supabase = db();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,name,email,city,phone,profile_photo_url')
    .in('user_id', uniqueIds);
  if (error) throw unwrapAdminError(new Error(error.message));

  const map = new Map<string, VolunteerListRow['profile']>();
  for (const row of data ?? []) {
    if (!row.user_id) continue;
    map.set(row.user_id, {
      name: row.name,
      email: row.email,
      city: row.city,
      phone: row.phone,
      profile_photo_url: row.profile_photo_url,
    });
  }
  return map;
}

export async function getVolunteerDetail(volunteerId: string): Promise<VolunteerDetailPayload | null> {
  const row = await getVolunteerRowById(volunteerId);
  if (!row?.user_id) return null;

  const supabase = db();

  const profile = await getProfileByUserId(row.user_id);

  const { data: assigns, error: aErr } = await supabase
    .from('task_assignments')
    .select(
      `
      id, task_id, volunteer_id, status, accepted_at, completed_at,
      tasks (
        id, disaster_id, help_type, priority, status, created_at
      )
    `,
    )
    .eq('volunteer_id', row.user_id)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false });

  if (aErr) throw new Error(aErr.message);

  const { data: logs, error: lErr } = await supabase
    .from('admin_logs')
    .select('id, admin_id, action, entity_type, entity_id, timestamp, details')
    .eq('entity_type', 'volunteer')
    .eq('entity_id', volunteerId)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (lErr) throw new Error(lErr.message);

  const rawAssigns = assigns ?? [];
  const assignments: TaskAssignmentRow[] = rawAssigns.map((a) => {
    const row = a as TaskAssignmentRow & { tasks: TaskAssignmentRow['tasks'] | TaskAssignmentRow['tasks'][] };
    let tasks = row.tasks;
    if (Array.isArray(tasks)) tasks = tasks[0] ?? null;
    return { ...row, tasks };
  });
  const auditLog: AdminLogRow[] = (logs ?? []).map((l) => ({
    ...l,
    details: (l.details as Record<string, unknown>) ?? null,
  }));

  const { profile: _joined, ...volunteer } = row;

  return {
    volunteer,
    profile,
    assignments,
    auditLog,
  };
}

export async function approveVolunteer(adminId: string, volunteerId: string): Promise<void> {
  const supabase = db();
  const { data: row, error: fetchErr } = await supabase
    .from('volunteers')
    .select('id, user_id')
    .eq('id', volunteerId)
    .single();
  if (fetchErr || !row?.user_id) throw new Error(fetchErr?.message ?? 'Volunteer not found');

  const { error } = await supabase
    .from('volunteers')
    .update({
      verification_status: 'approved',
      volunteer_type: 'verified',
    })
    .eq('id', volunteerId);
  if (error) throw unwrapAdminError(new Error(error.message));

  await logAction(adminId, 'approved_volunteer', 'volunteer', volunteerId);
  await insertVolunteerNotification(
    row.user_id,
    'volunteer_verification',
    'Volunteer application approved',
    'Your volunteer application has been approved. You can now receive task assignments in the app.',
  );
}

export async function rejectVolunteer(
  adminId: string,
  volunteerId: string,
  reason: string,
): Promise<void> {
  const supabase = db();
  const { data: row, error: fetchErr } = await supabase
    .from('volunteers')
    .select('id, user_id')
    .eq('id', volunteerId)
    .single();
  if (fetchErr || !row?.user_id) throw new Error(fetchErr?.message ?? 'Volunteer not found');

  const { error } = await supabase.from('volunteers').update({ verification_status: 'rejected' }).eq('id', volunteerId);
  if (error) throw unwrapAdminError(new Error(error.message));

  await logAction(adminId, 'rejected_volunteer', 'volunteer', volunteerId, { reason });
  await insertVolunteerNotification(
    row.user_id,
    'volunteer_verification',
    'Volunteer application update',
    `Your volunteer application was rejected. Reason: ${reason}`,
  );
}

export async function suspendVolunteer(
  adminId: string,
  volunteerId: string,
  reason: string,
): Promise<void> {
  const supabase = db();
  const { data: row, error: fetchErr } = await supabase
    .from('volunteers')
    .select('id, user_id')
    .eq('id', volunteerId)
    .single();
  if (fetchErr || !row?.user_id) throw new Error(fetchErr?.message ?? 'Volunteer not found');

  const { error } = await supabase.from('volunteers').update({ verification_status: 'suspended' }).eq('id', volunteerId);
  if (error) throw unwrapAdminError(new Error(error.message));

  await logAction(adminId, 'suspended_volunteer', 'volunteer', volunteerId, { reason });
  await insertVolunteerNotification(
    row.user_id,
    'volunteer_verification',
    'Volunteer account suspended',
    `Your volunteer status was suspended. Reason: ${reason}`,
  );
}

export async function countPendingVolunteers(): Promise<number> {
  const supabase = db();
  const { count, error } = await supabase
    .from('volunteers')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending');
  if (error) {
    console.error('[adminService] countPendingVolunteers:', error.message);
    return 0;
  }
  return count ?? 0;
}
