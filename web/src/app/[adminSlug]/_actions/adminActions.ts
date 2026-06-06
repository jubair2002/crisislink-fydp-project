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
  getCampaigns,
  getCampaignDetailPayload,
  createCampaign,
  updateCampaignStatus,
  updateCampaign,
  addCampaignUpdate,
  upsertCampaignResource,
  getDonations,
  addDonationTrackingEntry,
  getCampaignFundSummary,
  bulkAllocateCampaignFunds,
} from '@/lib/adminService';
import type { DisasterFilters, TaskFilters, UserListFilters, CampaignFilters, DonationFilters } from '@/types/admin';

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

export async function getCampaignsAction(filters: CampaignFilters) {
  await requireAdmin();
  return getCampaigns(filters);
}

export async function getCampaignDetailAction(campaignId: string) {
  await requireAdmin();
  const data = await getCampaignDetailPayload(campaignId);
  if (!data) throw new Error('Campaign not found');
  return data;
}

export async function createCampaignAction(input: {
  title: string;
  description?: string;
  location?: string;
  disaster_id?: string | null;
  target_amount: number;
  start_date?: string | null;
  end_date?: string | null;
  media_url?: string | null;
}) {
  const adminId = await requireAdmin();
  const id = await createCampaign(adminId, input);
  revalidatePath(`${adminPrefix()}/campaigns`);
  return id;
}

export async function updateCampaignStatusAction(campaignId: string, status: string) {
  const adminId = await requireAdmin();
  await updateCampaignStatus(adminId, campaignId, status);
  revalidatePath(`${adminPrefix()}/campaigns`);
  revalidatePath(`${adminPrefix()}/campaigns/${campaignId}`);
}

export async function updateCampaignAction(
  campaignId: string,
  patch: {
    title?: string;
    description?: string;
    location?: string;
    target_amount?: number;
    end_date?: string;
    media_url?: string;
  },
) {
  const adminId = await requireAdmin();
  await updateCampaign(adminId, campaignId, patch);
  revalidatePath(`${adminPrefix()}/campaigns`);
  revalidatePath(`${adminPrefix()}/campaigns/${campaignId}`);
}

export async function addCampaignUpdateAction(
  campaignId: string,
  input: { title: string; description?: string; media_url?: string | null },
) {
  const adminId = await requireAdmin();
  await addCampaignUpdate(adminId, campaignId, input);
  revalidatePath(`${adminPrefix()}/campaigns/${campaignId}`);
}

export async function upsertCampaignResourceAction(
  campaignId: string,
  input: {
    id?: string;
    resource_type: string;
    quantity_pledged?: number;
    quantity_purchased?: number;
    purchase_amount?: number;
    quantity_distributed?: number;
  },
) {
  const adminId = await requireAdmin();
  await upsertCampaignResource(adminId, campaignId, input);
  revalidatePath(`${adminPrefix()}/campaigns/${campaignId}`);
}

export async function getDonationsAction(filters: DonationFilters) {
  await requireAdmin();
  return getDonations(filters);
}

export async function addDonationTrackingAction(
  donationId: string,
  input: { status: string; description?: string; proof_url?: string | null; amount?: number | null },
) {
  const adminId = await requireAdmin();
  await addDonationTrackingEntry(adminId, donationId, input);
  revalidatePath(`${adminPrefix()}/donations`);
}

export async function getCampaignFundSummaryAction(campaignId: string) {
  await requireAdmin();
  return getCampaignFundSummary(campaignId);
}

export async function bulkAllocateCampaignFundsAction(
  campaignId: string,
  input: {
    amount: number;
    status?: string;
    description?: string;
    proof_url?: string | null;
  },
) {
  const adminId = await requireAdmin();
  const result = await bulkAllocateCampaignFunds(adminId, campaignId, input);
  revalidatePath(`${adminPrefix()}/donations`);
  return result;
}
