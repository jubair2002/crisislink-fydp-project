import { supabase } from './supabaseClient';

export type TaskStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type AssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'timeout' | 'completed';

export interface TaskRow {
  id: string;
  disaster_id: string;
  task_type: string;
  help_type?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TaskStatus;
  required_volunteers: number;
  created_by: string | null;
  notes: string | null;
  proof_image_url: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
  disaster?: {
    id: string;
    disaster_type: string;
    severity: string;
    latitude: number;
    longitude: number;
    description: string;
  } | null;
}

export interface TaskAssignmentRow {
  id: string;
  task_id: string;
  volunteer_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  assignment_expires_at: string | null;
  volunteer?: {
    id: string;
    user_id: string;
    rating: number;
    current_latitude: number | null;
    current_longitude: number | null;
  } | null;
}

export interface TaskWithAssignment {
  assignment: TaskAssignmentRow;
  task: TaskRow;
  distanceKm: number | null;
  assignedCount: number;
  acceptedCount: number;
}

export interface CreateTaskPayload {
  disaster_id: string;
  task_type: string;
  priority?: TaskRow['priority'];
  required_volunteers?: number;
  notes?: string | null;
  created_by?: string | null;
  autoAssignRadiusKm?: number;
}

const DEFAULT_ASSIGNMENT_RADIUS_KM = 5;
const ASSIGNMENT_ACCEPTANCE_WINDOW_SEC = 30;

const friendlyError = (message: string): string => {
  if (message.includes('row-level security'))
    return 'You do not have permission to perform this action.';
  if (message.toLowerCase().includes('network'))
    return 'Network error. Check your connection and try again.';
  return message;
};

const toRad = (d: number) => (d * Math.PI) / 180;
const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};

const addSecondsIso = (sec: number): string => new Date(Date.now() + sec * 1000).toISOString();

const removeMissingColumnAndRetry = (
  message: string,
  payload: Record<string, unknown>,
): boolean => {
  const missing = /'([^']+)'/.exec(message)?.[1];
  if (!/schema cache|column/i.test(message) || !missing || !(missing in payload)) return false;
  delete payload[missing];
  return true;
};

const safeUpdateVolunteersByUserId = async (
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> => {
  const updatePayload: Record<string, unknown> = { ...patch };
  for (let i = 0; i < 8; i += 1) {
    const { error } = await supabase.from('volunteers').update(updatePayload).eq('user_id', userId);
    if (!error) return;
    if (!removeMissingColumnAndRetry(error.message ?? '', updatePayload)) {
      throw new Error(friendlyError(error.message));
    }
  }
  throw new Error('Could not update volunteer record: schema mismatch.');
};

const safeUpdateTaskById = async (
  taskId: string,
  patch: Record<string, unknown>,
): Promise<void> => {
  const updatePayload: Record<string, unknown> = { ...patch };
  for (let i = 0; i < 10; i += 1) {
    const { error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);
    if (!error) return;
    if (!removeMissingColumnAndRetry(error.message ?? '', updatePayload)) {
      throw new Error(friendlyError(error.message));
    }
  }
  throw new Error('Could not update task record: schema mismatch.');
};

const getTaskWithDisaster = async (taskId: string): Promise<TaskRow | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      disaster:disasters (
        id,
        disaster_type,
        severity,
        latitude,
        longitude,
        description
      )
    `,
    )
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));
  if (!data) return null;
  const row = data as TaskRow & { help_type?: string; task_type?: string };
  return {
    ...row,
    task_type: row.task_type ?? row.help_type ?? 'general_support',
  };
};

const getTaskAssignmentStats = async (
  taskIds: string[],
): Promise<Record<string, { assigned: number; accepted: number }>> => {
  if (!taskIds.length) return {};
  const { data, error } = await supabase
    .from('task_assignments')
    .select('task_id, status')
    .in('task_id', taskIds);
  if (error) throw new Error(friendlyError(error.message));

  const stats: Record<string, { assigned: number; accepted: number }> = {};
  for (const row of data ?? []) {
    const taskId = String(row.task_id);
    if (!stats[taskId]) stats[taskId] = { assigned: 0, accepted: 0 };
    if (row.status === 'assigned' || row.status === 'accepted' || row.status === 'completed') {
      stats[taskId].assigned += 1;
    }
    if (row.status === 'accepted' || row.status === 'completed') {
      stats[taskId].accepted += 1;
    }
  }
  return stats;
};

const getVolunteerByUserId = async (volunteerUserId: string) => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('user_id', volunteerUserId)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error.message));
  return data as {
    id: string;
    user_id: string;
    rating: number;
    current_latitude: number | null;
    current_longitude: number | null;
  } | null;
};

const listDeclinedVolunteerIds = async (taskId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('volunteer_id')
    .eq('task_id', taskId)
    .in('status', ['declined', 'timeout']);
  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((x) => String(x.volunteer_id));
};

const listAssignedVolunteerIds = async (taskId: string): Promise<string[]> => {
  const { data, error } = await supabase.from('task_assignments').select('volunteer_id').eq('task_id', taskId);
  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((x) => String(x.volunteer_id));
};

const findCandidateVolunteers = async (
  lat: number,
  lng: number,
  radiusKm: number,
  excludeVolunteerIds: string[],
) => {
  const { data, error } = await supabase
    .from('volunteers')
    .select(
      'id, user_id, rating, current_latitude, current_longitude, availability_status, verification_status',
    )
    .eq('availability_status', 'available')
    .eq('verification_status', 'approved');
  if (error) throw new Error(friendlyError(error.message));

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    rating: number | null;
    current_latitude: number | null;
    current_longitude: number | null;
  }>;

  if (!rows.length) return [];
  const profileUserIds = rows.map((r) => r.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, profile_completed')
    .in('user_id', profileUserIds);
  if (profileError) throw new Error(friendlyError(profileError.message));

  const profileCompleted = new Map<string, boolean>(
    (profiles ?? []).map((p) => [String(p.user_id), Boolean(p.profile_completed)]),
  );

  return rows
    .filter((row) => !excludeVolunteerIds.includes(row.id))
    .filter((row) => profileCompleted.get(row.user_id) === true)
    .map((row) => {
      const lat2 = row.current_latitude;
      const lng2 = row.current_longitude;
      if (lat2 === null || lng2 === null) return { row, distanceKm: Number.POSITIVE_INFINITY };
      return { row, distanceKm: haversineKm(lat, lng, lat2, lng2) };
    })
    .filter((x) => x.distanceKm <= radiusKm)
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return (b.row.rating ?? 0) - (a.row.rating ?? 0);
    });
};

async function assignNextVolunteer(taskId: string, radiusKm: number): Promise<boolean> {
  const task = await getTaskWithDisaster(taskId);
  if (!task || !task.disaster) return false;

  const assignmentIds = await listAssignedVolunteerIds(taskId);
  const declinedIds = await listDeclinedVolunteerIds(taskId);
  const excludedIds = Array.from(new Set([...assignmentIds, ...declinedIds]));
  const candidates = await findCandidateVolunteers(
    task.disaster.latitude,
    task.disaster.longitude,
    radiusKm,
    excludedIds,
  );
  if (!candidates.length) return false;

  const top = candidates[0];
  const assignmentPayload: Record<string, unknown> = {
    task_id: taskId,
    volunteer_id: top.row.user_id,
    status: 'assigned',
    assigned_at: new Date().toISOString(),
    assignment_expires_at: addSecondsIso(ASSIGNMENT_ACCEPTANCE_WINDOW_SEC),
  };
  for (let i = 0; i < 8; i += 1) {
    const { error } = await supabase.from('task_assignments').insert(assignmentPayload);
    if (!error) break;
    if (!removeMissingColumnAndRetry(error.message ?? '', assignmentPayload)) {
      throw new Error(friendlyError(error.message));
    }
    if (i === 7) throw new Error('Could not insert assignment: schema mismatch.');
  }

  await supabase
    .from('tasks')
    .update({ status: 'assigned', updated_at: new Date().toISOString() })
    .eq('id', taskId);

  return true;
}

export async function createTask(data: CreateTaskPayload): Promise<TaskRow> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_task_with_auto_assignment', {
    p_disaster_id: data.disaster_id,
    p_help_type: data.task_type,
    p_priority: data.priority ?? 'medium',
    p_required_volunteers: data.required_volunteers ?? 1,
    p_radius_km: data.autoAssignRadiusKm ?? DEFAULT_ASSIGNMENT_RADIUS_KM,
    p_assignment_mode: 'auto',
  });

  if (!rpcError && Array.isArray(rpcData) && rpcData[0]?.task_id) {
    const row = await getTaskWithDisaster(String(rpcData[0].task_id));
    if (!row) throw new Error('Task created but could not be loaded.');
    return row;
  }

  // Fallback for environments where the RPC does not exist yet.
  const { data: disasterRow } = await supabase
    .from('disasters')
    .select('latitude, longitude')
    .eq('id', data.disaster_id)
    .maybeSingle();
  const insertPayload = {
    disaster_id: data.disaster_id,
    help_type: data.task_type,
    priority: data.priority ?? 'medium',
    status: 'assigned',
    required_volunteers: data.required_volunteers ?? 1,
    assignment_mode: 'auto',
    location_lat: disasterRow?.latitude ?? null,
    location_lng: disasterRow?.longitude ?? null,
    created_at: new Date().toISOString(),
  };

  const { data: created, error } = await supabase.from('tasks').insert(insertPayload).select('*').single();
  if (error || !created) {
    const message = rpcError?.message || error?.message || 'Could not create task.';
    throw new Error(friendlyError(message));
  }

  await runAutoAssignment(String(created.id), data.autoAssignRadiusKm ?? DEFAULT_ASSIGNMENT_RADIUS_KM);
  return {
    ...(created as unknown as TaskRow & { help_type?: string }),
    task_type: ((created as { help_type?: string }).help_type ?? data.task_type) as string,
  };
}

export async function getTasksForVolunteer(volunteerId: string): Promise<TaskWithAssignment[]> {
  const volunteer = await getVolunteerByUserId(volunteerId);
  if (!volunteer) return [];

  const baseQuery = () =>
    supabase
      .from('task_assignments')
      .select(
        `
        *,
        task:tasks (
          *,
          disaster:disasters (
            id,
            disaster_type,
            severity,
            latitude,
            longitude,
            description
          )
        )
      `,
      )
    .eq('volunteer_id', volunteer.user_id);

  let { data, error } = await baseQuery().order('assigned_at', { ascending: false });
  if (error && /assigned_at/i.test(error.message)) {
    const fallback = await baseQuery().order('id', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw new Error(friendlyError(error.message));

  const assignments = (data ?? []) as Array<{
    id: string;
    task_id: string;
    volunteer_id: string;
    status: AssignmentStatus;
    assigned_at: string;
    accepted_at: string | null;
    completed_at: string | null;
    assignment_expires_at: string | null;
    task: TaskRow & { help_type?: string; task_type?: string };
  }>;
  const taskIds = assignments.map((a) => a.task_id);
  const stats = await getTaskAssignmentStats(taskIds);

  return assignments.map((a) => {
    const disaster = a.task?.disaster;
    const distanceKm =
      disaster &&
      volunteer.current_latitude !== null &&
      volunteer.current_longitude !== null &&
      typeof disaster.latitude === 'number' &&
      typeof disaster.longitude === 'number'
        ? haversineKm(
            volunteer.current_latitude,
            volunteer.current_longitude,
            disaster.latitude,
            disaster.longitude,
          )
        : null;
    return {
      assignment: {
        id: a.id,
        task_id: a.task_id,
        volunteer_id: a.volunteer_id,
        status: a.status,
        assigned_at: a.assigned_at,
        accepted_at: a.accepted_at,
        completed_at: a.completed_at,
        assignment_expires_at: a.assignment_expires_at,
      },
      task: {
        ...a.task,
        task_type: a.task.task_type ?? a.task.help_type ?? 'general_support',
      },
      distanceKm,
      assignedCount: stats[a.task_id]?.assigned ?? 0,
      acceptedCount: stats[a.task_id]?.accepted ?? 0,
    };
  });
}

export async function acceptTask(taskId: string, volunteerId: string): Promise<void> {
  const volunteer = await getVolunteerByUserId(volunteerId);
  if (!volunteer) throw new Error('Volunteer profile not found.');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('task_assignments')
    .update({ status: 'accepted', accepted_at: now })
    .eq('task_id', taskId)
    .eq('volunteer_id', volunteer.user_id)
    .eq('status', 'assigned');
  if (error) throw new Error(friendlyError(error.message));

  const taskPatch: Record<string, unknown> = { status: 'accepted', updated_at: now };
  for (let i = 0; i < 8; i += 1) {
    const { error: taskErr } = await supabase.from('tasks').update(taskPatch).eq('id', taskId);
    if (!taskErr) break;
    if (!removeMissingColumnAndRetry(taskErr.message ?? '', taskPatch)) {
      throw new Error(friendlyError(taskErr.message));
    }
  }
}

export async function declineTask(taskId: string, volunteerId: string): Promise<void> {
  const volunteer = await getVolunteerByUserId(volunteerId);
  if (!volunteer) throw new Error('Volunteer profile not found.');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('task_assignments')
    .update({ status: 'declined', completed_at: now })
    .eq('task_id', taskId)
    .eq('volunteer_id', volunteer.user_id)
    .in('status', ['assigned', 'accepted']);
  if (error) throw new Error(friendlyError(error.message));

  await assignNextVolunteer(taskId, DEFAULT_ASSIGNMENT_RADIUS_KM);
}

export async function startTask(taskId: string): Promise<void> {
  await safeUpdateTaskById(taskId, {
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  });
}

const uploadCompletionProof = async (taskId: string, imageUri: string): Promise<string> => {
  const response = await fetch(imageUri);
  if (!response.ok) throw new Error('Could not read selected proof image.');
  const content = await response.arrayBuffer();
  const path = `${taskId}/proof-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('task-proofs').upload(path, content, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(friendlyError(error.message));
  const { data } = supabase.storage.from('task-proofs').getPublicUrl(path);
  return data.publicUrl;
};

export async function completeTask(
  taskId: string,
  proofImageUri?: string | null,
  note?: string | null,
): Promise<void> {
  const proofUrl = proofImageUri ? await uploadCompletionProof(taskId, proofImageUri) : null;
  await safeUpdateTaskById(taskId, {
    status: 'completed',
    updated_at: new Date().toISOString(),
    proof_image_url: proofUrl,
    completion_note: note ?? null,
  });

  await supabase
    .from('task_assignments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .in('status', ['accepted', 'in_progress', 'assigned']);
}

export async function requestBackup(taskId: string, volunteerId: string): Promise<void> {
  const volunteer = await getVolunteerByUserId(volunteerId);
  if (!volunteer) throw new Error('Volunteer profile not found.');

  const { data: task, error } = await supabase
    .from('tasks')
    .select('required_volunteers')
    .eq('id', taskId)
    .single();
  if (error) throw new Error(friendlyError(error.message));

  const required = Number(task.required_volunteers ?? 1);
  const patch: Record<string, unknown> = {
    required_volunteers: required + 1,
    updated_at: new Date().toISOString(),
  };
  for (let i = 0; i < 8; i += 1) {
    const { error: patchErr } = await supabase.from('tasks').update(patch).eq('id', taskId);
    if (!patchErr) break;
    if (!removeMissingColumnAndRetry(patchErr.message ?? '', patch)) {
      throw new Error(friendlyError(patchErr.message));
    }
  }

  const { data: admins } = await supabase
    .from('profiles')
    .select('user_id')
    .in('role', ['admin', 'authority']);
  if (admins && admins.length > 0) {
    await supabase.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.user_id,
        type: 'backup_request',
        title: 'Backup requested',
        message: `Backup requested for task ${taskId}.`,
        created_at: new Date().toISOString(),
      })),
    );
  }

  await runAutoAssignment(taskId, DEFAULT_ASSIGNMENT_RADIUS_KM);
}

export async function updateVolunteerLocation(
  volunteerId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await safeUpdateVolunteersByUserId(volunteerId, {
    current_latitude: lat,
    current_longitude: lng,
    updated_at: new Date().toISOString(),
  });
}

export async function setAvailabilityStatus(
  volunteerId: string,
  status: 'online' | 'offline' | 'available' | 'busy',
): Promise<void> {
  await safeUpdateVolunteersByUserId(volunteerId, {
    availability_status: status,
    updated_at: new Date().toISOString(),
  });
}

export async function runAutoAssignment(taskId: string, radiusKm = DEFAULT_ASSIGNMENT_RADIUS_KM): Promise<boolean> {
  const task = await getTaskWithDisaster(taskId);
  if (!task) return false;
  const stats = await getTaskAssignmentStats([taskId]);
  const assignedCount = stats[taskId]?.assigned ?? 0;
  const required = Math.max(1, Number(task.required_volunteers ?? 1));

  let assigned = assignedCount;
  let any = false;
  while (assigned < required) {
    const ok = await assignNextVolunteer(taskId, radiusKm);
    if (!ok) break;
    assigned += 1;
    any = true;
  }
  return any;
}

export async function processAssignmentTimeout(taskId: string, volunteerId: string): Promise<void> {
  const volunteer = await getVolunteerByUserId(volunteerId);
  if (!volunteer) throw new Error('Volunteer profile not found.');

  const { error } = await supabase
    .from('task_assignments')
    .update({ status: 'declined', completed_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('volunteer_id', volunteer.user_id)
    .eq('status', 'assigned');
  if (error) throw new Error(friendlyError(error.message));
  await assignNextVolunteer(taskId, DEFAULT_ASSIGNMENT_RADIUS_KM);
}

export function subscribeVolunteerAssignments(
  volunteerUserId: string,
  onEvent: (payload: { event: 'INSERT' | 'UPDATE' | 'DELETE'; assignment: TaskAssignmentRow }) => void,
): () => void {
  const channel = supabase
    .channel(`volunteer-assignments-${volunteerUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'task_assignments',
        filter: `volunteer_id=eq.${volunteerUserId}`,
      },
      (payload) => {
        const row = payload.new && typeof payload.new === 'object' ? payload.new : payload.old;
        if (!row || typeof row !== 'object') return;
        onEvent({
          event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          assignment: row as TaskAssignmentRow,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeTaskUpdates(
  onEvent: (payload: { event: 'INSERT' | 'UPDATE' | 'DELETE'; task: TaskRow }) => void,
): () => void {
  const channel = supabase
    .channel('task-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      const row = payload.new && typeof payload.new === 'object' ? payload.new : payload.old;
      if (!row || typeof row !== 'object') return;
      onEvent({
        event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        task: row as TaskRow,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getTaskForAssignmentPopup(taskId: string): Promise<TaskRow | null> {
  return getTaskWithDisaster(taskId);
}
