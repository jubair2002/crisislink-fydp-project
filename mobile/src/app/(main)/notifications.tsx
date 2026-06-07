import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { markNotificationRead } from '../../services/chatService';
import {
  fetchUserNotifications,
  subscribeToUserNotifications,
  syncUserNotifications,
} from '../../services/notificationService';
import { showBroadcastNotification } from '../../services/pushNotificationService';
import BroadcastNotificationView from '../../screens/chat/BroadcastNotificationView';
import { formatTimeAgo } from '../../screens/home/homeShared';

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    scroll: { flexGrow: 1, padding: 24 },
    errorBox: {
      backgroundColor: c.dangerSurface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      gap: 8,
    },
    errorText: { color: c.danger, fontSize: 13 },
    retryBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    retryText: { color: c.primary, fontWeight: '700' },
    section: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary, marginBottom: 4 },
    notifCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 4,
      marginBottom: 8,
    },
    notifUnread: { borderColor: c.primary, backgroundColor: c.primarySurface },
    notifTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    notifMessage: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    notifTime: { fontSize: 11, color: c.chevron, marginTop: 4 },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingTop: 40,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
    emptySub: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 260,
    },
  }));

  const user = useAuthStore((s) => s.user);
  const allNotifications = useNotificationStore((s) => s.items);
  const lastError = useNotificationStore((s) => s.lastError);
  const setItems = useNotificationStore((s) => s.setItems);
  const markReadInStore = useNotificationStore((s) => s.markRead);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const broadcasts = allNotifications
    .filter((n) => n.type === 'broadcast')
    .map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
    }));

  const otherNotifications = allNotifications.filter((n) => n.type !== 'broadcast');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchUserNotifications(user.id);
      setItems(rows);
    } catch (e: unknown) {
      useNotificationStore.getState().setError(
        e instanceof Error ? e.message : 'Could not load notifications.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, setItems]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserNotifications(user.id, (n) => {
      if (n.type === 'broadcast') {
        void showBroadcastNotification(n.title, n.message);
      }
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncUserNotifications(user.id);
    });
    return () => {
      unsub();
      appSub.remove();
    };
  }, [user]);

  const handleMarkBroadcastRead = async (id: string) => {
    await markNotificationRead(id);
    markReadInStore(id);
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    markReadInStore(id);
  };

  const isEmpty = !loading && allNotifications.length === 0 && !lastError;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)/'))}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          {lastError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{lastError}</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <BroadcastNotificationView broadcasts={broadcasts} onMarkRead={handleMarkBroadcastRead} />

          {otherNotifications.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent alerts</Text>
              {otherNotifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifCard, !n.is_read && styles.notifUnread]}
                  onPress={() => handleMarkRead(n.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMessage}>{n.message}</Text>
                  <Text style={styles.notifTime}>{formatTimeAgo(n.created_at)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {isEmpty ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                Disaster alerts, task assignments, campaign updates, and admin broadcasts will appear here.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
