import { supabase } from './supabaseClient';
import type { Profile } from '../types/auth';
import type {
  CitizenProfileInput,
  DocumentKind,
  VolunteerProfile,
  VolunteerProfileInput,
} from '../types/profile';

const AVATAR_BUCKET = 'avatars';
const DOCS_BUCKET = 'volunteer-docs';

const DOC_FIELD_MAP: Record<DocumentKind, keyof VolunteerProfile> = {
  national_id: 'national_id_url',
  volunteer_cert: 'volunteer_cert_url',
  org_proof: 'org_proof_url',
};

const friendlyError = (message: string): string => {
  if (message.includes('row-level security'))
    return 'You do not have permission to perform this action.';
  if (message.includes('duplicate key'))
    return 'A record already exists for this account.';
  if (message.includes('Bucket not found'))
    return 'Storage bucket is missing. Please contact support.';
  if (message.includes('Payload too large'))
    return 'File is too large. Please choose a smaller file.';
  if (message.includes('mime type'))
    return 'File type is not supported.';
  if (message.toLowerCase().includes('network'))
    return 'Network error. Check your connection and try again.';
  return message;
};

const guessExtension = (uri: string): string => {
  const clean = uri.split('?')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(clean);
  if (match) return match[1].toLowerCase();
  return 'jpg';
};

const mimeForExt = (ext: string): string => {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'heic') return 'image/heic';
  if (e === 'pdf') return 'application/pdf';
  return 'image/jpeg';
};

/**
 * Convert a local content/file URI returned by ImagePicker to an ArrayBuffer.
 * ArrayBuffer is the most reliable upload payload for supabase-js on React Native;
 * Blob support varies across RN runtimes and Expo SDKs.
 */
const uriToArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not read selected file.');
  return await res.arrayBuffer();
};

// ─── Citizen profile ───────────────────────────────────────────────────────
export const getCitizenProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));
  return (data as Profile) ?? null;
};

export const updateCitizenProfile = async (
  userId: string,
  data: Partial<CitizenProfileInput> & { profile_completed?: boolean },
): Promise<Profile> => {
  const payload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return updated as Profile;
};

// ─── Volunteer profile ─────────────────────────────────────────────────────
export const getVolunteerProfile = async (
  userId: string,
): Promise<VolunteerProfile | null> => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));
  return (data as VolunteerProfile) ?? null;
};

export const createVolunteerProfile = async (
  userId: string,
  input: VolunteerProfileInput,
): Promise<VolunteerProfile> => {
  // 1. Update profile-level fields (phone, address, photo) and flip role to volunteer
  const profileUpdates: Record<string, unknown> = {
    phone: input.phone,
    address: input.address,
    role: 'volunteer',
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };
  if (input.profile_photo_url) profileUpdates.profile_photo_url = input.profile_photo_url;

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('user_id', userId);
  if (profileError) throw new Error(friendlyError(profileError.message));

  // 2. Upsert into volunteers table
  const volunteerPayload: Record<string, unknown> = {
    user_id: userId,
    age: input.age,
    gender: input.gender,
    skills: input.skills,
    availability: input.availability,
    working_hours: input.working_hours,
    preferred_disaster_types: input.preferred_disaster_types,
    has_previous_experience: input.has_previous_experience,
    years_of_experience: input.has_previous_experience ? input.years_of_experience ?? 0 : 0,
    organization: input.organization ?? null,
    national_id_url: input.national_id_url ?? null,
    volunteer_cert_url: input.volunteer_cert_url ?? null,
    org_proof_url: input.org_proof_url ?? null,
    verification_status: 'pending',
  };

  const { data: volunteer, error: vError } = await supabase
    .from('volunteers')
    .upsert(volunteerPayload, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (vError) throw new Error(friendlyError(vError.message));

  return volunteer as VolunteerProfile;
};

export const updateVolunteerProfile = async (
  userId: string,
  data: Partial<VolunteerProfileInput>,
): Promise<VolunteerProfile> => {
  const payload: Record<string, unknown> = {};
  const profilePayload: Record<string, unknown> = {};

  if (data.phone !== undefined) profilePayload.phone = data.phone;
  if (data.address !== undefined) profilePayload.address = data.address;
  if (data.profile_photo_url !== undefined) profilePayload.profile_photo_url = data.profile_photo_url;

  if (data.age !== undefined) payload.age = data.age;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.skills !== undefined) payload.skills = data.skills;
  if (data.availability !== undefined) payload.availability = data.availability;
  if (data.working_hours !== undefined) payload.working_hours = data.working_hours;
  if (data.preferred_disaster_types !== undefined)
    payload.preferred_disaster_types = data.preferred_disaster_types;
  if (data.has_previous_experience !== undefined)
    payload.has_previous_experience = data.has_previous_experience;
  if (data.years_of_experience !== undefined) payload.years_of_experience = data.years_of_experience;
  if (data.organization !== undefined) payload.organization = data.organization;
  if (data.national_id_url !== undefined) payload.national_id_url = data.national_id_url;
  if (data.volunteer_cert_url !== undefined) payload.volunteer_cert_url = data.volunteer_cert_url;
  if (data.org_proof_url !== undefined) payload.org_proof_url = data.org_proof_url;

  if (Object.keys(profilePayload).length > 0) {
    profilePayload.updated_at = new Date().toISOString();
    const { error: pErr } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('user_id', userId);
    if (pErr) throw new Error(friendlyError(pErr.message));
  }

  const { data: updated, error } = await supabase
    .from('volunteers')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(friendlyError(error.message));
  return updated as VolunteerProfile;
};

// ─── Storage uploads ───────────────────────────────────────────────────────

/**
 * Upload a profile photo to the `avatars` bucket and persist its public URL on the profile row.
 *
 * The path layout is `<userId>/avatar-<timestamp>.<ext>` so RLS policies that match on
 * the first folder name keep each user scoped to their own files.
 */
export const uploadProfilePhoto = async (
  userId: string,
  imageUri: string,
): Promise<string> => {
  const ext = guessExtension(imageUri);
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const buffer = await uriToArrayBuffer(imageUri);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, {
      contentType: mimeForExt(ext),
      upsert: true,
    });

  if (error) throw new Error(friendlyError(error.message));

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (profileError) throw new Error(friendlyError(profileError.message));

  return publicUrl;
};

/**
 * Upload a verification document for the volunteer flow.
 *
 * @param onProgress - optional progress reporter (0..1). Invoked with 0 right before upload
 *   begins and 1 once the file is uploaded; intermediate progress is approximated because
 *   supabase-js does not expose granular byte progress on React Native.
 */
export const uploadDocument = async (
  userId: string,
  type: DocumentKind,
  fileUri: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  const ext = guessExtension(fileUri);
  const path = `${userId}/${type}-${Date.now()}.${ext}`;

  onProgress?.(0);
  const buffer = await uriToArrayBuffer(fileUri);
  onProgress?.(0.4);

  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, buffer, {
      contentType: mimeForExt(ext),
      upsert: true,
    });

  if (error) throw new Error(friendlyError(error.message));
  onProgress?.(0.85);

  const { data: pub } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Persist URL on volunteers row if it already exists, otherwise just return the URL
  // and let the caller include it in the eventual upsert.
  const { data: existing } = await supabase
    .from('volunteers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const field = DOC_FIELD_MAP[type];
    const { error: updateErr } = await supabase
      .from('volunteers')
      .update({ [field]: publicUrl })
      .eq('user_id', userId);
    if (updateErr) throw new Error(friendlyError(updateErr.message));
  }

  onProgress?.(1);
  return publicUrl;
};
