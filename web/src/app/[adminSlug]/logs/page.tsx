import { ScrollText } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'System Logs · CrisisLink Admin' };

export default function LogsPage() {
  return (
    <PlaceholderPage
      title="System Logs"
      description="Audit privileged admin actions and review platform-level events."
      icon={ScrollText}
    />
  );
}
