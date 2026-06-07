import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingMessage } from '../types/chat';

const KEY = '@crisislink/pending_chat_messages';

export async function getPendingMessages(): Promise<PendingMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addPendingMessage(msg: PendingMessage): Promise<void> {
  const list = await getPendingMessages();
  list.push(msg);
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function removePendingMessage(clientId: string): Promise<void> {
  const list = await getPendingMessages();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(list.filter((m) => m.clientId !== clientId)),
  );
}

export async function clearPendingForChat(chatId: string): Promise<void> {
  const list = await getPendingMessages();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((m) => m.chatId !== chatId)));
}
