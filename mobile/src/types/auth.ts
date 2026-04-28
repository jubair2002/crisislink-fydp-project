export type UserRole = 'citizen' | 'volunteer' | 'admin' | 'authority';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  role: UserRole;
  profile_completed: boolean;
  profile_photo_url?: string;
  emergency_contact?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}
