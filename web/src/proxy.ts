import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`. Same API,
 * same `NextRequest` / `NextResponse` semantics — just a file/function rename.
 */
export const proxy = (request: NextRequest) => updateSession(request);

export const config = {
  // Skip Next.js internals, static assets, and API routes — the proxy only
  // needs to run on user-facing HTML routes so it can refresh the auth cookie
  // and gate the admin tree. Narrower than before to keep navigation snappy.
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
