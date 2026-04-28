import { notFound, redirect } from 'next/navigation';
import { getAdminSlug } from '@/lib/adminSlug';
import { getAdminProfile, getCurrentUser } from '@/lib/auth';
import Sidebar from './_components/Sidebar';
import Topbar from './_components/Topbar';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ adminSlug: string }>;
}) {
  // Validate the URL slug FIRST — before any Supabase calls — so wrong-slug
  // probes get a cheap 404 with no signal that this path is sensitive.
  const { adminSlug } = await params;
  if (adminSlug !== getAdminSlug()) notFound();

  // Then enforce auth. The proxy already redirects unauthenticated users on
  // admin paths, but we re-check here as defense-in-depth.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getAdminProfile();
  if (!profile) redirect('/login?error=forbidden');

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar slug={adminSlug} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar profile={profile} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
