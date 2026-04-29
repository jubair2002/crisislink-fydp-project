import { getAssignmentsForTasks, getDisasters, getTasks } from '@/lib/adminService';
import type { DisasterRow, TaskFilters, TaskRow } from '@/types/admin';
import TasksClient from './TasksClient';

function pick(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = { title: 'Task Management · CrisisLink Admin' };

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const filters: TaskFilters = {
    status: pick(sp, 'status'),
    assignmentMode: pick(sp, 'mode'),
    priority: pick(sp, 'priority'),
  };
  const tasks = await getTasks(filters);
  const assignments = await getAssignmentsForTasks(tasks.map((t) => t.id));
  const disasters = await getDisasters({});
  const disasterMap = new Map<string, DisasterRow>(disasters.map((d) => [d.id, d]));
  const taskRows: Array<TaskRow & { disasterLabel: string; assignedCount: number }> = tasks.map((task) => ({
    ...task,
    disasterLabel: task.disaster_id ? (disasterMap.get(task.disaster_id)?.location_label ?? task.disaster_id.slice(0, 8)) : '—',
    assignedCount: assignments.filter((a) => a.task_id === task.id).length,
  }));

  return <TasksClient slug={adminSlug} rows={taskRows} filters={filters} />;
}
