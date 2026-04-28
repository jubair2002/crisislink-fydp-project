import { PackageSearch } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'Resource Management · CrisisLink Admin' };

export default function ResourcesPage() {
  return (
    <PlaceholderPage
      title="Resource Management"
      description="Track inventory, dispatch supplies, and coordinate with field volunteers."
      icon={PackageSearch}
    />
  );
}
