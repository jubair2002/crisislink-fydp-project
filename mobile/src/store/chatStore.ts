import { create } from 'zustand';

interface ChatState {
  activeChatId: string | null;
  totalUnread: number;
  unreadByChat: Record<string, number>;
  setActiveChatId: (chatId: string | null) => void;
  setUnreadForChat: (chatId: string, count: number) => void;
  setChatsUnread: (map: Record<string, number>) => void;
  incrementUnread: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatId: null,
  totalUnread: 0,
  unreadByChat: {},

  setActiveChatId: (chatId) => set({ activeChatId: chatId }),

  setUnreadForChat: (chatId, count) => {
    const unreadByChat = { ...get().unreadByChat, [chatId]: count };
    const totalUnread = Object.values(unreadByChat).reduce((a, b) => a + b, 0);
    set({ unreadByChat, totalUnread });
  },

  setChatsUnread: (map) => {
    const totalUnread = Object.values(map).reduce((a, b) => a + b, 0);
    set({ unreadByChat: map, totalUnread });
  },

  incrementUnread: (chatId) => {
    const prev = get().unreadByChat[chatId] ?? 0;
    get().setUnreadForChat(chatId, prev + 1);
  },
}));
