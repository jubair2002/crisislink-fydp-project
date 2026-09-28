import { createClient } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/types/auth';

export const mapAuthError = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return 'Please verify your email before logging in.';
  }
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'Email already registered. Please sign in instead.';
  }
  if (lower.includes('password') && lower.includes('least')) {
    return 'Password must be at least 8 characters long.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  if (lower.includes('blocked') || lower.includes('suspended')) {
    return 'Account suspended. Contact support.';
  }
  return message;
};

/**
 * Sign up a new user with email and password, initializing
 * their profile and settings tables.
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
  role: UserRole = 'citizen',
) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        full_name: name,
        role,
      },
    },
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  if (data.user) {
    const userId = data.user.id;

    // 1. Upsert profiles table
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        name,
        email,
        role,
        profile_completed: false,
      },
      { onConflict: 'user_id' },
    );

    if (profileError) {
      console.warn('[authService] profile upsert warning:', profileError.message);
    }

    // 2. If role is volunteer, initialize volunteers & volunteer_settings
    if (role === 'volunteer') {
      const { error: volError } = await supabase.from('volunteers').upsert(
        {
          user_id: userId,
          verification_status: 'pending',
        },
        { onConflict: 'user_id' },
      );
      if (volError) {
        console.warn('[authService] volunteer record warning:', volError.message);
      }

      const { error: volSetError } = await supabase.from('volunteer_settings').upsert(
        {
          user_id: userId,
        },
        { onConflict: 'user_id' },
      );
      if (volSetError) {
        console.warn('[authService] volunteer_settings warning:', volSetError.message);
      }
    }

    // 3. User settings defaults
    const { error: setErr } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
      },
      { onConflict: 'user_id' },
    );
    if (setErr) {
      console.warn('[authService] user_settings warning:', setErr.message);
    }
  }

  return data;
}

/**
 * Sign in existing user with email and password.
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  if (data.user) {
    const profile = await getProfile(data.user.id);
    if (profile?.account_status === 'blocked') {
      await supabase.auth.signOut();
      throw new Error('Account suspended. Contact support.');
    }
    return { ...data, profile };
  }

  return { ...data, profile: null };
}

/**
 * Initiate Google OAuth sign in.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

/**
 * Sign out the currently active user rapidly without network hanging.
 */
export async function signOut() {
  const supabase = createClient();

  // 1. Clear local session immediately (non-blocking, instantaneous)
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.warn('[authService] local signOut warning:', e);
  }

  // 2. Clear all auth cookies explicitly from the browser document
  if (typeof document !== 'undefined') {
    const cookieList = document.cookie.split(';');
    for (const cookie of cookieList) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth-token')) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax`;
      }
    }
  }

  // 3. Initiate server session invalidation in background (fire-and-forget)
  supabase.auth.signOut().catch(() => {});
}

/**
 * Send password reset email with update-password redirect.
 */
export async function resetPassword(email: string) {
  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/update-password`,
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

/**
 * Update authenticated user's password.
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

/**
 * Fetch profile for a given user ID.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[authService] getProfile error:', error.message);
    return null;
  }

  return data as Profile;
}

/**
 * Update profile for a given user ID.
 */
export async function updateProfile(
  userId: string,
  data: Partial<Profile>,
): Promise<Profile> {
  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updated as Profile;
}

/**
 * Initialize default user and volunteer settings.
 */
export async function createInitialSettings(userId: string, role?: UserRole) {
  const supabase = createClient();

  await supabase.from('user_settings').upsert({ user_id: userId }, { onConflict: 'user_id' });

  if (role === 'volunteer') {
    await supabase
      .from('volunteer_settings')
      .upsert({ user_id: userId }, { onConflict: 'user_id' });
  }
}
