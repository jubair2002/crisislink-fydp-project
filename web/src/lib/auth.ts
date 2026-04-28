import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/auth';

/**
 * Per-request cached helpers around `auth.getUser()` and the `profiles` row.
 *
 * React's `cache()` dedupes calls within a single server render, so the layout
 * + topbar + page can each call `getCurrentProfile()` and we still only do a
 * single round-trip to Supabase per request.
 *
 * These are NOT shared across the proxy (middleware) and the RSC layout —
 * those run in different phases and can't share a request-scoped cache.
 * The proxy intentionally avoids the profile query for that reason.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<Profile>();

  if (error) {
    console.warn('[auth] failed to load profile:', error.message);
    return null;
  }
  return data;
});

export const getAdminProfile = cache(async (): Promise<Profile | null> => {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin' ? profile : null;
});
