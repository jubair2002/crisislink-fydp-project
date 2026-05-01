import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import type { DisasterSeverity } from '../../types/disaster';

export function formatTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function severityColors(sev: string): { bg: string; fg: string } {
  switch (sev) {
    case 'critical':
      return { bg: Colors.danger, fg: '#FFFFFF' };
    case 'high':
      return { bg: Colors.warning, fg: '#0F172A' };
    case 'medium':
      return { bg: '#EAB308', fg: '#0F172A' };
    case 'low':
      return { bg: Colors.success, fg: '#FFFFFF' };
    default:
      return { bg: '#CBD5E1', fg: '#0F172A' };
  }
}

export function SeverityBadge({ severity }: { severity: DisasterSeverity | string }) {
  const { bg, fg } = severityColors(String(severity));
  return (
    <View style={[styles.sevBadge, { backgroundColor: bg }]}>
      <Text style={[styles.sevBadgeText, { color: fg }]}>{String(severity)}</Text>
    </View>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skelCard}>
          <View style={[styles.skelLine, { width: '55%' }]} />
          <View style={[styles.skelLine, { width: '35%', marginTop: 10 }]} />
          <View style={[styles.skelLine, { width: '80%', marginTop: 10 }]} />
        </View>
      ))}
    </View>
  );
}

export function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <TouchableOpacity style={styles.errRow} onPress={onRetry} activeOpacity={0.85}>
      <Ionicons name="alert-circle-outline" size={18} color={Colors.textSecondary} />
      <Text style={styles.errText}>Could not load. Tap to retry.</Text>
    </TouchableOpacity>
  );
}

export function EmptyHint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon} size={36} color="#CBD5E1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export const cardShadow = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionAction: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  skelCard: {
    ...cardShadow.card,
    paddingVertical: 16,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  errRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  errText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  sevBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sevBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
});
