export type CampaignStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  disaster_id?: string | null;
  target_amount: number;
  collected_amount: number;
  goal_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: CampaignStatus | string;
  media_url?: string | null;
  created_at?: string | null;
}

export interface CampaignUpdate {
  id: string;
  campaign_id: string;
  title: string;
  description?: string | null;
  media_url?: string | null;
  created_at: string;
}

export interface CampaignResource {
  id: string;
  campaign_id: string;
  resource_type: string;
  quantity_pledged: number;
  quantity_purchased: number;
  purchase_amount: number;
  quantity_distributed: number;
  updated_at?: string | null;
}

export interface CampaignVolunteer {
  id: string;
  campaign_id: string;
  volunteer_user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: { name?: string | null } | null;
}

export interface DonorInfo {
  name: string;
  anonymous: boolean;
  userId?: string | null;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Donation {
  id: string;
  donation_code?: string | null;
  campaign_id?: string | null;
  user_id?: string | null;
  donor_name?: string | null;
  anonymous?: boolean | null;
  amount: number;
  payment_method?: string | null;
  transaction_id?: string | null;
  payment_status?: PaymentStatus | null;
  created_at?: string | null;
  campaigns?: { title?: string | null } | null;
}

export interface DonationTrackingEntry {
  id: string;
  status: string;
  description?: string | null;
  proof_url?: string | null;
  updated_at?: string | null;
}

export interface DonationTrackingPayload {
  donation: {
    id: string;
    donation_code?: string | null;
    amount: number;
    donor_name?: string | null;
    payment_status?: string | null;
    created_at?: string | null;
    campaign_id?: string | null;
  };
  campaign?: {
    id: string;
    title?: string | null;
    location?: string | null;
  } | null;
  tracking: DonationTrackingEntry[];
  resources: Array<{
    resource_type: string;
    quantity_purchased: number;
    quantity_distributed: number;
    purchase_amount: number;
  }>;
}

export interface InitPaymentResult {
  payment_url: string;
  donation_id: string;
  transaction_id: string;
}
