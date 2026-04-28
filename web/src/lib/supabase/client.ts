import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 *
 * Used by client components. Authenticates as the signed-in user and respects
 * row-level security. Cookies are written/read by `@supabase/ssr` so the same
 * session flows through to server components and route handlers.
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
