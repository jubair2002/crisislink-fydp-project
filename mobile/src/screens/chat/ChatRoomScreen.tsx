import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ActionSheetIOS,
  Linking,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useToastStore } from '../../store/toastStore';
import { copyText } from '../../utils/copyText';
import {
  DEFAULT_PAGE_SIZE,
  getChatById,
  getMessages,
  joinChannel,
  markMessageDelivered,
  markMessagesAsSeen,
  queueOfflineMessage,
  sendImage,
  sendLocation,
  sendMessage,
  subscribeToChat,
} from '../../services/chatService';
import type { Chat, Message } from '../../types/chat';
import { ChatTopBar, StatusIcon } from './chatShared';

function makeClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

type ListItem =
  | { kind: 'date'; id: string; label: string }
  | { kind: 'message'; id: string; message: Message };

function buildListItems(messages: Message[]): ListItem[] {
  const out: ListItem[] = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDay) {
      lastDay = day;
      out.push({ kind: 'date', id: `date-${day}`, label: formatDayLabel(msg.created_at) });
    }
    out.push({ kind: 'message', id: msg.id, message: msg });
  }
  return out;
}

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: {
      backgroundColor: c.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerSub: {
      fontSize: 12,
      color: c.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 48,
      paddingBottom: 8,
      marginTop: -4,
    },
    infoBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messageList: { flex: 1, backgroundColor: isDark ? c.dark : '#ECEFF4' },
    msgList: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, flexGrow: 1 },
    msgListEmpty: { flex: 1, justifyContent: 'center' },
    loadMore: { alignItems: 'center', paddingVertical: 12 },
    loadMoreText: { color: c.primary, fontWeight: '600', fontSize: 13 },
    datePillWrap: { alignItems: 'center', marginVertical: 12 },
    datePill: {
      backgroundColor: isDark ? c.elevated : 'rgba(255,255,255,0.92)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
    },
    datePillText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    msgRow: { flexDirection: 'row', marginBottom: 8, maxWidth: '85%' },
    msgRowMine: { alignSelf: 'flex-end' },
    msgRowOther: { alignSelf: 'flex-start' },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.iconMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginTop: 4,
      overflow: 'hidden',
    },
    avatarImg: { width: 32, height: 32 },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: '100%',
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    bubbleMine: {
      backgroundColor: c.primary,
      borderBottomRightRadius: 4,
    },
    bubbleOther: {
      backgroundColor: c.elevated,
      borderBottomLeftRadius: 4,
    },
    senderName: { fontSize: 12, fontWeight: '700', color: c.primary, marginBottom: 4 },
    msgText: { fontSize: 16, color: c.textPrimary, lineHeight: 22 },
    msgTextMine: { color: c.onPrimary },
    msgImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 4 },
    locationCard: { gap: 4, paddingVertical: 4, minWidth: 160 },
    locationText: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    locationTextMine: { color: c.onPrimary },
    locationTap: { fontSize: 12, color: c.textSecondary },
    locationTapMine: { color: 'rgba(255,255,255,0.75)' },
    msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-end' },
    msgTime: { fontSize: 11, color: c.chevron },
    msgTimeMine: { color: 'rgba(255,255,255,0.75)' },
    emptyChat: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
    emptySub: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    draftPreview: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
      backgroundColor: isDark ? c.dark : '#ECEFF4',
      gap: 8,
    },
    draftBubble: {
      maxWidth: '78%',
      backgroundColor: c.primary,
      opacity: 0.55,
      borderRadius: 18,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    draftText: { fontSize: 16, color: c.onPrimary, lineHeight: 22 },
    draftHint: { fontSize: 11, color: c.textSecondary, paddingBottom: 6 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingTop: 10,
      backgroundColor: c.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: 6,
    },
    toolBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    inputWrap: {
      flex: 1,
      minHeight: 44,
      maxHeight: 130,
      borderRadius: 22,
      backgroundColor: c.inputBg,
      borderWidth: 1.5,
      borderColor: 'transparent',
      justifyContent: 'center',
    },
    inputWrapFocused: {
      borderColor: c.primary,
      backgroundColor: c.elevated,
    },
    input: {
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 16,
      lineHeight: 22,
      color: c.textPrimary,
      maxHeight: 120,
      textAlignVertical: 'center',
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 0,
    },
    sendBtnActive: { backgroundColor: c.primary },
    sendBtnDisabled: { backgroundColor: c.iconMuted },
  });

export default function ChatRoomScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { id: chatIdParam } = useLocalSearchParams<{ id: string }>();
  const chatId = String(chatIdParam ?? '');
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);
  const setUnreadForChat = useChatStore((s) => s.setUnreadForChat);
  const showToast = useToastStore((s) => s.show);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isGroup = chat?.type === 'campaign' || chat?.type === 'task' || chat?.type === 'channel';
  const listItems = buildListItems(messages);
  const canSend = input.trim().length > 0 && !sending;

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const loadChat = useCallback(async () => {
    if (!chatId) return;
    const c = await getChatById(chatId);
    setChat(c);
    if (c?.type === 'channel' && user) {
      try {
        await joinChannel(chatId, user.id);
      } catch {
        /* already member */
      }
    }
  }, [chatId, user]);

  const loadInitialMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const rows = await getMessages(chatId, 0, DEFAULT_PAGE_SIZE);
      setMessages(rows);
      setPage(0);
      setHasMore(rows.length >= DEFAULT_PAGE_SIZE);
      scrollToBottom(false);
    } finally {
      setInitialLoading(false);
    }
  }, [chatId, scrollToBottom]);

  const loadOlder = async () => {
    if (!chatId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const rows = await getMessages(chatId, nextPage, DEFAULT_PAGE_SIZE);
      if (rows.length < DEFAULT_PAGE_SIZE) setHasMore(false);
      if (rows.length) {
        setMessages((prev) => [...rows, ...prev]);
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch {
      showToast('Could not load older messages.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!chatId || !user) return;
    setActiveChatId(chatId);
    loadChat();
    loadInitialMessages();
    markMessagesAsSeen(chatId, user.id).then(() => setUnreadForChat(chatId, 0));

    const unsub = subscribeToChat(chatId, async ({ type, message }) => {
      if (type === 'INSERT') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id || (message.client_id && m.client_id === message.client_id)))
            return prev;
          return [...prev, message];
        });
        scrollToBottom();

        if (message.sender_id !== user.id) {
          await markMessageDelivered(message.id);
          await markMessagesAsSeen(chatId, user.id);
        }
      } else if (type === 'UPDATE') {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, ...message } : m)));
      }
    });

    const kbSub = Keyboard.addListener('keyboardDidShow', () => scrollToBottom());

    return () => {
      unsub();
      kbSub.remove();
      setActiveChatId(null);
    };
  }, [chatId, user, setActiveChatId, setUnreadForChat, loadChat, loadInitialMessages, scrollToBottom, showToast]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user || !chatId || sending) return;

    setSending(true);
    setInput('');
    const clientId = makeClientId();
    const optimistic: Message = {
      id: clientId,
      chat_id: chatId,
      sender_id: user.id,
      content: text,
      type: 'text',
      status: 'pending',
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: { name: profile?.name ?? 'You', profile_photo_url: profile?.profile_photo_url },
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const sent = await sendMessage(chatId, user.id, text, 'text', { clientId });
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...sent, status: 'sent', sender: optimistic.sender } : m)),
      );
    } catch {
      await queueOfflineMessage({
        clientId,
        chatId,
        senderId: user.id,
        content: text,
        type: 'text',
        createdAt: new Date().toISOString(),
      });
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...m, status: 'pending' } : m)),
      );
      showToast('Message saved — will send when online.');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (!user || !chatId || sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setSending(true);
    const clientId = makeClientId();
    const uri = result.assets[0].uri;
    const optimistic: Message = {
      id: clientId,
      chat_id: chatId,
      sender_id: user.id,
      content: '',
      type: 'image',
      image_url: uri,
      status: 'pending',
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const sent = await sendImage(chatId, user.id, uri, clientId);
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...sent, status: 'sent' } : m)),
      );
    } catch {
      await queueOfflineMessage({
        clientId,
        chatId,
        senderId: user.id,
        content: '',
        type: 'image',
        imageUri: uri,
        createdAt: new Date().toISOString(),
      });
      showToast('Image saved — will send when online.');
    } finally {
      setSending(false);
    }
  };

  const handleShareLocation = async () => {
    if (!user || !chatId || sending) return;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow location access to share your position.');
      return;
    }
    setSending(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const clientId = makeClientId();
      const sent = await sendLocation(chatId, user.id, latitude, longitude, clientId);
      setMessages((prev) => [...prev, sent]);
      scrollToBottom();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not share location.');
    } finally {
      setSending(false);
    }
  };

  const onLongPressMessage = (msg: Message) => {
    if (msg.type !== 'text' || !msg.content) return;
    const copy = () => {
      copyText(msg.content).then((ok) => {
        if (ok) showToast('Copied to clipboard.');
      });
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Copy text', 'Cancel'], cancelButtonIndex: 1 },
        (i) => {
          if (i === 0) copy();
        },
      );
    } else {
      Alert.alert('Message', undefined, [
        { text: 'Copy text', onPress: copy },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const renderMessage = (item: Message) => {
    const isMine = item.sender_id === user?.id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => onLongPressMessage(item)}
        style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}
      >
        {isGroup && !isMine ? (
          <View style={styles.avatar}>
            {item.sender?.profile_photo_url ? (
              <Image source={{ uri: item.sender.profile_photo_url }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={16} color={colors.textSecondary} />
            )}
          </View>
        ) : null}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {isGroup && !isMine && item.sender?.name ? (
            <Text style={styles.senderName}>{item.sender.name}</Text>
          ) : null}
          {item.type === 'image' && item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.msgImage} resizeMode="cover" />
          ) : null}
          {item.type === 'location' && item.latitude != null && item.longitude != null ? (
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`,
                )
              }
            >
              <View style={styles.locationCard}>
                <Ionicons name="location" size={24} color={isMine ? colors.onPrimary : colors.primary} />
                <Text style={[styles.locationText, isMine && styles.locationTextMine]}>
                  Shared location
                </Text>
                <Text style={[styles.locationTap, isMine && styles.locationTapMine]}>
                  Tap to open in maps
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {item.type === 'text' ? (
            <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.content}</Text>
          ) : null}
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
              {new Date(item.created_at).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            {isMine ? <StatusIcon status={item.status} /> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'date') {
      return (
        <View style={styles.datePillWrap}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{item.label}</Text>
          </View>
        </View>
      );
    }
    return renderMessage(item.message);
  };

  if (!chatId) {
    return (
      <SafeAreaView style={styles.root}>
        <Text>Invalid chat.</Text>
      </SafeAreaView>
    );
  }

  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 56 : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <ChatTopBar
          title={chat?.name ?? 'Chat'}
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.infoBtn}
              onPress={() => router.push(`/(main)/chat/info/${chatId}`)}
              hitSlop={10}
            >
              <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        {chat?.description ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {chat.description}
          </Text>
        ) : null}
      </View>

      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardOffset}
        >
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.messageList}
            contentContainerStyle={[
              styles.msgList,
              listItems.length === 0 && styles.msgListEmpty,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (inputFocused || messages.length > 0) scrollToBottom(false);
            }}
            ListHeaderComponent={
              hasMore ? (
                <TouchableOpacity style={styles.loadMore} onPress={loadOlder} disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load older messages</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySub}>Say hello — your message will appear here.</Text>
              </View>
            }
          />

          {input.trim().length > 0 ? (
            <View style={styles.draftPreview}>
              <View style={styles.draftBubble}>
                <Text style={styles.draftText} numberOfLines={4}>
                  {input}
                </Text>
              </View>
              <Text style={styles.draftHint}>Preview</Text>
            </View>
          ) : null}

          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TouchableOpacity onPress={handlePickImage} style={styles.toolBtn} disabled={sending}>
              <Ionicons name="image-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareLocation} style={styles.toolBtn} disabled={sending}>
              <Ionicons name="location-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={[styles.inputWrap, inputFocused && styles.inputWrapFocused]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={input}
                onChangeText={setInput}
                onFocus={() => {
                  setInputFocused(true);
                  scrollToBottom();
                }}
                onBlur={() => setInputFocused(false)}
                placeholder="Message…"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={4000}
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnDisabled]}
              disabled={!canSend}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
