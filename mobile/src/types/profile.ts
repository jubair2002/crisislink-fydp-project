export type VolunteerSkill =
  | 'medical_assistance'
  | 'search_rescue'
  | 'food_distribution'
  | 'logistics_support'
  | 'engineering_support'
  | 'psychological_support'
  | 'other';

export type VolunteerAvailability = 'full_time' | 'part_time' | 'emergency_only';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type DisasterType =
  | 'flood'
  | 'fire'
  | 'earthquake'
  | 'cyclone'
  | 'landslide'
  | 'building_collapse'
  | 'accident'
  | 'other';

export type DocumentKind = 'national_id' | 'volunteer_cert' | 'org_proof';

export interface VolunteerProfile {
  id: string;
  user_id: string;
  age: number | null;
  gender: string | null;
  skills: VolunteerSkill[];
  availability: VolunteerAvailability | null;
  availability_status: 'online' | 'offline' | 'available' | 'busy';
  working_hours: string | null;
  preferred_disaster_types: DisasterType[];
  has_previous_experience: boolean;
  years_of_experience: number;
  organization: string | null;
  national_id_url: string | null;
  volunteer_cert_url: string | null;
  org_proof_url: string | null;
  verification_status: VerificationStatus;
  verification_rejection_reason?: string | null;
  volunteer_type: 'verified' | 'casual' | 'spontaneous';
  rating: number;
  tasks_completed: number;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
}

export interface CitizenProfileInput {
  phone: string;
  address: string;
  city: string;
  emergency_contact?: string;
  profile_photo_url?: string;
}

export interface VolunteerProfileInput {
  phone: string;
  address: string;
  age: number;
  gender: string;
  profile_photo_url?: string;

  skills: VolunteerSkill[];

  availability: VolunteerAvailability;
  working_hours: string;
  preferred_disaster_types: DisasterType[];

  has_previous_experience: boolean;
  years_of_experience?: number;
  organization?: string;

  national_id_url?: string;
  volunteer_cert_url?: string;
  org_proof_url?: string;
}

export const SKILL_OPTIONS: { value: VolunteerSkill; label: string; icon: string }[] = [
  { value: 'medical_assistance', label: 'Medical Assistance', icon: 'medkit-outline' },
  { value: 'search_rescue', label: 'Search & Rescue', icon: 'search-outline' },
  { value: 'food_distribution', label: 'Food Distribution', icon: 'restaurant-outline' },
  { value: 'logistics_support', label: 'Logistics Support', icon: 'cube-outline' },
  { value: 'engineering_support', label: 'Engineering Support', icon: 'construct-outline' },
  { value: 'psychological_support', label: 'Psychological Support', icon: 'heart-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const DISASTER_TYPE_OPTIONS: { value: DisasterType; label: string; icon: string }[] = [
  { value: 'flood', label: 'Flood', icon: 'water-outline' },
  { value: 'fire', label: 'Fire', icon: 'flame-outline' },
  { value: 'earthquake', label: 'Earthquake', icon: 'pulse-outline' },
  { value: 'cyclone', label: 'Cyclone', icon: 'thunderstorm-outline' },
  { value: 'landslide', label: 'Landslide', icon: 'trail-sign-outline' },
  { value: 'building_collapse', label: 'Building Collapse', icon: 'business-outline' },
  { value: 'accident', label: 'Accident', icon: 'warning-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const AVAILABILITY_OPTIONS: { value: VolunteerAvailability; label: string; desc: string }[] = [
  { value: 'full_time', label: 'Full-time', desc: 'Available all days' },
  { value: 'part_time', label: 'Part-time', desc: 'Few hours daily' },
  { value: 'emergency_only', label: 'Emergency Only', desc: 'Critical situations' },
];

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
