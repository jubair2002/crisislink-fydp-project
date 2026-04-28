import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getAdminSlug } from '@/lib/adminSlug';

export default async function HomePage() {
  // Keep `/` public. Only slugged admin routes are protected by proxy/layout.
  // Authenticated admins can still be fast-tracked to the dashboard.
  const user = await getCurrentUser();
  if (user) redirect(`/${getAdminSlug()}`);

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <section className="w-full max-w-xl rounded-xl border border-surface-border bg-surface shadow-card p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">CrisisLink Admin</h1>
        <p className="text-sm text-ink-muted">
          This is the public root page. Admin login is required only when you open the admin slug
          route.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Go to admin login
        </Link>
      </section>
    </main>
  );
}
