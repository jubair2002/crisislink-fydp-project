import type { VolunteerSkill } from './profile';

export type ProfileVisibility = 'public' | 'volunteers_only' | 'private';
export type AppTheme = 'light' | 'dark' | 'system';
export type MapDefaultView = 'standard' | 'satellite' | 'hybrid';
export type AppLanguage = 'en' | 'bn';
export type AvailabilityStatus = 'online' | 'offline' | 'available' | 'busy';

export interface UserSettings {
  id?: string;
  user_id: string;
  notifications_enabled: boolean;
  disaster_alerts: boolean;
  volunteer_request_alerts: boolean;
  chat_notifications: boolean;
  campaign_updates: boolean;
  donation_updates: boolean;
  language: AppLanguage;
  theme: AppTheme;
  location_sharing: boolean;
  profile_visibility: ProfileVisibility;
  anonymous_donations: boolean;
  map_default_view: MapDefaultView;
  auto_detect_location: boolean;
  created_at?: string;
}

export interface VolunteerSettings {
  id?: string;
  user_id: string;
  availability_status: AvailabilityStatus;
  accept_emergency: boolean;
  accept_campaign: boolean;
  max_distance_km: number;
  skills: VolunteerSkill[];
  updated_at?: string;
}

export const DEFAULT_USER_SETTINGS = (userId: string): UserSettings => ({
  user_id: userId,
  notifications_enabled: true,
  disaster_alerts: true,
  volunteer_request_alerts: true,
  chat_notifications: true,
  campaign_updates: true,
  donation_updates: true,
  language: 'en',
  theme: 'system',
  location_sharing: true,
  profile_visibility: 'public',
  anonymous_donations: false,
  map_default_view: 'standard',
  auto_detect_location: true,
});

export const DEFAULT_VOLUNTEER_SETTINGS = (userId: string): VolunteerSettings => ({
  user_id: userId,
  availability_status: 'offline',
  accept_emergency: true,
  accept_campaign: true,
  max_distance_km: 10,
  skills: [],
});
