import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
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
              // Ignore
            }
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) {
          // First Google login — create profile
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'User';

          await supabase.from('profiles').insert({
            user_id: user.id,
            name: fullName,
            email: user.email || '',
            role: 'citizen', // default
            profile_completed: false,
          });

          // Default settings
          await supabase
            .from('user_settings')
            .upsert({ user_id: user.id }, { onConflict: 'user_id' });

          return NextResponse.redirect(`${origin}/complete-profile`);
        }

        if (!profile.profile_completed) {
          return NextResponse.redirect(`${origin}/complete-profile`);
        }

        // Route by role
        const routes: Record<string, string> = {
          admin: '/admin',
          authority: '/admin',
          volunteer: '/volunteer/dashboard',
          citizen: '/citizen/dashboard',
        };

        const target = routes[profile.role] || '/citizen/dashboard';
        return NextResponse.redirect(`${origin}${target}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
