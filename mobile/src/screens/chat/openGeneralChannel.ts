import { router } from 'expo-router';

import { useAuthStore } from '../../store/authStore';
import { getChannelBySlug, joinChannel } from '../../services/chatService';

/** Open #general — used from home service grid shortcuts. */
export async function openGeneralChannel(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  try {
    const channel = await getChannelBySlug('general');
    if (!channel) {
      router.push('/(main)/chat');
      return;
    }
    if (userId) {
      try {
        await joinChannel(channel.id, userId);
      } catch {
        /* already a member */
      }
    }
    router.push(`/(main)/chat/${channel.id}`);
  } catch {
    router.push('/(main)/chat');
  }
}
