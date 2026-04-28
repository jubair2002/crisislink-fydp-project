import type { AccountStatus, Profile, UserRole } from '@/types/auth';

export interface UserListFilters {
  search?: string;
  role?: UserRole | '';
  city?: string;
  status?: AccountStatus | '';
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedUsers {
  rows: Profile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VolunteerListFilters {
  verificationStatus?: string;
  skill?: string;
  availability?: string;
}

export interface VolunteerProfileRow {
  id: string;
  user_id: string;
  age: number | null;
  gender: string | null;
  skills: string[] | null;
  availability: string | null;
  availability_status: string | null;
  working_hours: string | null;
  preferred_disaster_types: string[] | null;
  has_previous_experience: boolean | null;
  years_of_experience: number | null;
  organization: string | null;
  national_id_url: string | null;
  volunteer_cert_url: string | null;
  org_proof_url: string | null;
  verification_status: string | null;
  volunteer_type: string | null;
  rating: number | null;
  tasks_completed: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string | null;
}

export interface VolunteerListRow extends VolunteerProfileRow {
  profile: Pick<Profile, 'name' | 'email' | 'city' | 'phone' | 'profile_photo_url'> | null;
}

export interface PaginatedVolunteers {
  rows: VolunteerListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskAssignmentRow {
  id: string;
  task_id: string;
  volunteer_id: string;
  status: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  tasks: {
    id: string;
    disaster_id: string | null;
    help_type: string | null;
    priority: string | null;
    status: string | null;
    created_at: string | null;
  } | null;
}

export interface AdminLogRow {
  id: string;
  admin_id: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  timestamp: string | null;
  details: Record<string, unknown> | null;
}

export interface VolunteerDetailPayload {
  volunteer: VolunteerProfileRow;
  profile: Profile | null;
  assignments: TaskAssignmentRow[];
  auditLog: AdminLogRow[];
}
