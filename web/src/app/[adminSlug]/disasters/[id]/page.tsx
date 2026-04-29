import { notFound } from 'next/navigation';
import { getDisasterDetailPayload } from '@/lib/adminService';
import DisasterDetailClient from './DisasterDetailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Disaster ${id.slice(0, 8)} · CrisisLink Admin` };
}

export default async function DisasterDetailPage({
  params,
}: {
  params: Promise<{ adminSlug: string; id: string }>;
}) {
  const { adminSlug, id } = await params;
  const payload = await getDisasterDetailPayload(id);
  if (!payload) notFound();
  return <DisasterDetailClient slug={adminSlug} payload={payload} />;
}
