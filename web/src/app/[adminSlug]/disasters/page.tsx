import { Siren } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'Disaster Monitoring · CrisisLink Admin' };

export default function DisastersPage() {
  return (
    <PlaceholderPage
      title="Disaster Monitoring"
      description="Track active disasters, severity, and assigned response teams in real time."
      icon={Siren}
    />
  );
}
