import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';

export interface AuthResponse<T = unknown> {
  data?: T | null;
  error?: string | null;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ProfileUpdateData {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  emergency_contact?: string | null;
  profile_photo_url?: string | null;
  profile_completed?: boolean;
  bio?: string | null;
}

/**
 * Citizen Sign Up
 * Role is ALWAYS 'citizen', profile_completed starts as false.
 * Also initializes user_settings for the new user.
 */
export async function signUp({ name, email, password }: SignUpData): Promise<AuthResponse<{ userId: string }>> {
  const supabase = createClient();

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  // 1. Sign up user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        full_name: trimmedName,
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || 'Failed to create account.' };
  }

  const userId = authData.user.id;

  // 2. Insert/upsert into profiles table
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      name: trimmedName,
      email: trimmedEmail,
      role: 'citizen',
      profile_completed: false,
      account_status: 'active',
    },
    { onConflict: 'user_id' }
  );

  if (profileError) {
    console.warn('[authService] Profile upsert warning:', profileError.message);
  }

  // 3. Insert into user_settings table
  await createInitialSettings(userId);

  return { data: { userId } };
}

/**
 * User Sign In
 * Validates credentials, checks account status, and fetches profile.
 */
export async function signIn({ email, password }: SignInData): Promise<AuthResponse<{ user: unknown; profile: Profile | null }>> {
  const supabase = createClient();

  const trimmedEmail = email.trim().toLowerCase();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (authError || !authData.user) {
    const msg = authError?.message || '';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return { error: 'Invalid email or password. Please try again.' };
    }
    if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
      return { error: 'Please verify your email before logging in.' };
    }
    return { error: msg || 'Login failed. Please try again.' };
  }

  // Fetch profile to verify role and account status
  const profile = await getProfile(authData.user.id);

  if (profile?.account_status === 'blocked') {
    await supabase.auth.signOut();
    return { error: 'Account suspended. Contact support.' };
  }

  return {
    data: {
      user: authData.user,
      profile,
    },
  };
}

/**
 * Continue with Google (OAuth)
 */
export async function signInWithGoogle(origin: string): Promise<AuthResponse> {
  const supabase = createClient();

  const redirectTo = `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function signOut(): Promise<AuthResponse> {
  try {
    // 1. Clear cookie on client
    if (typeof document !== 'undefined') {
      document.cookie = 'cl_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    }

    // 2. Clear cookie on server via API
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});

    // 3. Clear Supabase client session
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
    return { data: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign out error';
    return { error: message };
  }
}

/**
 * Send Password Reset Email
 */
export async function resetPassword(email: string, origin: string): Promise<AuthResponse> {
  const supabase = createClient();
  const redirectTo = `${origin}/update-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return { data: true };
}

/**
 * Update Password (for logged-in user or reset flow)
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { data: true };
}

/**
 * Get User Profile
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[authService] Error fetching profile:', error.message);
    return null;
  }

  return data as Profile | null;
}

/**
 * Update User Profile
 */
export async function updateProfile(userId: string, updates: ProfileUpdateData): Promise<AuthResponse<Profile>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as Profile };
}

/**
 * Create initial user settings row
 */
export async function createInitialSettings(userId: string): Promise<void> {
  const supabase = createClient();

  try {
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('user_settings').insert({
        user_id: userId,
        notifications_enabled: true,
        disaster_alerts: true,
        chat_notifications: true,
        campaign_updates: true,
        language: 'en',
        theme: 'system',
        location_sharing: true,
      });
    }
  } catch (err) {
    console.warn('[authService] user_settings initial insert error:', err);
  }
}
