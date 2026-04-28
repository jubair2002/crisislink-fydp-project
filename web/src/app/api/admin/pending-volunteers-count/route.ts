import { NextResponse } from 'next/server';
import { getAdminProfile, getCurrentUser } from '@/lib/auth';
import { countPendingVolunteers } from '@/lib/adminService';

export async function GET() {
  const user = await getCurrentUser();
  const admin = await getAdminProfile();
  if (!user || !admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const count = await countPendingVolunteers();
  return NextResponse.json({ count });
}
