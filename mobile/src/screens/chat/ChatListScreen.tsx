import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useSegments } from 'expo-router';
import { AppState } from 'react-native';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getVolunteerProfile } from '../../services/profileService';
import { setAvailabilityStatus } from '../../services/taskService';
import {
  getChatActivePreference,
  setChatActivePreference,
} from '../../services/chatActiveStorage';
import {
  flushPendingMessages,
  getChatsForUser,
  joinChannel,
  subscribeToUserChatUpdates,
} from '../../services/chatService';
import { showChatNotification } from '../../services/pushNotificationService';
import {
  selectUnreadBroadcastCount,
  selectLatestUnreadBroadcast,
  useNotificationStore,
} from '../../store/notificationStore';
import {
  ChatTopBar,
  UnreadBadge,
  ActiveToggle,
  chatTypeIcon,
  chatTypeLabel,
  formatMessageTime,
} from './chatShared';

function channelIcon(slug: string | null | undefined): keyof typeof Ionicons.glyphMap {
  switch (slug) {
    case 'general':
      return 'chatbubbles-outline';
    case 'help':
      return 'help-circle-outline';
    case 'emergency':
      return 'warning-outline';
    case 'announcements':
      return 'megaphone-outline';
    default:
      return 'globe-outline';
  }
}

function channelAccent(slug: string | null | undefined): { bg: string; fg: string } {
  switch (slug) {
    case 'emergency':
      return { bg: '#FEE2E2', fg: Colors.danger };
    case 'help':
      return { bg: '#ECFDF5', fg: Colors.success };
    case 'announcements':
      return { bg: '#FEF3C7', fg: Colors.warning };
    default:
      return { bg: '#EFF6FF', fg: Colors.primary };
  }
}

export default function ChatListScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setChatsUnread = useChatStore((s) => s.setChatsUnread);
  const setUnreadForChat = useChatStore((s) => s.setUnreadForChat);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const unreadBroadcastCount = useNotificationStore(selectUnreadBroadcastCount);
  const latestUnreadBroadcast = useNotificationStore(selectLatestUnreadBroadcast);

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  const role = profile?.role ?? 'citizen';
  const isAdmin = role === 'admin' || role === 'authority';
  const isVolunteer = role === 'volunteer';
  const segments = useSegments() as string[];
  const isTabRoot =
    segments[0] === '(main)' && segments[1] === 'chat' && segments.length <= 2;

  const { channels, conversations } = useMemo(() => {
    const ch: ChatListItem[] = [];
    const conv: ChatListItem[] = [];
    for (const c of chats) {
      if (c.type === 'channel') ch.push(c);
      else conv.push(c);
    }
    ch.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return { channels: ch, conversations: conv };
  }, [chats]);

  const loadActiveStatus = useCallback(async () => {
    if (!user) return;
    if (isVolunteer) {
      const vol = await getVolunteerProfile(user.id);
      setIsActive(vol?.availability_status !== 'offline');
    } else {
      setIsActive(await getChatActivePreference());
    }
  }, [user, isVolunteer]);

  const load = useCallback(async () => {
    if (!user || !profile) return;
    try {
      setError(null);
      const list = await getChatsForUser(user.id, profile.role);
      setChats(list);
      const unreadMap: Record<string, number> = {};
      for (const c of list) unreadMap[c.id] = c.unread_count;
      setChatsUnread(unreadMap);
      await flushPendingMessages(user.id);
      await loadActiveStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load chats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile, setChatsUnread, loadActiveStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushPendingMessages(user.id).then(load);
    });

    const unsubChat = subscribeToUserChatUpdates(user.id, ({ chatId, unreadCount }) => {
      setUnreadForChat(chatId, unreadCount);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, unread_count: unreadCount } : c)),
      );

      if (activeChatId !== chatId && isActive) {
        const chat = chats.find((c) => c.id === chatId);
        showChatNotification(
          chatId,
          chat?.name ?? 'New message',
          chat?.last_message_preview ?? 'You have a new message',
        ).catch(() => {});
      }
    });

    return () => {
      appSub.remove();
      unsubChat();
    };
  }, [user, activeChatId, chats, setUnreadForChat, load, isActive]);

  const handleActiveToggle = async (next: boolean) => {
    if (!user) return;
    setToggleLoading(true);
    try {
      if (isVolunteer) {
        await setAvailabilityStatus(user.id, next ? 'available' : 'offline');
      } else {
        await setChatActivePreference(next);
      }
      setIsActive(next);
    } finally {
      setToggleLoading(false);
    }
  };

  const openChat = async (chat: ChatListItem) => {
    if (!user) return;
    if (chat.type === 'channel' && !chat.is_member) {
      setJoiningId(chat.id);
      try {
        await joinChannel(chat.id, user.id);
        setChats((prev) =>
          prev.map((c) => (c.id === chat.id ? { ...c, is_member: true } : c)),
        );
      } catch {
        /* may already be member */
      } finally {
        setJoiningId(null);
      }
    }
    router.push(`/(main)/chat/${chat.id}`);
  };

  const renderChannelCard = (item: ChatListItem) => {
    const accent = channelAccent(item.channel_slug);
    const isJoining = joiningId === item.id;

    return (
      <View key={item.id} style={styles.card}>
        <View style={[styles.cardIcon, { backgroundColor: accent.bg }]}>
          <Ionicons name={channelIcon(item.channel_slug)} size={24} color={accent.fg} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <UnreadBadge count={item.unread_count} />
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description ?? 'Public community channel.'}
          </Text>
          {item.last_message_preview ? (
            <Text style={styles.cardPreview} numberOfLines={1}>
              {item.last_message_preview}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, item.is_member && styles.actionBtnOpen]}
          onPress={() => openChat(item)}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.actionBtnText}>{item.is_member ? 'Open' : 'Join'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderConversationCard = (item: ChatListItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.convCard}
      onPress={() => openChat(item)}
      activeOpacity={0.85}
    >
      <View style={styles.convIcon}>
        <Ionicons name={chatTypeIcon(item.type)} size={22} color={Colors.primary} />
      </View>
      <View style={styles.convBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.convTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {item.last_message_at ? (
            <Text style={styles.convTime}>{formatMessageTime(item.last_message_at)}</Text>
          ) : null}
        </View>
        <View style={styles.convBottom}>
          <Text style={styles.convPreview} numberOfLines={1}>
            {item.last_message_preview ?? `${chatTypeLabel(item.type)} chat`}
          </Text>
          <UnreadBadge count={item.unread_count} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ChatTopBar
        title="Messages"
        hideBack={isTabRoot}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(main)/');
        }}
        right={
          <View style={styles.headerRight}>
            <ActiveToggle
              value={isActive}
              onValueChange={handleActiveToggle}
              loading={toggleLoading}
            />
            {isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push('/(main)/chat/broadcast')}
                style={styles.headerBtn}
                hitSlop={8}
              >
                <Ionicons name="megaphone-outline" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {!isActive ? (
        <View style={styles.inactiveBanner}>
          <Ionicons name="moon-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.inactiveText}>
            You are inactive — chat notifications are paused.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          <Text style={styles.headerNote}>
            {isVolunteer
              ? 'Join community channels and coordinate with your task and campaign groups.'
              : 'Join public channels to connect with your community. Official announcements appear in Notifications.'}
          </Text>

          {!isAdmin && unreadBroadcastCount > 0 && latestUnreadBroadcast ? (
            <TouchableOpacity
              style={styles.broadcastPrompt}
              activeOpacity={0.88}
              onPress={() => router.push('/(main)/notifications')}
            >
              <Ionicons name="megaphone" size={18} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.broadcastPromptTitle}>
                  {unreadBroadcastCount === 1
                    ? 'New admin broadcast'
                    : `${unreadBroadcastCount} admin broadcasts`}
                </Text>
                <Text style={styles.broadcastPromptSub} numberOfLines={1}>
                  {latestUnreadBroadcast.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}

          <Text style={styles.sectionTitle}>Community channels</Text>
          <View style={styles.cardList}>
            {channels.length > 0 ? (
              channels.map(renderChannelCard)
            ) : (
              <Text style={styles.emptySection}>No channels available.</Text>
            )}
          </View>

          {conversations.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, styles.sectionGap]}>Your conversations</Text>
              <View style={styles.cardList}>{conversations.map(renderConversationCard)}</View>
            </>
          ) : null}

          {channels.length === 0 && conversations.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                Task and campaign chats appear here when you are assigned.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  inactiveText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 32 },
  headerNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  broadcastPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  broadcastPromptTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  broadcastPromptSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  sectionGap: { marginTop: 20 },
  cardList: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardPreview: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    justifyContent: 'center',
  },
  actionBtnOpen: { backgroundColor: Colors.secondary },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  convIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convBody: { flex: 1, gap: 4 },
  convTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  convTime: { fontSize: 11, color: Colors.textSecondary },
  convBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  convPreview: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { color: Colors.danger, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptySection: { fontSize: 14, color: Colors.textSecondary, paddingVertical: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
