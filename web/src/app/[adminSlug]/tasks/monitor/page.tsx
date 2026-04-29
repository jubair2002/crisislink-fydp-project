import { getAssignmentsForTasks, getDisasters, getTasks, getVolunteerCandidatesForTask } from '@/lib/adminService';
import TaskMonitorClient from './TaskMonitorClient';

export const metadata = { title: 'Task Monitor · CrisisLink Admin' };

export default async function TaskMonitorPage({
  params,
}: {
  params: Promise<{ adminSlug: string }>;
}) {
  const { adminSlug } = await params;
  const tasks = await getTasks({});
  const assignments = await getAssignmentsForTasks(tasks.map((t) => t.id));
  const disasters = await getDisasters({});
  const disasterMap = new Map(disasters.map((d) => [d.id, d]));
  const points = await Promise.all(
    tasks.slice(0, 100).map(async (t) => {
      const disaster = t.disaster_id ? disasterMap.get(t.disaster_id) : null;
      const candidates = await getVolunteerCandidatesForTask(t.id);
      const assigned = assignments.find((a) => a.task_id === t.id);
      const vol = candidates.find((c) => c.userId === assigned?.volunteer_id) ?? candidates[0];
      return {
        taskId: t.id,
        taskLabel: t.help_type ?? 'Task',
        status: t.status ?? 'requested',
        taskLat: disaster?.latitude ?? 23.8103,
        taskLng: disaster?.longitude ?? 90.4125,
        volunteerName: vol?.name ?? 'Unassigned',
        volunteerLat: vol?.latitude ?? null,
        volunteerLng: vol?.longitude ?? null,
      };
    }),
  );
  return <TaskMonitorClient slug={adminSlug} points={points} />;
}
