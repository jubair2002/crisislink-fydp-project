import { Megaphone } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'Campaign Management · CrisisLink Admin' };

export default function CampaignsPage() {
  return (
    <PlaceholderPage
      title="Campaign Management"
      description="Create, monitor, and close fundraising campaigns tied to active disasters."
      icon={Megaphone}
    />
  );
}
