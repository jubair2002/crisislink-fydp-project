import { supabase } from './supabaseClient';
import type {
  Campaign,
  CampaignResource,
  CampaignUpdate,
  CampaignVolunteer,
} from '../types/campaign';

const friendlyError = (message: string): string => {
  if (message.includes('row-level security')) return 'You do not have permission.';
  if (message.toLowerCase().includes('network')) return 'Network error. Try again.';
  return message;
};

function mapCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    title: String(row.title ?? 'Campaign'),
    description: (row.description as string) ?? null,
    location: (row.location as string) ?? null,
    disaster_id: (row.disaster_id as string) ?? null,
    target_amount: Number(row.target_amount ?? row.goal_amount ?? 0),
    collected_amount: Number(row.collected_amount ?? 0),
    goal_amount: row.goal_amount != null ? Number(row.goal_amount) : null,
    start_date: (row.start_date as string) ?? null,
    end_date: (row.end_date as string) ?? null,
    status: String(row.status ?? 'active'),
    media_url: (row.media_url as string) ?? null,
    created_at: (row.start_date as string) ?? null,
  };
}

export function daysRemaining(endDate?: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function fundingProgress(campaign: Pick<Campaign, 'collected_amount' | 'target_amount'>): number {
  const target = Math.max(1, campaign.target_amount || 1);
  return Math.min(100, Math.round(((campaign.collected_amount || 0) / target) * 100));
}

export async function fetchActiveCampaigns(limit = 50): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map(mapCampaign);
}

export async function fetchCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyError(error.message));
  if (!data) return null;
  return mapCampaign(data as Record<string, unknown>);
}

export async function fetchCampaignUpdates(campaignId: string): Promise<CampaignUpdate[]> {
  const { data, error } = await supabase
    .from('campaign_updates')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    title: String(row.title ?? 'Update'),
    description: (row.description as string) ?? null,
    media_url: (row.media_url as string) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }));
}

export async function fetchCampaignResources(campaignId: string): Promise<CampaignResource[]> {
  const { data, error } = await supabase
    .from('campaign_resources')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    resource_type: String(row.resource_type ?? 'Resource'),
    quantity_pledged: Number(row.quantity_pledged ?? 0),
    quantity_purchased: Number(row.quantity_purchased ?? 0),
    purchase_amount: Number(row.purchase_amount ?? 0),
    quantity_distributed: Number(row.quantity_distributed ?? 0),
    updated_at: (row.updated_at as string) ?? null,
  }));
}

export async function fetchCampaignVolunteers(campaignId: string): Promise<CampaignVolunteer[]> {
  const { data, error } = await supabase
    .from('campaign_volunteers')
    .select('*, profile:profiles!campaign_volunteers_volunteer_user_id_fkey(name)')
    .eq('campaign_id', campaignId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false });

  if (error) {
    const { data: fallback, error: fbErr } = await supabase
      .from('campaign_volunteers')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'active');

    if (fbErr) throw new Error(friendlyError(fbErr.message));
    return ((fallback ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      campaign_id: String(row.campaign_id),
      volunteer_user_id: String(row.volunteer_user_id),
      role: String(row.role ?? 'general'),
      status: String(row.status ?? 'active'),
      joined_at: String(row.joined_at ?? new Date().toISOString()),
    }));
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    volunteer_user_id: String(row.volunteer_user_id),
    role: String(row.role ?? 'general'),
    status: String(row.status ?? 'active'),
    joined_at: String(row.joined_at ?? new Date().toISOString()),
    profile: row.profile as { name?: string | null } | null,
  }));
}

export async function joinCampaignAsVolunteer(
  campaignId: string,
  volunteerUserId: string,
): Promise<void> {
  const { error } = await supabase.from('campaign_volunteers').upsert(
    {
      campaign_id: campaignId,
      volunteer_user_id: volunteerUserId,
      role: 'general',
      status: 'active',
    },
    { onConflict: 'campaign_id,volunteer_user_id' },
  );
  if (error) throw new Error(friendlyError(error.message));
}

export async function fetchCampaignsNeedingVolunteers(limit = 10): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('campaign_id, campaigns(id, title, location, status, target_amount, collected_amount, end_date, description, media_url, start_date, disaster_id, goal_amount)')
    .eq('status', 'requested')
    .not('campaign_id', 'is', null)
    .limit(limit * 3);

  if (error) {
    return fetchActiveCampaigns(limit);
  }

  const seen = new Set<string>();
  const out: Campaign[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const camp = r.campaigns as Record<string, unknown> | null;
    if (!camp?.id) continue;
    const id = String(camp.id);
    if (seen.has(id)) continue;
    seen.add(id);
    if (camp.status !== 'active') continue;
    out.push(mapCampaign(camp));
    if (out.length >= limit) break;
  }

  if (out.length) return out;
  return fetchActiveCampaigns(limit);
}
