import { supabase } from './supabaseClient';
import { haversineMeters } from './disasterService';
import type {
  CampaignRow,
  CampaignUpdateRow,
  HomeDisaster,
  HomeTaskAssignment,
  ResourceCenterRow,
  VolunteerCampaignNeed,
} from '../types/home';
import type { DisasterRow } from '../types/disaster';
import { acceptTask, declineTask } from './taskService';
import { updateAvailability as volunteerUpdateAvailability } from './volunteerService';

const friendlyError = (message: string): string => {
  if (message.includes('row-level security')) return 'You do not have permission.';
  if (message.toLowerCase().includes('network')) return 'Network error. Try again.';
  return message;
};

const isMissingRelation = (msg: string) =>
  /relation .* does not exist|Could not find the table/i.test(msg);

export const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  return haversineMeters(aLat, aLng, bLat, bLng) / 1000;
};

function sortByDistance(rows: DisasterRow[], lat: number, lng: number): HomeDisaster[] {
  const withDist = rows
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map((r) => ({
      ...r,
      distanceKm: haversineKm(lat, lng, r.latitude, r.longitude),
    }));
  withDist.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return withDist;
}

export async function fetchNearbyDisasters(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<HomeDisaster[]> {
  try {
    const { data, error } = await supabase
      .from('disasters')
      .select('*')
      .in('status', ['verified', 'response_in_progress']);

    if (error) throw error;
    const rows = (data ?? []) as DisasterRow[];
    const nearby = rows.filter((row) => {
      if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return false;
      return haversineKm(lat, lng, row.latitude, row.longitude) <= radiusKm;
    });
    return sortByDistance(nearby, lat, lng);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return [];
    throw new Error(friendlyError(msg));
  }
}

export async function fetchVolunteerNearbyDisasters(
  lat: number,
  lng: number,
  limit: number,
): Promise<HomeDisaster[]> {
  const rows = await fetchNearbyDisasters(lat, lng, 500);
  return rows.slice(0, limit);
}

export async function fetchActiveCampaigns(limit: number): Promise<CampaignRow[]> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? 'Campaign'),
      location_label: (row.location_label as string) ?? null,
      status: String(row.status ?? 'active'),
      target_amount: Number(row.target_amount ?? 0),
      collected_amount: Number(row.collected_amount ?? 0),
      ends_at: (row.ends_at as string) ?? null,
      created_at: row.created_at as string | undefined,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return [];
    throw new Error(friendlyError(msg));
  }
}

export async function fetchNearbyResourceCenters(
  lat: number,
  lng: number,
  limit: number,
): Promise<ResourceCenterRow[]> {
  try {
    const { data, error } = await supabase.from('resource_centers').select('*');

    if (error) throw error;
    const mapped = ((data ?? []) as Record<string, unknown>[])
      .map((row) => {
        const latitude = Number(row.latitude);
        const longitude = Number(row.longitude);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
        return {
          id: String(row.id),
          name: String(row.name ?? 'Resource center'),
          latitude,
          longitude,
          capacity_max: row.capacity_max != null ? Number(row.capacity_max) : null,
          capacity_current: row.capacity_current != null ? Number(row.capacity_current) : null,
          distanceKm: haversineKm(lat, lng, latitude, longitude),
        } satisfies ResourceCenterRow;
      })
      .filter(Boolean) as ResourceCenterRow[];

    mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return mapped.slice(0, limit);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return [];
    throw new Error(friendlyError(msg));
  }
}

export async function fetchCampaignUpdates(limit: number): Promise<CampaignUpdateRow[]> {
  try {
    const { data, error } = await supabase
      .from('campaign_updates')
      .select(
        `
        id,
        campaign_id,
        title,
        body,
        created_at,
        campaigns ( title )
      `,
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      campaign_id: String(row.campaign_id ?? ''),
      title: String(row.title ?? 'Update'),
      body: (row.body as string) ?? null,
      created_at: String(row.created_at ?? new Date().toISOString()),
      campaigns: row.campaigns as { title: string } | null,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return [];
    throw new Error(friendlyError(msg));
  }
}

async function fetchAssignmentRows(volunteerUserId: string): Promise<HomeTaskAssignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(
      `
      *,
      task:tasks (
        id,
        task_type,
        help_type,
        priority,
        status,
        required_volunteers,
        disaster:disasters (
          id,
          disaster_type,
          severity,
          latitude,
          longitude,
          location_label
        )
      )
    `,
    )
    .eq('volunteer_id', volunteerUserId)
    .order('assigned_at', { ascending: false });

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []) as HomeTaskAssignment[];
}

export async function fetchActiveTaskAssignment(
  volunteerUserId: string,
): Promise<HomeTaskAssignment | null> {
  try {
    const rows = await fetchAssignmentRows(volunteerUserId);
    const hit = rows.find((r) => {
      const ts = r.task?.status;
      if (ts === 'completed' || ts === 'cancelled') return false;
      if (r.status === 'declined' || r.status === 'timeout') return false;
      return r.status === 'accepted' || r.accepted_at != null;
    });
    return hit ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return null;
    throw new Error(friendlyError(msg));
  }
}

export async function fetchPendingTaskRequests(volunteerUserId: string): Promise<HomeTaskAssignment[]> {
  try {
    const rows = await fetchAssignmentRows(volunteerUserId);
    return rows.filter((r) => r.status === 'assigned' && r.accepted_at == null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return [];
    throw new Error(friendlyError(msg));
  }
}

export async function respondToTaskRequest(
  assignmentId: string,
  volunteerUserId: string,
  action: 'accept' | 'decline',
): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('id', assignmentId)
    .maybeSingle();

  if (fetchErr) throw new Error(friendlyError(fetchErr.message));
  const taskId = row?.task_id ? String(row.task_id) : '';
  if (!taskId) throw new Error('Assignment not found.');

  if (action === 'accept') await acceptTask(taskId, volunteerUserId);
  else await declineTask(taskId, volunteerUserId);
}

export async function updateAvailabilityStatus(
  userId: string,
  status: 'online' | 'offline' | 'available' | 'busy',
): Promise<void> {
  await volunteerUpdateAvailability(userId, status);
}

export async function fetchCampaignsNeedingVolunteers(limit: number): Promise<VolunteerCampaignNeed[]> {
  const fallbackFromActive = async (): Promise<VolunteerCampaignNeed[]> => {
    const fallback = await fetchActiveCampaigns(limit);
    return fallback.map((c) => ({
      campaign_id: c.id,
      title: c.title,
      location: c.location_label ?? '—',
      help_type: 'Volunteers needed',
    }));
  };

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        help_type,
        task_type,
        assignment_mode,
        status,
        disaster:disasters ( location_label ),
        campaign:campaigns ( id, title, location_label )
      `,
      )
      .eq('status', 'requested')
      .eq('assignment_mode', 'admin')
      .limit(limit * 4);

    if (error) throw error;

    const out: VolunteerCampaignNeed[] = [];
    const seen = new Set<string>();

    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const campaign = r.campaign as { id?: string; title?: string; location_label?: string | null } | null;
      const disaster = r.disaster as { location_label?: string | null } | null;
      const helpType = String(r.help_type ?? r.task_type ?? 'support');

      const campaignId = campaign?.id ? String(campaign.id) : '';
      const title = campaign?.title ? String(campaign.title) : 'Relief operation';
      const location =
        String(campaign?.location_label ?? disaster?.location_label ?? 'Area TBD');

      const key = campaignId || `${title}-${helpType}-${location}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        campaign_id: campaignId || key,
        title,
        location,
        help_type: helpType.replace(/_/g, ' '),
      });
      if (out.length >= limit) break;
    }

    if (out.length) return out;
    return fallbackFromActive();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isMissingRelation(msg)) return fallbackFromActive();
    try {
      return await fallbackFromActive();
    } catch {
      throw new Error(friendlyError(msg));
    }
  }
}
