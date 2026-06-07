import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { supabase } from './supabaseClient';
import { showBroadcastNotification, showReportUpdateNotification } from './pushNotificationService';
import { useToastStore } from '../store/toastStore';

export interface UserNotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  broadcast_id?: string | null;
}

type NotificationListener = (notification: UserNotificationRow) => void;

const listenersByUser = new Map<string, Set<NotificationListener>>();
let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;

function mapNotificationRow(row: Record<string, unknown>): UserNotificationRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: String(row.type ?? 'info'),
    title: String(row.title ?? 'Notification'),
    message: String(row.message ?? ''),
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at ?? new Date().toISOString()),
    broadcast_id: row.broadcast_id != null ? String(row.broadcast_id) : null,
  };
}

function dispatchNotification(userId: string, notification: UserNotificationRow) {
  listenersByUser.get(userId)?.forEach((listener) => {
    try {
      listener(notification);
    } catch {
      /* listener error */
    }
  });

  void import('../store/notificationStore').then(({ useNotificationStore }) => {
    useNotificationStore.getState().prependItem(notification);
  });
}

function teardownChannel() {
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
  activeUserId = null;
}

function ensureChannel(userId: string) {
  if (activeChannel && activeUserId === userId) return;

  teardownChannel();
  activeUserId = userId;

  activeChannel = supabase
    .channel(`user-notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        dispatchNotification(userId, mapNotificationRow(payload.new as Record<string, unknown>));
      },
    )
    .subscribe();
}

export async function fetchUserNotifications(userId: string, limit = 50): Promise<UserNotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, is_read, created_at, broadcast_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNotificationRow(row as Record<string, unknown>));
}

/** Share one Realtime channel per user — safe for multiple screens/effects. */
export function subscribeToUserNotifications(
  userId: string,
  onInsert: NotificationListener,
): () => void {
  if (!listenersByUser.has(userId)) {
    listenersByUser.set(userId, new Set());
  }
  listenersByUser.get(userId)!.add(onInsert);
  ensureChannel(userId);

  return () => {
    const set = listenersByUser.get(userId);
    if (!set) return;
    set.delete(onInsert);
    if (set.size === 0) {
      listenersByUser.delete(userId);
      if (activeUserId === userId) teardownChannel();
    }
  };
}

/** Global listener: local notification + toast when admin broadcast arrives. */
export function startNotificationListener(userId: string): () => void {
  const unsubRealtime = subscribeToUserNotifications(userId, (n) => {
    if (n.type === 'broadcast') {
      void showBroadcastNotification(n.title, n.message);
      useToastStore.getState().show(`Broadcast: ${n.title}`);
    } else if (n.type === 'report_updated') {
      void showReportUpdateNotification(n.title, n.message);
      useToastStore.getState().show('Your report has been updated');
    } else if (n.type === 'campaign_report') {
      useToastStore.getState().show('New campaign issue reported');
    }
  });

  // Sync on app foreground (backup if realtime misses an event)
  const appSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void syncUserNotifications(userId);
    }
  });

  // Initial sync
  void syncUserNotifications(userId);

  return () => {
    unsubRealtime();
    appSub.remove();
  };
}

/** Fetch notifications and merge into store (safe to call often). */
export async function syncUserNotifications(userId: string): Promise<void> {
  const { useNotificationStore } = await import('../store/notificationStore');
  try {
    const rows = await fetchUserNotifications(userId);
    useNotificationStore.getState().setItems(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not load notifications.';
    useNotificationStore.getState().setError(msg);
  }
}
