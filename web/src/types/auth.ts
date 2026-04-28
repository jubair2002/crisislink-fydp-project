export type UserRole = 'citizen' | 'volunteer' | 'admin' | 'authority';

export type AccountStatus = 'active' | 'blocked';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  role: UserRole;
  /** When blocked, the user should be treated as suspended from the platform. */
  account_status?: AccountStatus;
  profile_completed: boolean;
  profile_photo_url?: string | null;
  emergency_contact?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}
