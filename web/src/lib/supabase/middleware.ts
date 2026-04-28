import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAdminSlug } from '@/lib/adminSlug';

/**
 * Refresh the Supabase auth session and gate the admin tree.
 *
 * Performance notes:
 *   - We deliberately do NOT query the `profiles` table here. The role check
 *     happens once in the admin layout (RSC), not on every navigation. This
 *     removes a Supabase HTTP round-trip from every page transition — the
 *     dominant cost we measured before this rewrite.
 *   - We still call `auth.getUser()` because Supabase's SSR contract requires
 *     it: that's what refreshes expired access tokens and propagates the
 *     fresh cookies onto the response.
 *
 * Behaviour:
 *   - `/<ADMIN_SLUG>/*` and unauthenticated → redirect to /login?redirect=…
 *   - `/login` and authenticated → bounce to /<ADMIN_SLUG> (the admin layout
 *     will sign out non-admins from there).
 *   - Anything else → just refresh the cookie and pass through.
 */
export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminSlug = getAdminSlug();
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname === `/${adminSlug}` || pathname.startsWith(`/${adminSlug}/`);
  const isLoginRoute = pathname === '/login';

  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${adminSlug}`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
};
