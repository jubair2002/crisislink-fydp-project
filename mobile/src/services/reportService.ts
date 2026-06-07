import * as Crypto from 'expo-crypto';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type {
  ReportResponseRow,
  ReportRow,
  ReportStatus,
  ReportStatusEvent,
  SubmitReportInput,
} from '../types/report';

const MEDIA_BUCKET = 'report-media';

const friendlyError = (message: string): string => {
  if (message.includes('row-level security')) return 'You do not have permission to perform this action.';
  if (message.includes('Bucket not found'))
    return 'Storage bucket report-media is missing. Ask an admin to create it.';
  if (message.toLowerCase().includes('network')) return 'Network error. Check your connection and try again.';
  return message;
};

function mapReport(row: Record<string, unknown>): ReportRow {
  const campaign = row.campaign as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    report_type: row.report_type as ReportRow['report_type'],
    description: String(row.description ?? ''),
    image_url: (row.image_url as string) ?? null,
    campaign_id: row.campaign_id != null ? String(row.campaign_id) : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    location_label: (row.location_label as string) ?? null,
    status: (row.status as ReportRow['status']) ?? 'submitted',
    resolution_message: (row.resolution_message as string) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    campaign: campaign
      ? { id: String(campaign.id), title: String(campaign.title ?? 'Campaign') }
      : null,
  };
}

function mapResponse(row: Record<string, unknown>): ReportResponseRow {
  const responder = row.responder as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id),
    report_id: String(row.report_id),
    responder_user_id: String(row.responder_user_id),
    message: String(row.message ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    responder: responder ? { name: (responder.name as string) ?? null } : null,
  };
}

function mapStatusEvent(row: Record<string, unknown>): ReportStatusEvent {
  return {
    id: String(row.id),
    report_id: String(row.report_id),
    status: row.status as ReportStatus,
    note: (row.note as string) ?? null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

const REPORT_SELECT = `
  *,
  campaign:campaigns(id, title)
`;

export async function uploadReportImage(userId: string, imageUri: string): Promise<string> {
  const ext = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/${Crypto.randomUUID()}.${ext}`;

  const response = await fetch(imageUri);
  const buffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(friendlyError(error.message));

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function submitReport(userId: string, input: SubmitReportInput): Promise<ReportRow> {
  let imageUrl: string | null = null;
  if (input.image_uri) {
    imageUrl = await uploadReportImage(userId, input.image_uri);
  }

  const payload = {
    user_id: userId,
    report_type: input.report_type,
    description: input.description.trim(),
    image_url: imageUrl,
    campaign_id: input.campaign_id ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    location_label: input.location_label ?? null,
    status: 'submitted' as const,
  };

  const { data, error } = await supabase
    .from('reports')
    .insert(payload)
    .select(REPORT_SELECT)
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return mapReport(data as Record<string, unknown>);
}

export async function getReportsForUser(userId: string): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((row) => mapReport(row as Record<string, unknown>));
}

export async function getReportById(id: string): Promise<ReportRow | null> {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));
  if (!data) return null;
  return mapReport(data as Record<string, unknown>);
}

export async function getReportResponses(reportId: string): Promise<ReportResponseRow[]> {
  const { data, error } = await supabase
    .from('report_responses')
    .select('*, responder:profiles!report_responses_responder_user_id_fkey(name)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) {
    const { data: fallback, error: fbErr } = await supabase
      .from('report_responses')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });
    if (fbErr) throw new Error(friendlyError(fbErr.message));
    return (fallback ?? []).map((row) => mapResponse(row as Record<string, unknown>));
  }

  return (data ?? []).map((row) => mapResponse(row as Record<string, unknown>));
}

export async function getReportStatusEvents(reportId: string): Promise<ReportStatusEvent[]> {
  const { data, error } = await supabase
    .from('report_status_events')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((row) => mapStatusEvent(row as Record<string, unknown>));
}

export async function getCampaignReportsForVolunteer(volunteerUserId: string): Promise<ReportRow[]> {
  const { data: memberships, error: memErr } = await supabase
    .from('campaign_volunteers')
    .select('campaign_id')
    .eq('volunteer_user_id', volunteerUserId)
    .eq('status', 'active');

  if (memErr) throw new Error(friendlyError(memErr.message));

  const campaignIds = (memberships ?? []).map((m) => String(m.campaign_id));
  if (!campaignIds.length) return [];

  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('report_type', 'campaign')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((row) => mapReport(row as Record<string, unknown>));
}

export async function addReportResponse(
  reportId: string,
  responderUserId: string,
  message: string,
): Promise<ReportResponseRow> {
  const { data, error } = await supabase
    .from('report_responses')
    .insert({
      report_id: reportId,
      responder_user_id: responderUserId,
      message: message.trim(),
    })
    .select('*')
    .single();

  if (error) throw new Error(friendlyError(error.message));

  await supabase
    .from('reports')
    .update({ status: 'in_review' })
    .eq('id', reportId)
    .eq('status', 'submitted');

  return mapResponse(data as Record<string, unknown>);
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  resolutionMessage?: string | null,
): Promise<ReportRow> {
  const patch: Record<string, unknown> = { status };
  if (resolutionMessage != null) patch.resolution_message = resolutionMessage;

  const { data, error } = await supabase
    .from('reports')
    .update(patch)
    .eq('id', reportId)
    .select(REPORT_SELECT)
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return mapReport(data as Record<string, unknown>);
}

export async function fetchUserCampaignOptions(userId: string, isVolunteer: boolean) {
  if (isVolunteer) {
    const { data, error } = await supabase
      .from('campaign_volunteers')
      .select('campaign_id, campaigns(id, title, status)')
      .eq('volunteer_user_id', userId)
      .eq('status', 'active');

    if (error) throw new Error(friendlyError(error.message));

    return (data ?? [])
      .map((row) => {
        const raw = row.campaigns as Record<string, unknown> | Record<string, unknown>[] | null;
        const camp = Array.isArray(raw) ? raw[0] : raw;
        if (!camp || camp.status !== 'active') return null;
        return { id: String(camp.id), title: String(camp.title ?? 'Campaign') };
      })
      .filter(Boolean) as { id: string; title: string }[];
  }

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, title')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(50);

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? 'Campaign'),
  }));
}

type ReportUpdateCallback = (payload: {
  report?: ReportRow;
  response?: ReportResponseRow;
}) => void;

const channels = new Map<string, RealtimeChannel>();

export function subscribeToReportUpdates(
  reportId: string,
  callback: ReportUpdateCallback,
): () => void {
  const key = `report-${reportId}`;
  if (channels.has(key)) {
    void supabase.removeChannel(channels.get(key)!);
  }

  const channel = supabase
    .channel(key)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports', filter: `id=eq.${reportId}` },
      async () => {
        const report = await getReportById(reportId);
        if (report) callback({ report });
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'report_responses',
        filter: `report_id=eq.${reportId}`,
      },
      async (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          callback({ response: mapResponse(payload.new as Record<string, unknown>) });
        }
        const report = await getReportById(reportId);
        if (report) callback({ report });
      },
    )
    .subscribe();

  channels.set(key, channel);

  return () => {
    void supabase.removeChannel(channel);
    channels.delete(key);
  };
}
