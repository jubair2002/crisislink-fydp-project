import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAdminSlug } from '@/lib/adminSlug';

/**
 * Refresh the Supabase auth session and gate routes based on authentication,
 * profile completion status, user roles, and volunteer verification status.
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

  // Helper to construct redirect with cookies preserved
  const createRedirect = (targetPath: string, searchParams?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    url.search = searchParams !== undefined ? searchParams : '';
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c);
    });
    return redirectRes;
  };

  // Route matches
  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === `/${adminSlug}` ||
    pathname.startsWith(`/${adminSlug}/`);

  const isCitizenRoute = pathname === '/citizen' || pathname.startsWith('/citizen/');
  const isVolunteerRoute = pathname === '/volunteer' || pathname.startsWith('/volunteer/');
  const isVolunteerPendingRoute = pathname === '/volunteer/pending';
  const isCompleteProfileRoute =
    pathname === '/complete-profile' || pathname.startsWith('/complete-profile/');

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password';

  // 1. UNPROTECTED / PUBLIC ROUTES PASS THROUGH
  // / /campaigns/* /map /track /disasters/* /auth/callback /update-password /api/*
  const isPublicPassThrough =
    pathname === '/' ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/map') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/disasters') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/update-password') ||
    pathname.startsWith('/api');

  // If unauthenticated:
  if (!user) {
    // If trying to access protected routes, redirect to login
    if (isAdminRoute || isCitizenRoute || isVolunteerRoute || isCompleteProfileRoute) {
      return createRedirect('/login', `?redirect=${encodeURIComponent(pathname)}`);
    }
    // Public routes, pass through
    return response;
  }

  // 2. USER IS LOGGED IN — FETCH PROFILE
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, profile_completed, account_status')
    .eq('user_id', user.id)
    .maybeSingle();

  // If user is suspended/blocked
  if (profile?.account_status === 'blocked') {
    if (!isAuthRoute) {
      return createRedirect('/login', '?error=blocked');
    }
    return response;
  }

  const role = profile?.role || 'citizen';
  const isProfileCompleted = Boolean(profile?.profile_completed);

  // If profile is NOT completed
  if (!isProfileCompleted) {
    if (!isCompleteProfileRoute) {
      // Must complete profile first
      return createRedirect('/complete-profile');
    }
    return response;
  }

  // Profile IS completed:
  // If attempting to visit /complete-profile when already complete, bounce to dashboard
  if (isCompleteProfileRoute) {
    if (role === 'admin' || role === 'authority') {
      return createRedirect(`/${adminSlug}`);
    }
    if (role === 'volunteer') {
      return createRedirect('/volunteer/dashboard');
    }
    return createRedirect('/citizen/dashboard');
  }

  // If authenticated user visits login, signup, forgot-password, bounce to their dashboard
  if (isAuthRoute) {
    if (role === 'admin' || role === 'authority') {
      return createRedirect(`/${adminSlug}`);
    }
    if (role === 'volunteer') {
      return createRedirect('/volunteer/dashboard');
    }
    return createRedirect('/citizen/dashboard');
  }

  // 3. ROLE-BASED ACCESS CONTROL FOR PROTECTED ROUTES

  // Admin routes: only admin or authority allowed
  if (isAdminRoute) {
    if (role !== 'admin' && role !== 'authority') {
      // Wrong role → redirect to correct dashboard
      if (role === 'volunteer') {
        return createRedirect('/volunteer/dashboard');
      }
      return createRedirect('/citizen/dashboard');
    }
    return response;
  }

  // Volunteer routes
  if (isVolunteerRoute) {
    // /volunteer/pending page can be viewed by volunteers
    if (isVolunteerPendingRoute) {
      if (role !== 'volunteer') {
        return createRedirect(
          role === 'admin' || role === 'authority' ? `/${adminSlug}` : '/citizen/dashboard',
        );
      }
      return response;
    }

    // Other volunteer routes (e.g. /volunteer/dashboard):
    if (role !== 'volunteer' && role !== 'admin') {
      // Wrong role → citizen dashboard
      return createRedirect('/citizen/dashboard');
    }

    // If volunteer, check verification status
    if (role === 'volunteer') {
      const { data: volunteer } = await supabase
        .from('volunteers')
        .select('verification_status')
        .eq('user_id', user.id)
        .maybeSingle();

      const verificationStatus = volunteer?.verification_status || 'pending';
      if (verificationStatus !== 'approved') {
        // Volunteer not approved accessing /volunteer/* → /volunteer/pending
        return createRedirect('/volunteer/pending');
      }
    }

    return response;
  }

  // Citizen routes (/citizen/*): logged in (any role can access)
  if (isCitizenRoute) {
    return response;
  }

  return response;
};
