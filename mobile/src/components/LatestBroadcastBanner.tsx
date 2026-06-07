import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import {
  selectLatestUnreadBroadcast,
  useNotificationStore,
} from '../store/notificationStore';
import { formatTimeAgo } from '../screens/home/homeShared';

const HOME_BANNER_MS = 60_000;

function isWithinHomeBannerWindow(createdAt: string): boolean {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < HOME_BANNER_MS;
}

/** Surfaces the newest unread admin broadcast on home for the first minute only. */
export function LatestBroadcastBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.warningSurface,
      borderWidth: 1,
      borderColor: c.warningSurfaceBorder,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.warningSurfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    label: { fontSize: 11, fontWeight: '800', color: c.warning, letterSpacing: 0.3 },
    title: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    message: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    time: { fontSize: 11, color: c.chevron, marginTop: 2 },
  }));

  const latest = useNotificationStore(selectLatestUnreadBroadcast);
  const [, setExpired] = useState(0);

  useEffect(() => {
    if (!latest) return;
    const created = new Date(latest.created_at).getTime();
    if (Number.isNaN(created)) return;

    const elapsed = Date.now() - created;
    if (elapsed >= HOME_BANNER_MS) return;

    const id = setTimeout(() => setExpired((n) => n + 1), HOME_BANNER_MS - elapsed + 50);
    return () => clearTimeout(id);
  }, [latest?.id, latest?.created_at]);

  if (!latest || !isWithinHomeBannerWindow(latest.created_at)) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push('/(main)/notifications')}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="megaphone" size={18} color={colors.warning} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Admin broadcast</Text>
        <Text style={styles.title} numberOfLines={1}>
          {latest.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {latest.message}
        </Text>
        <Text style={styles.time}>{formatTimeAgo(latest.created_at)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
    </TouchableOpacity>
  );
}
