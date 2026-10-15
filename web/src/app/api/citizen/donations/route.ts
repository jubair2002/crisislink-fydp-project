import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServiceClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let db;
    try {
      db = createServiceClient();
    } catch {
      db = await createClient();
    }

    const { data: donations, error } = await db
      .from('donations')
      .select('id, donation_code, amount, payment_status, payment_method, created_at, campaigns(id, title, media_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API donations] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, donations: donations || [] });
  } catch (err: any) {
    console.error('[API donations] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
