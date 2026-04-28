import { MessageSquare } from 'lucide-react';
import PlaceholderPage from '../_components/PlaceholderPage';

export const metadata = { title: 'Chat Monitoring · CrisisLink Admin' };

export default function ChatsPage() {
  return (
    <PlaceholderPage
      title="Chat Monitoring"
      description="Monitor field-team conversations and intervene when escalation is needed."
      icon={MessageSquare}
    />
  );
}
