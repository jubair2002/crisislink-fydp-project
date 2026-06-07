import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { resetPassword } from './authService';
import { updateVolunteerProfile } from './profileService';
import { setAvailabilityStatus } from './taskService';
import type { VolunteerSkill } from '../types/profile';
import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_VOLUNTEER_SETTINGS,
  type UserSettings,
  type VolunteerSettings,
} from '../types/settings';

const friendlyError = (message: string): string => {
  if (message.includes('row-level security'))
    return 'You do not have permission to perform this action.';
  if (message.toLowerCase().includes('network'))
    return 'Network error. Check your connection and try again.';
  return message;
};

const mapUserRow = (row: Record<string, unknown>): UserSettings => ({
  id: row.id as string | undefined,
  user_id: row.user_id as string,
  notifications_enabled: Boolean(row.notifications_enabled ?? true),
  disaster_alerts: Boolean(row.disaster_alerts ?? true),
  volunteer_request_alerts: Boolean(row.volunteer_request_alerts ?? true),
  chat_notifications: Boolean(row.chat_notifications ?? true),
  campaign_updates: Boolean(row.campaign_updates ?? true),
  donation_updates: Boolean(row.donation_updates ?? true),
  language: (row.language as UserSettings['language']) ?? 'en',
  theme: (row.theme as UserSettings['theme']) ?? 'system',
  location_sharing: Boolean(row.location_sharing ?? true),
  profile_visibility: (row.profile_visibility as UserSettings['profile_visibility']) ?? 'public',
  anonymous_donations: Boolean(row.anonymous_donations ?? false),
  map_default_view: (row.map_default_view as UserSettings['map_default_view']) ?? 'standard',
  auto_detect_location: Boolean(row.auto_detect_location ?? true),
  created_at: row.created_at as string | undefined,
});

const mapVolunteerRow = (row: Record<string, unknown>): VolunteerSettings => ({
  id: row.id as string | undefined,
  user_id: row.user_id as string,
  availability_status:
    (row.availability_status as VolunteerSettings['availability_status']) ?? 'offline',
  accept_emergency: Boolean(row.accept_emergency ?? true),
  accept_campaign: Boolean(row.accept_campaign ?? true),
  max_distance_km: Number(row.max_distance_km ?? 10),
  skills: (row.skills as VolunteerSkill[]) ?? [],
  updated_at: row.updated_at as string | undefined,
});

export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));
  if (data) return mapUserRow(data as Record<string, unknown>);

  const defaults = DEFAULT_USER_SETTINGS(userId);
  const { data: created, error: insertError } = await supabase
    .from('user_settings')
    .insert(defaults)
    .select('*')
    .single();

  if (insertError) throw new Error(friendlyError(insertError.message));
  return mapUserRow(created as Record<string, unknown>);
};

export const updateUserSettings = async (
  userId: string,
  settings: Partial<UserSettings>,
): Promise<UserSettings> => {
  const payload = { ...settings };
  delete (payload as { id?: string }).id;
  delete (payload as { user_id?: string }).user_id;
  delete (payload as { created_at?: string }).created_at;

  const { data, error } = await supabase
    .from('user_settings')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return mapUserRow(data as Record<string, unknown>);
};

export const getVolunteerSettings = async (userId: string): Promise<VolunteerSettings> => {
  const { data, error } = await supabase
    .from('volunteer_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));

  if (data) {
    const mapped = mapVolunteerRow(data as Record<string, unknown>);
    const { data: volunteerRow } = await supabase
      .from('volunteers')
      .select('availability_status, skills, verification_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (volunteerRow) {
      if (volunteerRow.availability_status) {
        mapped.availability_status =
          volunteerRow.availability_status as VolunteerSettings['availability_status'];
      }
      if (Array.isArray(volunteerRow.skills) && volunteerRow.skills.length > 0) {
        mapped.skills = volunteerRow.skills as VolunteerSkill[];
      }
    }
    return mapped;
  }

  const defaults = DEFAULT_VOLUNTEER_SETTINGS(userId);
  const { data: volunteerRow } = await supabase
    .from('volunteers')
    .select('availability_status, skills')
    .eq('user_id', userId)
    .maybeSingle();

  if (volunteerRow) {
    if (volunteerRow.availability_status) {
      defaults.availability_status =
        volunteerRow.availability_status as VolunteerSettings['availability_status'];
    }
    if (Array.isArray(volunteerRow.skills)) {
      defaults.skills = volunteerRow.skills as VolunteerSkill[];
    }
  }

  const { data: created, error: insertError } = await supabase
    .from('volunteer_settings')
    .insert({
      user_id: userId,
      availability_status: defaults.availability_status,
      accept_emergency: defaults.accept_emergency,
      accept_campaign: defaults.accept_campaign,
      max_distance_km: defaults.max_distance_km,
      skills: defaults.skills,
    })
    .select('*')
    .single();

  if (insertError) throw new Error(friendlyError(insertError.message));
  return mapVolunteerRow(created as Record<string, unknown>);
};

export const updateVolunteerSettings = async (
  userId: string,
  settings: Partial<VolunteerSettings>,
): Promise<VolunteerSettings> => {
  const payload: Record<string, unknown> = {
    ...settings,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  delete payload.id;

  if (settings.availability_status) {
    await setAvailabilityStatus(userId, settings.availability_status);
  }

  if (settings.skills) {
    await updateVolunteerProfile(userId, { skills: settings.skills });
  }

  const { data, error } = await supabase
    .from('volunteer_settings')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(friendlyError(error.message));
  return mapVolunteerRow(data as Record<string, unknown>);
};

/** Send a password-reset email to the authenticated user. */
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  await resetPassword(email);
};

/** Update password for the currently authenticated user (no current-password check). */
export const changePassword = async (newPassword: string): Promise<void> => {
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(friendlyError(error.message));
};

export const deleteAccount = async (userId: string, password: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Could not verify your account.');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured.');
  }

  const reauthRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ email: user.email, password }),
  });

  if (!reauthRes.ok) {
    throw new Error('Incorrect password. Account was not deleted.');
  }

  const { error } = await supabase.rpc('delete_account');
  if (error) throw new Error(friendlyError(error.message));

  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  await AsyncStorage.clear();
};
