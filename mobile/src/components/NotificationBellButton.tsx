import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { HeaderGlassCircleButton } from './HeaderGlassCircleButton';
import { useNotificationStore } from '../store/notificationStore';

export function NotificationBellButton() {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: c.background,
    },
    badgeText: {
      color: c.onPrimary,
      fontSize: 10,
      fontWeight: '800',
    },
  }));
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <View>
      <HeaderGlassCircleButton
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        onPress={() => router.push('/(main)/notifications')}
      >
        <Ionicons name="notifications-outline" size={21} color={colors.textPrimary} />
      </HeaderGlassCircleButton>
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}
