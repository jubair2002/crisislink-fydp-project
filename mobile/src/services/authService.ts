import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabaseClient';
import { Profile, UserRole } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

// ─── Error message mapper ──────────────────────────────────────────────────
export const mapAuthError = (message: string): string => {
  if (message.includes('User already registered') || message.includes('already registered'))
    return 'Email already registered. Please sign in instead.';
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'Invalid email or password. Please try again.';
  if (message.includes('Email not confirmed') || message.includes('email not confirmed'))
    return 'Please check your email to confirm your account.';
  if (message.includes('Password should be at least'))
    return 'Password must be at least 6 characters.';
  if (message.includes('Unable to validate email address'))
    return 'Please enter a valid email address.';
  if (message.includes('signup is disabled'))
    return 'New registrations are currently disabled.';
  return message;
};

// ─── Sign Up ───────────────────────────────────────────────────────────────
export const signUpWithEmail = async (
  name: string,
  email: string,
  password: string,
  role: UserRole,
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });

  if (error) throw new Error(mapAuthError(error.message));

  // The DB trigger `on_auth_user_created` always creates a matching
  // `profiles` row, so we no longer rely on a client-side insert.
  // We still upsert here as a belt-and-braces measure for cases where
  // the trigger hasn't run yet (e.g. extremely fast follow-up calls).
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { user_id: data.user.id, name, email, role },
        { onConflict: 'user_id', ignoreDuplicates: false },
      );
    if (profileError) console.warn('Profile upsert warning:', profileError.message);
  }

  return data;
};

// ─── Ensure Profile Exists ────────────────────────────────────────────────
/**
 * Safety net: if a user signed in but has no `profiles` row (legacy users
 * from before the trigger existed, or any edge case), create one from their
 * auth metadata so the app stays usable.
 */
export const ensureProfileExists = async (
  userId: string,
  authUser: { email?: string | null; user_metadata?: Record<string, unknown> | null },
): Promise<Profile | null> => {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const meta = authUser.user_metadata ?? {};
  const name = (meta.name as string) ?? (authUser.email?.split('@')[0] ?? 'User');
  const role = ((meta.role as string) ?? 'citizen') as UserRole;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        name,
        email: authUser.email ?? '',
        role,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error) {
    console.warn('ensureProfileExists failed:', error.message);
    return null;
  }
  return data as Profile;
};

// ─── Sign In ───────────────────────────────────────────────────────────────
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(mapAuthError(error.message));
  return data;
};

// ─── Google OAuth ──────────────────────────────────────────────────────────
export const signInWithGoogle = async () => {
  const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'crisislink' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) throw new Error(error?.message ?? 'OAuth URL not returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    const url = new URL(result.url);
    const params = new URLSearchParams(url.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw new Error(mapAuthError(sessionError.message));

      // Ensure profile exists for OAuth users
      if (sessionData.user) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', sessionData.user.id)
          .single();

        if (!existing) {
          await supabase.from('profiles').insert({
            user_id: sessionData.user.id,
            name: sessionData.user.user_metadata?.name ?? '',
            email: sessionData.user.email ?? '',
            role: 'citizen',
          });
        }
      }

      return sessionData;
    }
  }

  return null;
};

// ─── Sign Out ──────────────────────────────────────────────────────────────
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

// ─── Reset Password ────────────────────────────────────────────────────────
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'crisislink://reset-password',
  });
  if (error) throw new Error(mapAuthError(error.message));
};

// ─── Change Password ───────────────────────────────────────────────────────
/**
 * Verify the user's current password by hitting the GoTrue token endpoint
 * directly (so we don't replace the active session via signInWithPassword,
 * which would trigger the auth state listener and deadlock against
 * updateUser's internal lock). Then update to the new password.
 */
export const changePassword = async (
  email: string,
  currentPassword: string,
  newPassword: string,
) => {
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }
  if (newPassword === currentPassword) {
    throw new Error('New password must be different from your current password.');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured.');
  }

  // Re-authenticate by calling the token endpoint directly. This validates
  // the password without affecting the supabase-js client session.
  const reauthRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ email, password: currentPassword }),
  });

  if (!reauthRes.ok) {
    if (reauthRes.status === 400) {
      throw new Error('Current password is incorrect.');
    }
    throw new Error('Could not verify current password. Please try again.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(mapAuthError(error.message));
};

// ─── Delete Account ────────────────────────────────────────────────────────
/**
 * Permanently delete the authenticated user. Calls the `delete_account`
 * Postgres RPC (security-definer) which removes the auth.users row;
 * profiles, volunteers and any other FK-referenced rows cascade.
 *
 * After the RPC succeeds the JWT belongs to a user that no longer exists,
 * so we sign out with `scope: 'local'` (clears local storage only, no
 * server round-trip — which would 403 and could hang).
 */
export const deleteAccount = async () => {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw new Error(mapAuthError(error.message));
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
};

// ─── Get Current User ──────────────────────────────────────────────────────
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

// ─── Get Profile ───────────────────────────────────────────────────────────
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data as Profile;
};

// ─── Auth State Change ─────────────────────────────────────────────────────
export const onAuthStateChange = (
  callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void,
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};
