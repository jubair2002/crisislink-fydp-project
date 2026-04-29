import * as Crypto from 'expo-crypto';
import { supabase } from './supabaseClient';
import type {
  CreateDisasterPayload,
  DisasterFilters,
  DisasterMediaRow,
  DisasterRow,
  DisasterSeverity,
  DisasterStatus,
  DisasterUpdateRow,
} from '../types/disaster';

const MEDIA_BUCKET = 'disaster-media';

const DUPLICATE_RADIUS_M = 200;
const DUPLICATE_WINDOW_MIN = 30;

const friendlyError = (message: string): string => {
  if (message.includes('row-level security'))
    return 'You do not have permission to perform this action.';
  if (message.includes('Bucket not found'))
    return 'Storage bucket disaster-media is missing. Ask an admin to create it.';
  if (message.toLowerCase().includes('network'))
    return 'Network error. Check your connection and try again.';
  return message;
};

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function bbox(lat: number, lng: number, padDeg: number) {
  return {
    minLat: lat - padDeg,
    maxLat: lat + padDeg,
    minLng: lng - padDeg,
    maxLng: lng + padDeg,
  };
}

/** Rough degree padding (~2.3km latitude) so we fetch candidates before precise Haversine. */
const BBOX_PAD = 0.021;

export async function getDuplicateNearby(
  lat: number,
  lng: number,
): Promise<DisasterRow | null> {
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MIN * 60 * 1000).toISOString();
  const box = bbox(lat, lng, BBOX_PAD);

  const { data, error } = await supabase
    .from('disasters')
    .select('*')
    .gte('created_at', cutoff)
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng);

  if (error) throw new Error(friendlyError(error.message));

  const rows = (data ?? []) as DisasterRow[];
  for (const row of rows) {
    if (
      typeof row.latitude !== 'number' ||
      typeof row.longitude !== 'number' ||
      Number.isNaN(row.latitude) ||
      Number.isNaN(row.longitude)
    )
      continue;
    const d = haversineMeters(lat, lng, row.latitude, row.longitude);
    if (d < DUPLICATE_RADIUS_M) return row;
  }
  return null;
}

export async function createReport(payload: CreateDisasterPayload): Promise<DisasterRow> {
  const now = new Date().toISOString();
  const baseInsert: Record<string, unknown> = {
    // Keep both keys for backward compatibility with older schemas/policies.
    user_id: payload.reporter_user_id,
    reporter_user_id: payload.reporter_user_id,
    disaster_type: payload.disaster_type,
    latitude: payload.latitude,
    longitude: payload.longitude,
    severity: payload.severity,
    description: payload.description,
    status: 'reported' as DisasterStatus,
    verified_by_user_id: null,
    verification_notes: null,
    verified_at: null,
    created_at: now,
    updated_at: now,
  };

  const insertPayload: Record<string, unknown> = { ...baseInsert };

  for (let attempts = 0; attempts < 10; attempts += 1) {
    const { data, error } = await supabase
      .from('disasters')
      .insert(insertPayload)
      .select('*')
      .single();

    if (!error) return data as DisasterRow;

    const msg = error.message ?? '';
    // Supabase/PostgREST shape: "Could not find the '<column>' column ... schema cache"
    const missing = /'([^']+)'/.exec(msg)?.[1];
    if (!/schema cache/i.test(msg) || !missing || !(missing in insertPayload)) {
      throw new Error(friendlyError(msg));
    }

    delete insertPayload[missing];
  }

  throw new Error('Could not create report: table schema is incompatible.');
}

export async function getDisastersNearby(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<DisasterRow[]> {
  const padDeg = radiusKm / 111;
  const box = bbox(lat, lng, padDeg);

  const { data, error } = await supabase
    .from('disasters')
    .select('*')
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng)
    .neq('status', 'resolved');

  if (error) throw new Error(friendlyError(error.message));

  const rows = (data ?? []) as DisasterRow[];
  const radiusM = radiusKm * 1000;
  return rows.filter((row) => {
    if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return false;
    return haversineMeters(lat, lng, row.latitude, row.longitude) <= radiusM;
  });
}

export async function getAllDisasters(filters?: DisasterFilters): Promise<DisasterRow[]> {
  let q = supabase.from('disasters').select('*').order('created_at', { ascending: false });

  if (filters?.disaster_type) q = q.eq('disaster_type', filters.disaster_type);

  if (filters?.severity) q = q.eq('severity', filters.severity);

  if (filters?.status) {
    const st = filters.status;
    if (Array.isArray(st)) q = q.in('status', st);
    else q = q.eq('status', st);
  }

  const { data, error } = await q;
  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []) as DisasterRow[];
}

export async function updateDisasterSeverity(
  disasterId: string,
  severity: DisasterSeverity,
): Promise<DisasterRow> {
  const { data, error } = await supabase
    .from('disasters')
    .update({
      severity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', disasterId)
    .select('*')
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return data as DisasterRow;
}

export async function getDisasterById(id: string): Promise<DisasterRow | null> {
  const { data, error } = await supabase.from('disasters').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyError(error.message));
  return (data as DisasterRow) ?? null;
}

export async function getDisasterMedia(disasterId: string): Promise<DisasterMediaRow[]> {
  const { data, error } = await supabase
    .from('disaster_media')
    .select('*')
    .eq('disaster_id', disasterId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ''),
    disaster_id: String(row.disaster_id ?? disasterId),
    media_type: (row.media_type as 'photo' | 'video') ?? 'photo',
    created_at: String(row.created_at ?? new Date().toISOString()),
    // Support both old schema (file_url) and new schema (public_url).
    public_url: (row.public_url as string | undefined) ?? (row.file_url as string | undefined),
    file_url: row.file_url as string | undefined,
    storage_path: row.storage_path as string | undefined,
    purpose: (row.purpose as 'report' | 'verification' | undefined) ?? 'report',
    uploaded_by: row.uploaded_by as string | undefined,
  }));
}

export async function getDisasterUpdates(disasterId: string): Promise<DisasterUpdateRow[]> {
  const { data, error } = await supabase
    .from('disaster_updates')
    .select('*')
    .eq('disaster_id', disasterId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []) as DisasterUpdateRow[];
}

export interface VerifyDisasterInput {
  disasterId: string;
  volunteerUserId: string;
  outcome: 'verified' | 'rejected';
  notes?: string | null;
  severity?: DisasterSeverity | null;
}

export async function verifyDisaster(input: VerifyDisasterInput): Promise<DisasterRow> {
  const now = new Date().toISOString();
  const status: DisasterStatus = input.outcome === 'verified' ? 'verified' : 'false_report';

  const patch: Record<string, unknown> = {
    updated_at: now,
    verified_by_user_id: input.volunteerUserId,
    verification_notes: input.notes ?? null,
    verified_at: now,
    status,
  };
  if (input.severity) patch.severity = input.severity;

  const updatePayload: Record<string, unknown> = { ...patch };

  for (let attempts = 0; attempts < 10; attempts += 1) {
    const { data, error } = await supabase
      .from('disasters')
      .update(updatePayload)
      .eq('id', input.disasterId)
      .select('*')
      .maybeSingle();

    if (!error && data) return data as DisasterRow;
    if (!error && !data) {
      throw new Error(
        'Could not verify this report. It may be missing or blocked by database permissions.',
      );
    }

    const msg = error.message ?? '';
    const missing = /'([^']+)'/.exec(msg)?.[1];
    if (!/schema cache/i.test(msg) || !missing || !(missing in updatePayload)) {
      throw new Error(friendlyError(msg));
    }
    delete updatePayload[missing];
  }

  throw new Error('Could not verify disaster: table schema is incompatible.');
}

export async function addUpdate(disasterId: string, text: string, userId: string): Promise<DisasterUpdateRow> {
  const { data, error } = await supabase
    .from('disaster_updates')
    .insert({
      disaster_id: disasterId,
      user_id: userId,
      body_text: text,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return data as DisasterUpdateRow;
}

const guessExtension = (uri: string): string => {
  const clean = uri.split('?')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(clean);
  if (match) return match[1].toLowerCase();
  return 'jpg';
};

const mimeForMedia = (mediaType: 'photo' | 'video', ext: string): string => {
  const e = ext.toLowerCase();
  if (mediaType === 'video') {
    if (e === 'mov') return 'video/quicktime';
    if (e === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const uriToArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not read selected file.');
  return await res.arrayBuffer();
};

export interface UploadProgressCb {
  (ratio: number): void;
}

export async function uploadMedia(
  disasterId: string,
  fileUri: string,
  mediaType: 'photo' | 'video',
  purpose: 'report' | 'verification' = 'report',
  onProgress?: UploadProgressCb,
): Promise<DisasterMediaRow> {
  const ext = guessExtension(fileUri);
  const path = `${disasterId}/${Crypto.randomUUID()}.${ext}`;
  const mime = mimeForMedia(mediaType, ext);

  onProgress?.(0.05);
  const buf = await uriToArrayBuffer(fileUri);
  onProgress?.(0.35);

  const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: false,
  });

  if (upErr) throw new Error(friendlyError(upErr.message));
  onProgress?.(0.75);

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  let { data, error } = await supabase
    .from('disaster_media')
    .insert({
      disaster_id: disasterId,
      storage_path: path,
      public_url: publicUrl,
      media_type: mediaType,
      purpose,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  // Backward-compat for older table shape:
  // disaster_media(disaster_id, file_url, media_type, uploaded_by, created_at)
  if (error && /schema cache|column/i.test(error.message)) {
    const { data: retryData, error: retryError } = await supabase
      .from('disaster_media')
      .insert({
        disaster_id: disasterId,
        file_url: publicUrl,
        media_type: mediaType,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    data = retryData;
    error = retryError;
  }

  if (error) throw new Error(friendlyError(error.message));
  onProgress?.(1);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    disaster_id: String(row.disaster_id ?? disasterId),
    media_type: (row.media_type as 'photo' | 'video') ?? mediaType,
    created_at: String(row.created_at ?? new Date().toISOString()),
    public_url: (row.public_url as string | undefined) ?? (row.file_url as string | undefined) ?? publicUrl,
    file_url: row.file_url as string | undefined,
    storage_path: (row.storage_path as string | undefined) ?? path,
    purpose: (row.purpose as 'report' | 'verification' | undefined) ?? purpose,
    uploaded_by: row.uploaded_by as string | undefined,
  };
}

export type DisasterRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  row: DisasterRow | null;
};

export function subscribeDisastersRealtime(onPayload: (p: DisasterRealtimePayload) => void): () => void {
  const channel = supabase
    .channel('disasters-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'disasters' },
      (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        let row: DisasterRow | null = null;
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          row = payload.new as DisasterRow;
        } else if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
          row = payload.old as DisasterRow;
        }
        onPayload({ eventType, row });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
