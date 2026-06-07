import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import { getChatById, getChatMembers } from '../../services/chatService';
import type { Chat, ChatMember } from '../../types/chat';
import { ChatTopBar, chatTypeIcon, chatTypeLabel } from './chatShared';

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: c.danger, textAlign: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    typeBadge: {
      backgroundColor: c.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    typeBadgeText: { color: c.onPrimary, fontSize: 12, fontWeight: '700' },
    slugBadge: {
      backgroundColor: c.muted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    slugBadgeText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    section: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary, marginBottom: 10 },
    description: { fontSize: 14, color: c.textSecondary, lineHeight: 21 },
    emptyMembers: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    memberAvatar: { width: 44, height: 44, borderRadius: 22 },
    memberAvatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberInitial: { fontSize: 18, fontWeight: '800', color: c.textSecondary },
    memberBody: { flex: 1, gap: 2 },
    memberName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    memberRole: { fontSize: 12, color: c.textSecondary, textTransform: 'capitalize' },
    memberJoined: { fontSize: 11, color: c.chevron },
    createdAt: {
      textAlign: 'center',
      fontSize: 12,
      color: c.chevron,
      marginTop: 8,
    },
  });

function MemberRow({ member, isYou }: { member: ChatMember; isYou: boolean }) {
  const styles = useThemedStyles(createStyles);
  const name = member.profile?.name?.trim() || 'Unknown user';
  const initial = name.charAt(0).toUpperCase();
  const roleLabel = member.profile?.role ?? member.role;

  return (
    <View style={styles.memberRow}>
      {member.profile?.profile_photo_url ? (
        <Image source={{ uri: member.profile.profile_photo_url }} style={styles.memberAvatar} />
      ) : (
        <View style={styles.memberAvatarFallback}>
          <Text style={styles.memberInitial}>{initial}</Text>
        </View>
      )}
      <View style={styles.memberBody}>
        <Text style={styles.memberName}>
          {name}
          {isYou ? ' (You)' : ''}
        </Text>
        <Text style={styles.memberRole}>{String(roleLabel)}</Text>
      </View>
      <Text style={styles.memberJoined}>
        {new Date(member.joined_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
      </Text>
    </View>
  );
}

export default function ChatRoomInfoScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id: chatIdParam } = useLocalSearchParams<{ id: string }>();
  const chatId = String(chatIdParam ?? '');
  const user = useAuthStore((s) => s.user);

  const [chat, setChat] = useState<Chat | null>(null);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!chatId) return;
    try {
      setError(null);
      const [c, m] = await Promise.all([getChatById(chatId), getChatMembers(chatId)]);
      setChat(c);
      setMembers(m);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load room info.');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    load();
  }, [load]);

  const typeLabel = chat ? chatTypeLabel(chat.type) : 'Chat';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ChatTopBar title="Room info" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons
                name={chat ? chatTypeIcon(chat.type) : 'chatbubble-outline'}
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.heroTitle}>{chat?.name ?? 'Chat room'}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
              {chat?.channel_slug ? (
                <View style={styles.slugBadge}>
                  <Text style={styles.slugBadgeText}>#{chat.channel_slug}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {chat?.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{chat.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Members ({members.length})
            </Text>
            {members.length === 0 ? (
              <Text style={styles.emptyMembers}>
                {chat?.type === 'channel'
                  ? 'No one has joined yet. Be the first to post!'
                  : 'Members will appear here once they join this room.'}
              </Text>
            ) : (
              members.map((m) => (
                <MemberRow key={m.id} member={m} isYou={m.user_id === user?.id} />
              ))
            )}
          </View>

          {chat?.created_at ? (
            <Text style={styles.createdAt}>
              Created{' '}
              {new Date(chat.created_at).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
