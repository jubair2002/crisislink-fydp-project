import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
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

export default function BroadcastNotificationView({ broadcasts, onMarkRead }: Props) {
  if (!broadcasts.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name="megaphone" size={18} color={Colors.warning} />
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

const styles = StyleSheet.create({
  section: { gap: 10, marginBottom: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardUnread: {
    borderColor: Colors.warning,
    backgroundColor: '#FFFBEB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5 },
  time: { fontSize: 12, color: Colors.textSecondary },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  message: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  hint: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 4 },
});
