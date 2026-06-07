import { getAdminBroadcasts, getCampaigns, getChatRoomsForMonitoring } from '@/lib/adminService';
import ChatsClient from './ChatsClient';

export const metadata = { title: 'Chat Monitoring · CrisisLink Admin' };

export default async function ChatsPage() {
  const [broadcasts, chats, campaigns] = await Promise.all([
    getAdminBroadcasts(),
    getChatRoomsForMonitoring(),
    getCampaigns({ status: 'active' }),
  ]);

  return <ChatsClient broadcasts={broadcasts} chats={chats} campaigns={campaigns} />;
}
