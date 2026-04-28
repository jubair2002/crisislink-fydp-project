import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVolunteerDetail } from '@/lib/adminService';
import { buildNavHref } from '@/lib/nav';
import VolunteerDetailClient from './VolunteerDetailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ adminSlug: string; id: string }>;
}) {
  const { adminSlug, id } = await params;
  const d = await getVolunteerDetail(id);
  const name = d?.profile?.name ?? 'Volunteer';
  return { title: `${name} · Volunteers · CrisisLink Admin`, description: `Admin · ${adminSlug}` };
}

export default async function VolunteerDetailPage({
  params,
}: {
  params: Promise<{ adminSlug: string; id: string }>;
}) {
  const { adminSlug, id } = await params;
  const detail = await getVolunteerDetail(id);
  if (!detail) notFound();

  return (
    <VolunteerDetailClient slug={adminSlug} detail={detail} listHref={buildNavHref(adminSlug, '/volunteers')} />
  );
}
