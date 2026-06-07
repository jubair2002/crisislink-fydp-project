import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@crisislink/chat_active';

export async function getChatActivePreference(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === null) return true;
    return v === 'true';
  } catch {
    return true;
  }
}

export async function setChatActivePreference(active: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, active ? 'true' : 'false');
}
