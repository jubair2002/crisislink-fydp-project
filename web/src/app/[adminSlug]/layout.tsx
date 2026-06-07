import { notFound, redirect } from 'next/navigation';
import { getAdminSlug } from '@/lib/adminSlug';
import { getAdminProfile, getCurrentUser } from '@/lib/auth';
import AdminShell from './_components/AdminShell';

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
    <AdminShell slug={adminSlug} profile={profile}>
      {children}
    </AdminShell>
  );
}
