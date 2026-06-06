import { getCampaignDetailPayload } from '@/lib/adminService';
import { notFound } from 'next/navigation';
import CampaignDetailClient from './CampaignDetailClient';

export const metadata = { title: 'Campaign Detail · CrisisLink Admin' };

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ adminSlug: string; id: string }>;
}) {
  const { adminSlug, id } = await params;
  const data = await getCampaignDetailPayload(id);
  if (!data) notFound();
  return <CampaignDetailClient slug={adminSlug} data={data} />;
}
