import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '../../constants/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
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

function severityColors(sev: string, c: ThemeColors): { bg: string; fg: string } {
  switch (sev) {
    case 'critical':
      return { bg: c.danger, fg: c.onPrimary };
    case 'high':
      return { bg: c.warning, fg: c.dark };
    case 'medium':
      return { bg: '#EAB308', fg: c.dark };
    case 'low':
      return { bg: c.success, fg: c.onPrimary };
    default:
      return { bg: c.iconMuted, fg: c.dark };
  }
}

const createSharedStyles = (c: ThemeColors) => ({
  sectionHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: c.textPrimary,
  },
  sectionAction: { fontSize: 13, fontWeight: '700' as const, color: c.primary },
  skelCard: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    paddingVertical: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: c.skeleton,
  },
  errRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  errText: { flex: 1, fontSize: 13, color: c.textSecondary },
  emptyBox: {
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  emptyText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' as const },
  sevBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  sevBadgeText: { fontSize: 10, fontWeight: '800' as const, textTransform: 'capitalize' as const },
});

export function SeverityBadge({ severity }: { severity: DisasterSeverity | string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createSharedStyles);
  const { bg, fg } = severityColors(String(severity), colors);
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
  const styles = useThemedStyles(createSharedStyles);
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
  const styles = useThemedStyles(createSharedStyles);
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
  const styles = useThemedStyles(createSharedStyles);
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.errRow} onPress={onRetry} activeOpacity={0.85}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.textSecondary} />
      <Text style={styles.errText}>Could not load. Tap to retry.</Text>
    </TouchableOpacity>
  );
}

export function EmptyHint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const styles = useThemedStyles(createSharedStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.emptyBox}>
      <Ionicons name={icon} size={36} color={colors.iconMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}
