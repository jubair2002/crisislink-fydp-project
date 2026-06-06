import { supabase } from './supabaseClient';
import type {
  Donation,
  DonationTrackingPayload,
  DonorInfo,
  InitPaymentResult,
  PaymentStatus,
} from '../types/campaign';

const friendlyError = (message: string): string => {
  if (message.includes('row-level security')) return 'You do not have permission.';
  if (message.toLowerCase().includes('network')) return 'Network error. Try again.';
  return message;
};

export async function initPayment(
  campaignId: string,
  amount: number,
  donorInfo: DonorInfo,
): Promise<InitPaymentResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const { data, error } = await supabase.functions.invoke('sslcommerz-init', {
    body: {
      campaign_id: campaignId,
      amount,
      donor_info: {
        name: donorInfo.name,
        anonymous: donorInfo.anonymous,
        user_id: donorInfo.userId ?? null,
      },
    },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) {
    let detail = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) detail = body.error;
      } catch {
        /* use default message */
      }
    }
    throw new Error(friendlyError(detail));
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload?.payment_url || !payload?.donation_id) {
    throw new Error(String(payload?.error ?? 'Failed to start payment.'));
  }

  return {
    payment_url: String(payload.payment_url),
    donation_id: String(payload.donation_id),
    transaction_id: String(payload.transaction_id ?? ''),
  };
}

export async function trackDonation(donationCode: string): Promise<DonationTrackingPayload | null> {
  const { data, error } = await supabase.rpc('get_donation_tracking_by_code', {
    p_code: donationCode.trim().toUpperCase(),
  });

  if (error) throw new Error(friendlyError(error.message));
  if (!data || typeof data !== 'object') return null;
  const payload = data as DonationTrackingPayload;
  if (!payload.donation?.id) return null;
  return payload;
}

export async function getDonationById(donationId: string): Promise<Donation | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    const { data, error } = await supabase
      .from('donations')
      .select('*, campaigns(title)')
      .eq('id', donationId)
      .maybeSingle();

    if (error) throw new Error(friendlyError(error.message));
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      donation_code: (row.donation_code as string) ?? null,
      campaign_id: (row.campaign_id as string) ?? null,
      user_id: (row.user_id as string) ?? null,
      donor_name: (row.donor_name as string) ?? null,
      anonymous: Boolean(row.anonymous),
      amount: Number(row.amount ?? 0),
      payment_method: (row.payment_method as string) ?? null,
      transaction_id: (row.transaction_id as string) ?? null,
      payment_status: (row.payment_status as PaymentStatus) ?? null,
      created_at: (row.created_at as string) ?? null,
      campaigns: row.campaigns as { title?: string | null } | null,
    };
  }

  const { data, error } = await supabase.rpc('get_donation_status_public', {
    p_donation_id: donationId,
  });
  if (error) throw new Error(friendlyError(error.message));
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    donation_code: (row.donation_code as string) ?? null,
    campaign_id: (row.campaign_id as string) ?? null,
    amount: Number(row.amount ?? 0),
    payment_status: (row.payment_status as PaymentStatus) ?? null,
  };
}

export async function pollDonationStatus(
  donationId: string,
  maxAttempts = 15,
  intervalMs = 2000,
): Promise<Donation | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const donation = await getDonationById(donationId);
    if (donation?.payment_status === 'paid' || donation?.payment_status === 'failed') {
      return donation;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return getDonationById(donationId);
}

export async function getDonationHistory(userId: string): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*, campaigns(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    donation_code: (row.donation_code as string) ?? null,
    campaign_id: (row.campaign_id as string) ?? null,
    user_id: (row.user_id as string) ?? null,
    donor_name: row.anonymous ? 'Anonymous Donor' : ((row.donor_name as string) ?? null),
    anonymous: Boolean(row.anonymous),
    amount: Number(row.amount ?? 0),
    payment_status: (row.payment_status as PaymentStatus) ?? null,
    created_at: (row.created_at as string) ?? null,
    campaigns: row.campaigns as { title?: string | null } | null,
  }));
}

export async function getCampaignDonations(campaignId: string): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('id, donation_code, donor_name, anonymous, amount, payment_status, created_at')
    .eq('campaign_id', campaignId)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    donation_code: (row.donation_code as string) ?? null,
    donor_name: row.anonymous ? 'Anonymous Donor' : ((row.donor_name as string) ?? 'Donor'),
    anonymous: Boolean(row.anonymous),
    amount: Number(row.amount ?? 0),
    payment_status: (row.payment_status as PaymentStatus) ?? 'paid',
    created_at: (row.created_at as string) ?? null,
  }));
}
