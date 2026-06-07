import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabaseClient';

type ExpoNotifications = typeof import('expo-notifications');

let notificationsMod: ExpoNotifications | null | undefined;
let handlerConfigured = false;

function isExpoGoAndroid(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo' && Platform.OS === 'android';
  } catch {
    return false;
  }
}

/** Lazy-load expo-notifications — avoids Expo Go Android SDK 53+ crash on static import. */
async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'web') return null;
  if (isExpoGoAndroid()) return null;
  if (notificationsMod !== undefined) return notificationsMod;

  try {
    const mod = await import('expo-notifications');
    notificationsMod = mod;
    if (!handlerConfigured) {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerConfigured = true;
    }
    return mod;
  } catch {
    notificationsMod = null;
    return null;
  }
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    let projectId: string | undefined;
    try {
      const Constants = require('expo-constants').default;
      projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    } catch {
      projectId = undefined;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;

    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
    if (error) console.warn('device_tokens upsert:', error.message);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync('broadcasts', {
        name: 'Admin broadcasts',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    return token;
  } catch {
    return null;
  }
}

export async function showChatNotification(
  chatId: string,
  senderName: string,
  preview: string,
): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: senderName,
        body: preview,
        data: { chatId, type: 'chat' },
        sound: true,
      },
      trigger: null,
    });
  } catch {
    /* Expo Go limitations */
  }
}

export async function showBroadcastNotification(title: string, message: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📢 ${title}`,
        body: message,
        data: { type: 'broadcast' },
        sound: true,
      },
      trigger: null,
    });
  } catch {
    /* Expo Go limitations */
  }
}

export function setupNotificationNavigation(): () => void {
  let cleanup = () => {};

  void (async () => {
    const Notifications = await loadNotifications();
    if (!Notifications) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'broadcast') {
        router.push('/(main)/notifications');
        return;
      }
      const chatId = data?.chatId;
      if (typeof chatId === 'string' && chatId.length > 0) {
        router.push(`/(main)/chat/${chatId}`);
      }
    });
    cleanup = () => sub.remove();
  })();

  return () => cleanup();
}
