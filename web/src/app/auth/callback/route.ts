import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('redirect');

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
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
            // Ignored if called during response streaming
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error('[auth/callback] Code exchange error:', error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message || 'Authentication failed')}`
    );
  }

  const user = data.user;

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Citizen';

    // Upsert citizen profile
    await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        name: fullName,
        email: user.email,
        role: 'citizen',
        profile_completed: false,
        account_status: 'active',
      },
      { onConflict: 'user_id' }
    );

    // Upsert user settings
    await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        notifications_enabled: true,
        disaster_alerts: true,
        chat_notifications: true,
        campaign_updates: true,
        language: 'en',
        theme: 'system',
        location_sharing: true,
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.redirect(`${origin}/complete-profile`);
  }

  // Profile exists but is incomplete
  if (profile.profile_completed === false) {
    return NextResponse.redirect(`${origin}/complete-profile`);
  }

  // Account suspended
  if (profile.account_status === 'blocked') {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=suspended`);
  }

  // Route by role
  if (profile.role === 'admin') {
    return NextResponse.redirect(`${origin}/admin`);
  }
  if (profile.role === 'volunteer') {
    return NextResponse.redirect(`${origin}/use-mobile`);
  }

  // Default citizen
  const destination = redirectParam ? `${origin}${redirectParam}` : `${origin}/citizen/dashboard`;
  return NextResponse.redirect(destination);
}
