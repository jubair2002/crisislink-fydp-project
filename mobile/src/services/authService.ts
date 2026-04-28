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

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: data.user.id,
      name,
      email,
      role,
    });
    if (profileError) console.warn('Profile upsert warning:', profileError.message);
  }

  return data;
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
