import { HandCoins } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'Donation Tracking · CrisisLink Admin' };

export default function DonationsPage() {
  return (
    <PlaceholderPage
      title="Donation Tracking"
      description="Audit every donation, payment status, and reconcile against campaign goals."
      icon={HandCoins}
    />
  );
}
