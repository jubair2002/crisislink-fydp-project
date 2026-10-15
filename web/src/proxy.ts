import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAdminSlug } from '@/lib/adminSlug';

/**
 * Public routes that require no authentication.
 */
const PUBLIC_PREFIXES = [
  '/',
  '/about',
  '/terms',
  '/privacy',
  '/campaigns',
  '/map',
  '/track',
  '/disasters',
  '/login',
  '/signup',
  '/forgot-password',
  '/update-password',
  '/auth/callback',
  '/donation',
  '/use-mobile',
  '/api',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === '/') return false;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`.
 * Enforces role-based gating, citizen dashboard protection, and profile completion.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const adminSlug = getAdminSlug();

  // Helper redirect
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to.split('?')[0];
    const search = to.includes('?') ? to.slice(to.indexOf('?')) : '';
    url.search = search;
    return NextResponse.redirect(url);
  };

  // Route classifications
  const isVolunteerRoute = pathname === '/volunteer' || pathname.startsWith('/volunteer/');
  const isAdminRoute =
    pathname === `/${adminSlug}` ||
    pathname.startsWith(`/${adminSlug}/`) ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/');
  const isCitizenRoute = pathname === '/citizen' || pathname.startsWith('/citizen/');
  const isCompleteProfileRoute = pathname === '/complete-profile';
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // Fast exit: if public route that doesn't need auth checks or redirects, return immediately without network overhead
  if (!isVolunteerRoute && !isAdminRoute && !isCitizenRoute && !isCompleteProfileRoute && !isAuthRoute) {
    return response;
  }

  // Fast bypass for Next.js internal router prefetch requests to avoid saturating Supabase connection pool
  if (request.headers.get('next-router-prefetch') === '1') {
    return response;
  }

  // Fast session check: verify that BOTH cl_role cookie and Supabase auth token exist
  const verifiedRole = request.cookies.get('cl_role')?.value;
  const hasAuthToken = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && c.value.length > 10
  );

  if (isCitizenRoute && verifiedRole === 'citizen') {
    if (hasAuthToken) {
      return response;
    }
    // Stale role cookie without valid auth token -> purge and redirect to login
    const loginRedirect = redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
    loginRedirect.cookies.set('cl_role', '', { path: '/', maxAge: 0 });
    return loginRedirect;
  }

  // 1. Initialize Supabase SSR client for token refresh & cookie sync
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. /volunteer/* → redirect to /use-mobile
  if (isVolunteerRoute) {
    return redirect('/use-mobile');
  }

  // 3. Admin routes: /<adminSlug>/* or /admin/*
  if (isAdminRoute) {
    if (!user) {
      return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
    // Leave role check to existing admin layout RSC
    return response;
  }

  // 4. Protected Citizen routes: /citizen/*
  if (isCitizenRoute) {
    if (!user) {
      return redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
    }

    // Query profile for role & completion
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, profile_completed, account_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.account_status === 'blocked') {
      await supabase.auth.signOut();
      return redirect('/login?error=suspended');
    }

    if (!profile || profile.profile_completed === false) {
      return redirect('/complete-profile');
    }

    if (profile.role === 'admin') {
      return redirect(`/${adminSlug}`);
    }

    if (profile.role === 'volunteer') {
      return redirect('/use-mobile');
    }

    // Role is citizen -> allow and cache verified role cookie for instantaneous transitions
    response.cookies.set('cl_role', 'citizen', {
      path: '/',
      httpOnly: false,
      maxAge: 86400,
      sameSite: 'lax',
    });
    return response;
  }

  // 5. Complete Profile route: /complete-profile
  if (isCompleteProfileRoute) {
    if (!user) {
      return redirect('/login?redirect=/complete-profile');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_completed, role')
      .eq('user_id', user.id)
      .maybeSingle();

    // If profile is already completed, redirect to dashboard
    if (profile && profile.profile_completed) {
      if (profile.role === 'admin') return redirect(`/${adminSlug}`);
      if (profile.role === 'volunteer') return redirect('/use-mobile');
      return redirect('/citizen/dashboard');
    }

    return response;
  }

  // 6. Logged in user visiting /login or /signup
  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, profile_completed, account_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.account_status === 'blocked') {
      await supabase.auth.signOut();
      return response;
    }

    if (!profile || profile.profile_completed === false) {
      return redirect('/complete-profile');
    }

    if (profile.role === 'admin') {
      return redirect(`/${adminSlug}`);
    }
    if (profile.role === 'volunteer') {
      return redirect('/use-mobile');
    }

    return redirect('/citizen/dashboard');
  }

  // 7. Public routes pass through
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
