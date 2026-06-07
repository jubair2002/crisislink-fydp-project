import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { formatTimeAgo } from '../home/homeShared';
import type { MessageType } from '../../types/chat';

export function messagePreview(type: MessageType, content: string): string {
  switch (type) {
    case 'image':
      return '📷 Photo';
    case 'location':
      return '📍 Location';
    default:
      return content.length > 80 ? `${content.slice(0, 80)}…` : content;
  }
}

export function chatTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'campaign':
      return 'heart-outline';
    case 'task':
      return 'construct-outline';
    case 'channel':
      return 'globe-outline';
    case 'direct':
      return 'person-outline';
    default:
      return 'chatbubble-outline';
  }
}

export function chatTypeLabel(type: string): string {
  switch (type) {
    case 'campaign':
      return 'Campaign';
    case 'task':
      return 'Task';
    case 'channel':
      return 'Channel';
    case 'direct':
      return 'Direct';
    default:
      return 'Chat';
  }
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function StatusIcon({ status }: { status: string }) {
  if (status === 'pending') {
    return <Ionicons name="time-outline" size={14} color="#94A3B8" />;
  }
  if (status === 'sent') {
    return <Ionicons name="checkmark" size={14} color="#94A3B8" />;
  }
  if (status === 'delivered') {
    return <Ionicons name="checkmark-done" size={14} color="#94A3B8" />;
  }
  if (status === 'seen') {
    return <Ionicons name="checkmark-done" size={14} color={Colors.primary} />;
  }
  return null;
}

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function ActiveToggle({
  value,
  onValueChange,
  loading = false,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={activeToggleStyles.wrap}>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} style={activeToggleStyles.spinner} />
      ) : null}
      <Text style={[activeToggleStyles.label, value ? activeToggleStyles.labelOn : activeToggleStyles.labelOff]}>
        {value ? 'Active' : 'Off'}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || loading}
        trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
        thumbColor={value ? Colors.primary : '#F8FAFC'}
        ios_backgroundColor="#CBD5E1"
      />
    </View>
  );
}

const activeToggleStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  spinner: { marginRight: 2 },
  label: { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  labelOn: { color: Colors.success },
  labelOff: { color: Colors.textSecondary },
});

export function ChatTopBar({
  title,
  onBack,
  right,
  hideBack = false,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  hideBack?: boolean;
}) {
  return (
    <View style={styles.topBar}>
      {hideBack ? (
        <View style={styles.backBtnPlaceholder} />
      ) : (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      )}
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.topRight}>{right ?? <View style={{ width: 42 }} />}</View>
    </View>
  );
}

export { formatTimeAgo };

const styles = StyleSheet.create({
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
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
  backBtnPlaceholder: { width: 42, height: 42 },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginHorizontal: 8,
  },
  topRight: { minWidth: 42, alignItems: 'flex-end', justifyContent: 'center' },
});
