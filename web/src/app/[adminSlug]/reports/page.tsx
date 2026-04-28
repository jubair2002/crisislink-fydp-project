import { FileText } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'Reports · CrisisLink Admin' };

export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Triage, verify, and assign citizen-submitted disaster reports."
      icon={FileText}
    />
  );
}
