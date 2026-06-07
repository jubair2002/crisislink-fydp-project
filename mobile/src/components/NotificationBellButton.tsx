import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors } from '../constants/colors';
import { HeaderGlassCircleButton } from './HeaderGlassCircleButton';
import { useNotificationStore } from '../store/notificationStore';

export function NotificationBellButton() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <View>
      <HeaderGlassCircleButton
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        onPress={() => router.push('/(main)/notifications')}
      >
        <Ionicons name="notifications-outline" size={21} color={Colors.textPrimary} />
      </HeaderGlassCircleButton>
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
