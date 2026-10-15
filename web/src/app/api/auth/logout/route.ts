import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[Logout API] Error signing out from Supabase:', err);
  }

  const response = NextResponse.json({ success: true });

  // Delete cl_role cookie
  response.cookies.set('cl_role', '', {
    path: '/',
    maxAge: 0,
    httpOnly: false,
    sameSite: 'lax',
  });

  return response;
}
