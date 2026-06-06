import type { DisasterRow } from './disaster';

export type HomeDisaster = DisasterRow & {
  distanceKm?: number;
};

export interface CampaignRow {
  id: string;
  title: string;
  location?: string | null;
  status: string;
  target_amount: number;
  collected_amount: number;
  end_date?: string | null;
  media_url?: string | null;
  created_at?: string;
}

export interface ResourceCenterRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity_max?: number | null;
  capacity_current?: number | null;
  distanceKm?: number;
}

export interface CampaignUpdateRow {
  id: string;
  campaign_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  campaigns?: { title: string } | null;
}

export interface HomeTaskAssignment {
  id: string;
  task_id: string;
  volunteer_id: string;
  status: string;
  assigned_at: string;
  accepted_at: string | null;
  task?: {
    id: string;
    task_type?: string;
    help_type?: string;
    priority?: string;
    status?: string;
    required_volunteers?: number;
    disaster?: {
      id: string;
      disaster_type: string;
      severity: string;
      latitude: number;
      longitude: number;
      location_label?: string | null;
    } | null;
  } | null;
}

export interface VolunteerCampaignNeed {
  campaign_id: string;
  title: string;
  location: string;
  help_type: string;
}

export type SectionKey =
  | 'disasters'
  | 'campaigns'
  | 'centers'
  | 'updates'
  | 'volunteerTasks'
  | 'volunteerCampaigns';
