import { create } from 'zustand';
import type { UserNotificationRow } from '../services/notificationService';

interface NotificationState {
  items: UserNotificationRow[];
  unreadCount: number;
  unreadBroadcastCount: number;
  latestUnreadBroadcast: UserNotificationRow | null;
  lastError: string | null;
  setItems: (items: UserNotificationRow[]) => void;
  prependItem: (item: UserNotificationRow) => void;
  setError: (error: string | null) => void;
  markRead: (id: string) => void;
  removeByBroadcastId: (broadcastId: string) => void;
  patchByBroadcastId: (broadcastId: string, title: string, message: string) => void;
}

function derive(items: UserNotificationRow[]) {
  const unreadCount = items.filter((n) => !n.is_read).length;
  const unreadBroadcasts = items.filter((n) => n.type === 'broadcast' && !n.is_read);
  return {
    items,
    unreadCount,
    unreadBroadcastCount: unreadBroadcasts.length,
    latestUnreadBroadcast: unreadBroadcasts[0] ?? null,
  };
}

function sameItems(a: UserNotificationRow[], b: UserNotificationRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.is_read !== y.is_read ||
      x.title !== y.title ||
      x.message !== y.message ||
      x.type !== y.type
    ) {
      return false;
    }
  }
  return true;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  unreadBroadcastCount: 0,
  latestUnreadBroadcast: null,
  lastError: null,

  setItems: (items) => {
    if (sameItems(items, get().items)) return;
    set({ ...derive(items), lastError: null });
  },

  prependItem: (item) => {
    const prev = get().items;
    if (prev.some((n) => n.id === item.id)) return;
    set(derive([item, ...prev]));
  },

  setError: (lastError) => set({ lastError }),

  markRead: (id) => {
    const items = get().items.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    set(derive(items));
  },

  removeByBroadcastId: (broadcastId) => {
    const items = get().items.filter((n) => n.broadcast_id !== broadcastId);
    set(derive(items));
  },

  patchByBroadcastId: (broadcastId, title, message) => {
    const items = get().items.map((n) =>
      n.broadcast_id === broadcastId ? { ...n, title, message } : n,
    );
    set(derive(items));
  },
}));

/** Stable selector — avoids inline selectors that re-subscribe every render. */
export const selectLatestUnreadBroadcast = (s: NotificationState) => s.latestUnreadBroadcast;
export const selectUnreadBroadcastCount = (s: NotificationState) => s.unreadBroadcastCount;
