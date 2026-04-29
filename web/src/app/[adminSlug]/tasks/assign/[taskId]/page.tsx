import { notFound } from 'next/navigation';
import { getTaskById, getVolunteerCandidatesForTask } from '@/lib/adminService';
import AssignTaskClient from './AssignTaskClient';

export const metadata = { title: 'Volunteer Assignment · CrisisLink Admin' };

export default async function TaskAssignPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug, taskId } = await params;
  const sp = await searchParams;
  const reassign = (Array.isArray(sp.reassign) ? sp.reassign[0] : sp.reassign) === '1';
  const task = await getTaskById(taskId);
  if (!task) notFound();
  const candidates = await getVolunteerCandidatesForTask(taskId);
  return <AssignTaskClient slug={adminSlug} task={task} candidates={candidates} reassign={reassign} />;
}
