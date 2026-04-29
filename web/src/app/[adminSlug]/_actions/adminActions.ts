'use server';

import { revalidatePath } from 'next/cache';
import { getAdminProfile, getCurrentUser } from '@/lib/auth';
import { getAdminSlug } from '@/lib/adminSlug';
import {
  addDisasterOfficialUpdate,
  approveTaskCompletion,
  approveVolunteer,
  assignVolunteersToTask,
  blockUser,
  deleteDisasterAndAssets,
  getDisasterDetailPayload,
  getDisasters,
  getTaskById,
  getTasks,
  getVolunteerCandidatesForTask,
  getUsersForExport,
  getVolunteerDetail,
  rejectVolunteer,
  sendPasswordResetForUser,
  suspendVolunteer,
  unblockUser,
  updateDisasterSeverityByAdmin,
  updateDisasterStatus,
  upgradeToVolunteer,
} from '@/lib/adminService';
import type { DisasterFilters, TaskFilters, UserListFilters } from '@/types/admin';

async function requireAdmin() {
  const user = await getCurrentUser();
  const profile = await getAdminProfile();
  if (!user || !profile) throw new Error('Unauthorized');
  return user.id;
}

function adminPrefix() {
  return `/${getAdminSlug()}`;
}

export async function blockUserAction(userId: string) {
  const adminId = await requireAdmin();
  await blockUser(adminId, userId);
  revalidatePath(`${adminPrefix()}/users`);
}

export async function unblockUserAction(userId: string) {
  const adminId = await requireAdmin();
  await unblockUser(adminId, userId);
  revalidatePath(`${adminPrefix()}/users`);
}

export async function upgradeToVolunteerAction(userId: string) {
  const adminId = await requireAdmin();
  await upgradeToVolunteer(adminId, userId);
  revalidatePath(`${adminPrefix()}/users`);
  revalidatePath(`${adminPrefix()}/volunteers`);
}

export async function resetAccountAction(userId: string) {
  const adminId = await requireAdmin();
  await sendPasswordResetForUser(adminId, userId);
}

export async function exportUsersCsvAction(filters: UserListFilters) {
  await requireAdmin();
  const rows = await getUsersForExport(filters);
  const headers = ['Name', 'Email', 'Role', 'City', 'Joined', 'Status', 'Phone'];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.name),
        csvEscape(r.email),
        csvEscape(r.role),
        csvEscape(r.city ?? ''),
        csvEscape(r.created_at),
        csvEscape(r.account_status ?? 'active'),
        csvEscape(r.phone ?? ''),
      ].join(','),
    ),
  ];
  return lines.join('\n');
}

function csvEscape(v: string) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function approveVolunteerAction(volunteerId: string) {
  const adminId = await requireAdmin();
  await approveVolunteer(adminId, volunteerId);
  revalidatePath(`${adminPrefix()}/volunteers`);
  revalidatePath(`${adminPrefix()}/volunteers/${volunteerId}`);
}

export async function rejectVolunteerAction(volunteerId: string, reason: string) {
  const adminId = await requireAdmin();
  const r = reason.trim();
  if (!r) throw new Error('Reason is required.');
  await rejectVolunteer(adminId, volunteerId, r);
  revalidatePath(`${adminPrefix()}/volunteers`);
  revalidatePath(`${adminPrefix()}/volunteers/${volunteerId}`);
}

export async function suspendVolunteerAction(volunteerId: string, reason: string) {
  const adminId = await requireAdmin();
  const r = reason.trim();
  if (!r) throw new Error('Reason is required.');
  await suspendVolunteer(adminId, volunteerId, r);
  revalidatePath(`${adminPrefix()}/volunteers`);
  revalidatePath(`${adminPrefix()}/volunteers/${volunteerId}`);
}

export async function getVolunteerTasksAndLogsAction(volunteerId: string) {
  await requireAdmin();
  const d = await getVolunteerDetail(volunteerId);
  if (!d) throw new Error('Volunteer not found');
  return { assignments: d.assignments, auditLog: d.auditLog };
}

export async function getDisastersAction(filters: DisasterFilters) {
  await requireAdmin();
  return getDisasters(filters);
}

export async function getDisasterDetailAction(disasterId: string) {
  await requireAdmin();
  const data = await getDisasterDetailPayload(disasterId);
  if (!data) throw new Error('Disaster not found');
  return data;
}

export async function verifyDisasterAction(disasterId: string) {
  const adminId = await requireAdmin();
  await updateDisasterStatus(adminId, disasterId, 'verified');
  revalidatePath(`${adminPrefix()}/disasters`);
  revalidatePath(`${adminPrefix()}/disasters/${disasterId}`);
}

export async function markDisasterFalseReportAction(disasterId: string) {
  const adminId = await requireAdmin();
  await updateDisasterStatus(adminId, disasterId, 'false_report');
  revalidatePath(`${adminPrefix()}/disasters`);
  revalidatePath(`${adminPrefix()}/disasters/${disasterId}`);
}

export async function markDisasterResolvedAction(disasterId: string) {
  const adminId = await requireAdmin();
  await updateDisasterStatus(adminId, disasterId, 'resolved');
  revalidatePath(`${adminPrefix()}/disasters`);
  revalidatePath(`${adminPrefix()}/disasters/${disasterId}`);
}

export async function updateDisasterSeverityAction(disasterId: string, severity: string) {
  const adminId = await requireAdmin();
  await updateDisasterSeverityByAdmin(adminId, disasterId, severity);
  revalidatePath(`${adminPrefix()}/disasters`);
  revalidatePath(`${adminPrefix()}/disasters/${disasterId}`);
}

export async function addOfficialDisasterUpdateAction(disasterId: string, text: string) {
  const adminId = await requireAdmin();
  await addDisasterOfficialUpdate(adminId, disasterId, text);
  revalidatePath(`${adminPrefix()}/disasters`);
  revalidatePath(`${adminPrefix()}/disasters/${disasterId}`);
}

export async function deleteDisasterAction(disasterId: string) {
  const adminId = await requireAdmin();
  await deleteDisasterAndAssets(adminId, disasterId);
  revalidatePath(`${adminPrefix()}/disasters`);
}

export async function getTasksAction(filters: TaskFilters) {
  await requireAdmin();
  return getTasks(filters);
}

export async function getTaskDetailAction(taskId: string) {
  await requireAdmin();
  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  return task;
}

export async function getVolunteerCandidatesAction(taskId: string) {
  await requireAdmin();
  return getVolunteerCandidatesForTask(taskId);
}

export async function assignVolunteersToTaskAction(
  taskId: string,
  volunteerUserIds: string[],
  options?: { reassign?: boolean; overrideAuto?: boolean },
) {
  const adminId = await requireAdmin();
  await assignVolunteersToTask(adminId, taskId, volunteerUserIds, options);
  revalidatePath(`${adminPrefix()}/tasks`);
  revalidatePath(`${adminPrefix()}/tasks/assign/${taskId}`);
  revalidatePath(`${adminPrefix()}/tasks/monitor`);
}

export async function approveTaskCompletionAction(taskId: string) {
  const adminId = await requireAdmin();
  await approveTaskCompletion(adminId, taskId);
  revalidatePath(`${adminPrefix()}/tasks`);
  revalidatePath(`${adminPrefix()}/tasks/monitor`);
}
