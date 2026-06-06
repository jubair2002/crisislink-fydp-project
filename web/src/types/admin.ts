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

export interface DisasterFilters {
  type?: string;
  severity?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'created_at' | 'severity' | 'status';
  sortDir?: 'asc' | 'desc';
}

export interface DisasterRow {
  id: string;
  disaster_type: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  severity: string | null;
  status: string | null;
  reporter_user_id: string | null;
  description: string | null;
  verified_by_user_id: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DisasterUpdateRow {
  id: string;
  disaster_id: string;
  user_id: string;
  body_text: string;
  created_at: string;
}

export interface DisasterMediaRow {
  id: string;
  disaster_id: string;
  public_url: string | null;
  media_type: 'photo' | 'video' | string;
  purpose: 'report' | 'verification' | string | null;
  created_at: string | null;
}

export interface DisasterVerificationRow {
  id: string;
  disaster_id: string;
  volunteer_id: string;
  status: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface ResourceRequestRow {
  id: string;
  disaster_id: string;
  requested_item: string | null;
  quantity: number | null;
  status: string | null;
  requested_by: string | null;
  created_at: string | null;
}

export interface TaskRow {
  id: string;
  disaster_id: string | null;
  help_type: string | null;
  priority: string | null;
  status: string | null;
  assignment_mode: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskFilters {
  status?: string;
  assignmentMode?: string;
  priority?: string;
}

export interface VolunteerCandidate {
  volunteerId: string;
  userId: string;
  name: string;
  rating: number;
  skills: string[];
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  skillMatch: number;
}

export interface DisasterDetailPayload {
  disaster: DisasterRow;
  reporter: { name: string | null; email: string | null; phone: string | null; city: string | null } | null;
  verifier: { name: string | null; email: string | null } | null;
  media: DisasterMediaRow[];
  updates: DisasterUpdateRow[];
  verificationRecords: DisasterVerificationRow[];
  tasks: TaskRow[];
  assignments: TaskAssignmentRow[];
  resourceRequests: ResourceRequestRow[];
}

export interface CampaignFilters {
  status?: string;
  search?: string;
  sortBy?: 'start_date' | 'end_date' | 'collected_amount';
  sortDir?: 'asc' | 'desc';
}

export interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  disaster_id: string | null;
  target_amount: number | null;
  collected_amount: number | null;
  goal_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  media_url: string | null;
}

export interface CampaignUpdateAdminRow {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  created_at: string | null;
}

export interface CampaignResourceAdminRow {
  id: string;
  campaign_id: string;
  resource_type: string;
  quantity_pledged: number;
  quantity_purchased: number;
  purchase_amount: number;
  quantity_distributed: number;
  updated_at: string | null;
}

export interface DonationAdminRow {
  id: string;
  donation_code: string | null;
  campaign_id: string | null;
  user_id: string | null;
  donor_name: string | null;
  anonymous: boolean | null;
  amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  payment_status: string | null;
  created_at: string | null;
  campaigns?: { title: string | null } | null;
}

export interface DonationTrackingAdminRow {
  id: string;
  donation_id: string;
  status: string | null;
  amount: number | null;
  description: string | null;
  proof_url: string | null;
  updated_at: string | null;
}

export interface CampaignFundSummary {
  campaignId: string;
  title: string;
  collected: number;
  allocated: number;
  available: number;
  paidDonationCount: number;
}

export interface DonationFilters {
  status?: string;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CampaignDetailPayload {
  campaign: CampaignRow;
  updates: CampaignUpdateAdminRow[];
  resources: CampaignResourceAdminRow[];
  donations: DonationAdminRow[];
  disaster: { id: string; disaster_type: string | null; location_label: string | null } | null;
}
