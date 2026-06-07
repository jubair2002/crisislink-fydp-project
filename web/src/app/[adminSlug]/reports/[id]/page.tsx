import { notFound } from 'next/navigation';
import { getReportDetailPayload } from '@/lib/adminService';
import ReportDetailClient from './ReportDetailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Report ${id.slice(0, 8)} · CrisisLink Admin` };
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ adminSlug: string; id: string }>;
}) {
  const { adminSlug, id } = await params;
  const payload = await getReportDetailPayload(id);
  if (!payload) notFound();
  return <ReportDetailClient slug={adminSlug} payload={payload} />;
}
