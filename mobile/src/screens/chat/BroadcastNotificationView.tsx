import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { formatTimeAgo } from '../home/homeShared';

export interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  broadcasts: BroadcastItem[];
  onMarkRead?: (id: string) => void;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { gap: 10, marginBottom: 24 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 6,
    },
    cardUnread: {
      borderColor: c.warning,
      backgroundColor: c.warningSurface,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badge: {
      backgroundColor: c.warning,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.dark, letterSpacing: 0.5 },
    time: { fontSize: 12, color: c.textSecondary },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    message: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
    hint: { fontSize: 11, color: c.chevron, fontStyle: 'italic', marginTop: 4 },
  });

export default function BroadcastNotificationView({ broadcasts, onMarkRead }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!broadcasts.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name="megaphone" size={18} color={colors.warning} />
        <Text style={styles.sectionTitle}>Admin broadcasts</Text>
      </View>
      {broadcasts.map((b) => (
        <TouchableOpacity
          key={b.id}
          style={[styles.card, !b.is_read && styles.cardUnread]}
          activeOpacity={0.85}
          onPress={() => onMarkRead?.(b.id)}
        >
          <View style={styles.cardTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>BROADCAST</Text>
            </View>
            <Text style={styles.time}>{formatTimeAgo(b.created_at)}</Text>
          </View>
          <Text style={styles.title}>{b.title}</Text>
          <Text style={styles.message}>{b.message}</Text>
          <Text style={styles.hint}>Broadcasts cannot be replied to.</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
