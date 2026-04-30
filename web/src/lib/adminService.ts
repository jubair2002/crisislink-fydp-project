import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/auth';
import type {
  AdminLogRow,
  DisasterDetailPayload,
  DisasterFilters,
  DisasterMediaRow,
  DisasterRow,
  DisasterUpdateRow,
  PaginatedUsers,
  PaginatedVolunteers,
  ResourceRequestRow,
  TaskFilters,
  TaskRow,
  TaskAssignmentRow,
  UserListFilters,
  VolunteerCandidate,
  DisasterVerificationRow,
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

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toDisasterRow(row: Record<string, unknown>): DisasterRow {
  return {
    id: String(row.id ?? ''),
    disaster_type: (row.disaster_type as string | null) ?? null,
    location_label: (row.location_label as string | null) ?? null,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    severity: (row.severity as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    reporter_user_id: (row.reporter_user_id as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    verified_by_user_id: (row.verified_by_user_id as string | null) ?? null,
    verification_notes: (row.verification_notes as string | null) ?? null,
    verified_at: (row.verified_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

function normalizeTaskRow(row: Record<string, unknown>): TaskRow {
  return {
    id: String(row.id ?? ''),
    disaster_id: (row.disaster_id as string | null) ?? null,
    help_type: (row.help_type as string | null) ?? null,
    priority: (row.priority as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    assignment_mode: (row.assignment_mode as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export async function getDisasters(filters: DisasterFilters): Promise<DisasterRow[]> {
  const supabase = db();
  let q = supabase.from('disasters').select('*');
  if (filters.type) q = q.eq('disaster_type', filters.type);
  if (filters.severity) q = q.eq('severity', filters.severity);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
  const sortBy = filters.sortBy ?? 'created_at';
  const ascending = filters.sortDir === 'asc';
  q = q.order(sortBy, { ascending });

  const { data, error } = await q.limit(500);
  if (error) throw unwrapAdminError(new Error(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map(toDisasterRow);
}

export async function getDisasterByIdForAdmin(id: string): Promise<DisasterRow | null> {
  const supabase = db();
  const { data, error } = await supabase.from('disasters').select('*').eq('id', id).maybeSingle();
  if (error) throw unwrapAdminError(new Error(error.message));
  if (!data) return null;
  return toDisasterRow(data as Record<string, unknown>);
}

export async function updateDisasterStatus(
  adminId: string,
  disasterId: string,
  status: 'verified' | 'false_report' | 'resolved',
): Promise<void> {
  const supabase = db();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'verified') {
    patch.verified_by_user_id = adminId;
    patch.verified_at = new Date().toISOString();
  }
  const updatePayload: Record<string, unknown> = { ...patch };
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const { error } = await supabase.from('disasters').update(updatePayload).eq('id', disasterId);
    if (!error) break;
    const msg = error.message ?? '';
    const missing = /'([^']+)'/.exec(msg)?.[1];
    if (!/schema cache/i.test(msg) || !missing || !(missing in updatePayload)) {
      throw unwrapAdminError(new Error(msg));
    }
    delete updatePayload[missing];
    if (attempts === 9) throw unwrapAdminError(new Error(msg));
  }
  await logAction(adminId, `disaster_${status}`, 'disaster', disasterId);
}

export async function updateDisasterSeverityByAdmin(
  adminId: string,
  disasterId: string,
  severity: string,
): Promise<void> {
  const supabase = db();
  const { error } = await supabase
    .from('disasters')
    .update({ severity, updated_at: new Date().toISOString() })
    .eq('id', disasterId);
  if (error) throw unwrapAdminError(new Error(error.message));
  await logAction(adminId, 'disaster_severity_updated', 'disaster', disasterId, { severity });
}

export async function addDisasterOfficialUpdate(
  adminId: string,
  disasterId: string,
  text: string,
): Promise<void> {
  const supabase = db();
  const body = text.trim();
  if (!body) throw new Error('Update text is required.');
  const { error } = await supabase.from('disaster_updates').insert({
    disaster_id: disasterId,
    user_id: adminId,
    body_text: body,
  });
  if (error) throw unwrapAdminError(new Error(error.message));
  await logAction(adminId, 'disaster_official_update_added', 'disaster', disasterId, { text: body });
}

export async function getTasks(filters: TaskFilters): Promise<TaskRow[]> {
  const supabase = db();
  let q = supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(500);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.assignmentMode) q = q.eq('assignment_mode', filters.assignmentMode);
  if (filters.priority) q = q.eq('priority', filters.priority);
  const { data, error } = await q;
  if (error) throw unwrapAdminError(new Error(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeTaskRow);
}

export async function getTaskById(taskId: string): Promise<TaskRow | null> {
  const supabase = db();
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
  if (error) throw unwrapAdminError(new Error(error.message));
  if (!data) return null;
  return normalizeTaskRow(data as Record<string, unknown>);
}

export async function getAssignmentsForTasks(taskIds: string[]): Promise<TaskAssignmentRow[]> {
  if (taskIds.length === 0) return [];
  const supabase = db();
  const { data, error } = await supabase
    .from('task_assignments')
    .select('id, task_id, volunteer_id, status, accepted_at, completed_at')
    .in('task_id', [...new Set(taskIds)]);
  if (error) throw unwrapAdminError(new Error(error.message));
  return ((data ?? []) as TaskAssignmentRow[]) ?? [];
}

async function getProfileMapByUserIds(
  userIds: string[],
): Promise<Map<string, { name: string | null; email: string | null; phone: string | null; city: string | null }>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = db();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,name,email,phone,city')
    .in('user_id', unique);
  if (error) throw unwrapAdminError(new Error(error.message));
  const m = new Map<string, { name: string | null; email: string | null; phone: string | null; city: string | null }>();
  for (const row of data ?? []) {
    if (!row.user_id) continue;
    m.set(row.user_id, {
      name: row.name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      city: row.city ?? null,
    });
  }
  return m;
}

export async function getDisasterDetailPayload(id: string): Promise<DisasterDetailPayload | null> {
  const supabase = db();
  const disaster = await getDisasterByIdForAdmin(id);
  if (!disaster) return null;

  const safeQuery = async <T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) => {
    const { data, error } = await query;
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(error.message)) return [] as T[];
      throw unwrapAdminError(new Error(error.message));
    }
    return data ?? [];
  };

  const [media, updates, records, tasks, resourceRequests] = await Promise.all([
    safeQuery<Record<string, unknown>>(
      supabase.from('disaster_media').select('*').eq('disaster_id', id).order('created_at', { ascending: true }),
    ),
    safeQuery<Record<string, unknown>>(
      supabase.from('disaster_updates').select('*').eq('disaster_id', id).order('created_at', { ascending: true }),
    ),
    safeQuery<Record<string, unknown>>(
      supabase
        .from('volunteer_verifications')
        .select('*')
        .eq('disaster_id', id)
        .order('created_at', { ascending: false }),
    ),
    safeQuery<Record<string, unknown>>(
      supabase.from('tasks').select('*').eq('disaster_id', id).order('created_at', { ascending: false }),
    ),
    safeQuery<Record<string, unknown>>(supabase.from('resource_requests').select('*').eq('disaster_id', id)),
  ]);

  const taskRows = (tasks as Record<string, unknown>[]).map(normalizeTaskRow);
  const taskIds = taskRows.map((t) => t.id).filter(Boolean);
  const assignments = await getAssignmentsForTasks(taskIds);

  const profileMap = await getProfileMapByUserIds(
    [disaster.reporter_user_id ?? '', disaster.verified_by_user_id ?? ''].filter(Boolean),
  );

  return {
    disaster,
    reporter: disaster.reporter_user_id ? (profileMap.get(disaster.reporter_user_id) ?? null) : null,
    verifier: disaster.verified_by_user_id
      ? (() => {
          const p = profileMap.get(disaster.verified_by_user_id);
          if (!p) return null;
          return { name: p.name, email: p.email };
        })()
      : null,
    media: (media as Record<string, unknown>[]).map(
      (row): DisasterMediaRow => ({
        id: String(row.id ?? ''),
        disaster_id: String(row.disaster_id ?? id),
        public_url: (row.public_url as string | null) ?? (row.file_url as string | null) ?? null,
        media_type: (row.media_type as string) ?? 'photo',
        purpose: (row.purpose as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
      }),
    ),
    updates: (updates as Record<string, unknown>[]).map(
      (row): DisasterUpdateRow => ({
        id: String(row.id ?? ''),
        disaster_id: String(row.disaster_id ?? id),
        user_id: String(row.user_id ?? ''),
        body_text: String(row.body_text ?? ''),
        created_at: String(row.created_at ?? ''),
      }),
    ),
    verificationRecords: (records as Record<string, unknown>[]).map(
      (row): DisasterVerificationRow => ({
        id: String(row.id ?? ''),
        disaster_id: String(row.disaster_id ?? id),
        volunteer_id: String(row.volunteer_id ?? ''),
        status: (row.status as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
      }),
    ),
    tasks: taskRows,
    assignments,
    resourceRequests: (resourceRequests as Record<string, unknown>[]).map(
      (row): ResourceRequestRow => ({
        id: String(row.id ?? ''),
        disaster_id: String(row.disaster_id ?? id),
        requested_item: (row.requested_item as string | null) ?? (row.resource_type as string | null) ?? null,
        quantity: toNumber(row.quantity),
        status: (row.status as string | null) ?? null,
        requested_by: (row.requested_by as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
      }),
    ),
  };
}

export async function assignVolunteersToTask(
  adminId: string,
  taskId: string,
  volunteerUserIds: string[],
  options?: { reassign?: boolean; overrideAuto?: boolean },
): Promise<void> {
  const supabase = db();
  const uniqueIds = [...new Set(volunteerUserIds.filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error('Pick at least one volunteer.');

  if (options?.reassign) {
    const { error: delErr } = await supabase.from('task_assignments').delete().eq('task_id', taskId);
    if (delErr) throw unwrapAdminError(new Error(delErr.message));
  }

  const rows = uniqueIds.map((uid) => ({
    task_id: taskId,
    volunteer_id: uid,
    status: 'assigned',
    accepted_at: null,
    completed_at: null,
  }));
  const { error } = await supabase
    .from('task_assignments')
    .upsert(rows, { onConflict: 'task_id,volunteer_id' });
  if (error) throw unwrapAdminError(new Error(error.message));

  const mode = options?.overrideAuto ? 'admin' : undefined;
  const patch: Record<string, unknown> = { status: 'assigned', updated_at: new Date().toISOString() };
  if (mode) patch.assignment_mode = mode;
  const { error: taskErr } = await supabase.from('tasks').update(patch).eq('id', taskId);
  if (taskErr) throw unwrapAdminError(new Error(taskErr.message));

  const profileMap = await getProfileMapByUserIds(uniqueIds);
  for (const uid of uniqueIds) {
    await insertVolunteerNotification(
      uid,
      'task_assignment',
      'New task assignment',
      `You have been assigned a response task${profileMap.get(uid)?.name ? '' : ''}. Open CrisisLink to review.`,
    );
  }

  await logAction(adminId, 'task_volunteers_assigned', 'task', taskId, {
    volunteer_ids: uniqueIds,
    reassign: !!options?.reassign,
    override_auto: !!options?.overrideAuto,
  });
}

export async function approveTaskCompletion(adminId: string, taskId: string): Promise<void> {
  const supabase = db();
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', taskId);
  if (error) throw unwrapAdminError(new Error(error.message));
  await logAction(adminId, 'task_completion_approved', 'task', taskId);
}

export async function getVolunteerCandidatesForTask(taskId: string): Promise<VolunteerCandidate[]> {
  const supabase = db();
  const task = await getTaskById(taskId);
  if (!task) return [];
  const disaster = task.disaster_id ? await getDisasterByIdForAdmin(task.disaster_id) : null;

  const { data: volunteers, error } = await supabase
    .from('volunteers')
    .select('id,user_id,skills,rating,current_latitude,current_longitude,verification_status')
    .eq('verification_status', 'approved');
  if (error) throw unwrapAdminError(new Error(error.message));

  const rows = (volunteers ?? []) as Record<string, unknown>[];
  const profileMap = await getProfileMapByUserIds(rows.map((r) => String(r.user_id ?? '')));
  const requested = (task.help_type ?? '').toLowerCase();

  const candidates = rows.map((row): VolunteerCandidate => {
    const userId = String(row.user_id ?? '');
    const lat = toNumber(row.current_latitude);
    const lng = toNumber(row.current_longitude);
    const skills = Array.isArray(row.skills) ? row.skills.map(String) : [];
    const skillMatch = requested
      ? skills.some((s) => s.toLowerCase().includes(requested) || requested.includes(s.toLowerCase()))
        ? 1
        : 0
      : 0;
    const distanceKm =
      disaster?.latitude != null && disaster.longitude != null && lat != null && lng != null
        ? haversineKm(disaster.latitude, disaster.longitude, lat, lng)
        : null;
    return {
      volunteerId: String(row.id ?? ''),
      userId,
      name: profileMap.get(userId)?.name ?? 'Volunteer',
      rating: Number(row.rating ?? 0),
      skills,
      latitude: lat,
      longitude: lng,
      distanceKm,
      skillMatch,
    };
  });

  return candidates.sort((a, b) => {
    const dA = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const dB = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (dA !== dB) return dA - dB;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.skillMatch - a.skillMatch;
  });
}

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/disaster-media/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = publicUrl.slice(idx + marker.length);
  try {
    return decodeURIComponent(raw.split('?')[0] ?? raw);
  } catch {
    return raw.split('?')[0] ?? raw;
  }
}

export async function deleteDisasterAndAssets(adminId: string, disasterId: string): Promise<void> {
  const supabase = db();

  const { data: mediaRows, error: mediaErr } = await supabase
    .from('disaster_media')
    .select('*')
    .eq('disaster_id', disasterId);
  if (mediaErr && !/relation .* does not exist|Could not find the table/i.test(mediaErr.message)) {
    throw unwrapAdminError(new Error(mediaErr.message));
  }

  const storagePaths = ((mediaRows ?? []) as Record<string, unknown>[])
    .map((row) => {
      const direct = typeof row.storage_path === 'string' ? row.storage_path : null;
      if (direct) return direct;
      const url =
        typeof row.public_url === 'string'
          ? row.public_url
          : typeof row.file_url === 'string'
            ? row.file_url
            : null;
      return url ? extractStoragePathFromPublicUrl(url) : null;
    })
    .filter((p): p is string => !!p);

  if (storagePaths.length > 0) {
    const { error: storageErr } = await supabase.storage.from('disaster-media').remove(storagePaths);
    if (storageErr) console.warn('[adminService] deleteDisasterAndAssets storage remove failed:', storageErr.message);
  }

  const { data: taskRows, error: taskErr } = await supabase.from('tasks').select('id').eq('disaster_id', disasterId);
  if (taskErr && !/relation .* does not exist|Could not find the table/i.test(taskErr.message)) {
    throw unwrapAdminError(new Error(taskErr.message));
  }
  const taskIds = ((taskRows ?? []) as Array<{ id?: string }>).map((r) => r.id).filter((v): v is string => !!v);

  if (taskIds.length > 0) {
    const { error: assignErr } = await supabase.from('task_assignments').delete().in('task_id', taskIds);
    if (assignErr && !/relation .* does not exist|Could not find the table/i.test(assignErr.message)) {
      throw unwrapAdminError(new Error(assignErr.message));
    }
  }

  const optionalDeletes: Array<{ table: string; column: string }> = [
    { table: 'tasks', column: 'disaster_id' },
    { table: 'resource_requests', column: 'disaster_id' },
    { table: 'volunteer_verifications', column: 'disaster_id' },
    { table: 'disaster_updates', column: 'disaster_id' },
    { table: 'disaster_media', column: 'disaster_id' },
  ];

  for (const target of optionalDeletes) {
    const { error } = await supabase.from(target.table).delete().eq(target.column, disasterId);
    if (error && !/relation .* does not exist|Could not find the table/i.test(error.message)) {
      throw unwrapAdminError(new Error(error.message));
    }
  }

  const { error: delErr } = await supabase.from('disasters').delete().eq('id', disasterId);
  if (delErr) throw unwrapAdminError(new Error(delErr.message));

  await logAction(adminId, 'disaster_deleted', 'disaster', disasterId, {
    storage_paths_removed: storagePaths.length,
  });
}
