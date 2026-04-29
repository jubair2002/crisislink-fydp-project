import type { DisasterType } from './profile';

export type DisasterSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DisasterStatus =
  | 'reported'
  | 'under_verification'
  | 'verified'
  | 'response_in_progress'
  | 'resolved'
  | 'false_report'
  // Legacy compatibility with earlier app code.
  | 'rejected';

export interface DisasterRow {
  id: string;
  reporter_user_id: string;
  disaster_type: DisasterType | string;
  latitude: number;
  longitude: number;
  /** Present when DB has `location_label` column (optional migration). */
  location_label?: string | null;
  severity: DisasterSeverity;
  description: string;
  status: DisasterStatus;
  verified_by_user_id: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisasterMediaRow {
  id: string;
  disaster_id: string;
  storage_path?: string;
  public_url?: string;
  file_url?: string;
  media_type: 'photo' | 'video';
  purpose?: 'report' | 'verification';
  uploaded_by?: string;
  created_at: string;
}

export interface DisasterUpdateRow {
  id: string;
  disaster_id: string;
  user_id: string;
  body_text: string;
  created_at: string;
}

export interface DisasterFilters {
  disaster_type?: DisasterType | string;
  severity?: DisasterSeverity;
  status?: DisasterStatus | DisasterStatus[];
}

export interface CreateDisasterPayload {
  disaster_type: DisasterType | string;
  latitude: number;
  longitude: number;
  location_label?: string | null;
  severity: DisasterSeverity;
  description: string;
  reporter_user_id: string;
}
