import { getDonations, getCampaigns } from '@/lib/adminService';
import type { CampaignRow, DonationFilters } from '@/types/admin';
import DonationsClient from './DonationsClient';

export const metadata = { title: 'Donation Tracking · CrisisLink Admin' };

function pick(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function DonationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { adminSlug } = await params;
  const sp = await searchParams;
  const filters: DonationFilters = {
    status: pick(sp, 'status'),
    campaignId: pick(sp, 'campaign'),
    dateFrom: pick(sp, 'from'),
    dateTo: pick(sp, 'to'),
  };
  const [rows, campaigns] = await Promise.all([getDonations(filters), getCampaigns()]);
  return (
    <DonationsClient
      slug={adminSlug}
      rows={rows}
      campaigns={campaigns as CampaignRow[]}
      filters={filters}
    />
  );
}
