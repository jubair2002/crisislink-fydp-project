'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminSlug } from '@/lib/adminSlug';

export interface LoginActionState {
  error?: string;
}

const mapAuthError = (message: string): string => {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'Invalid email or password.';
  if (message.includes('Email not confirmed'))
    return 'Please confirm your email before signing in.';
  if (message.toLowerCase().includes('network'))
    return 'Network error. Check your connection and try again.';
  return message;
};

/**
 * Sign in via Supabase, verify the account is admin, then redirect server-side
 * to the admin slug. Returning the slug from the server (instead of letting
 * the client navigate) keeps the URL out of the JS bundle.
 *
 * Returns `{ error }` on failure so the form can render it inline; on success
 * `redirect()` throws and Next.js navigates the user.
 */
export const loginAction = async (
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: mapAuthError(error?.message ?? 'Login failed.') };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }

  if (profile?.role !== 'admin') {
    await supabase.auth.signOut();
    return { error: 'This account does not have admin access.' };
  }

  redirect(`/${getAdminSlug()}`);
};
