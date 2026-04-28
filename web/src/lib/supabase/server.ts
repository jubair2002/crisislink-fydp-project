import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client tied to the current request's cookies.
 *
 * Use this from server components, route handlers, and server actions when you
 * want to act on behalf of the signed-in user (RLS is enforced).
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
};

/**
 * Service-role Supabase client.
 *
 * Bypasses RLS — only ever instantiate this on the server, behind admin
 * authorization checks. Used for privileged admin operations like updating any
 * user, reading audit logs, or writing on behalf of the system.
 */
export const createServiceClient = () => {
  const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  // Common local-env issues: copied with quotes/newlines/spaces.
  const serviceRoleKey = rawServiceRoleKey
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/^'(.*)'$/, '$1')
    .replace(/\r?\n/g, '');
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is empty after trimming.');
  }
  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY appears to be a publishable/anon key. Use the service_role secret key.',
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
