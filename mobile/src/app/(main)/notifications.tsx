import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { Colors } from '../../constants/colors';
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)/'))}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
                <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },

  scroll: { flexGrow: 1, padding: 24 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: Colors.danger, fontSize: 13 },
  retryBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { color: Colors.primary, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  notifCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    marginBottom: 8,
  },
  notifUnread: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  notifTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  notifMessage: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});
