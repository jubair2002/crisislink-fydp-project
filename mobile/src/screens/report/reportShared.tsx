import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { ReportStatus, ReportType } from '../../types/report';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from '../../types/report';

export function formatReportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function reportTypeColors(
  type: ReportType,
  colors: ReturnType<typeof useTheme>['colors'],
): { bg: string; fg: string } {
  switch (type) {
    case 'campaign':
      return { bg: colors.warningSurface, fg: colors.warning };
    case 'platform':
      return { bg: colors.dangerSurface, fg: colors.danger };
    case 'feedback':
      return { bg: colors.primarySurface, fg: colors.primary };
    default:
      return { bg: colors.muted, fg: colors.textSecondary };
  }
}

export function reportStatusColors(
  status: ReportStatus,
  colors: ReturnType<typeof useTheme>['colors'],
): { bg: string; fg: string } {
  switch (status) {
    case 'submitted':
      return { bg: colors.muted, fg: colors.textSecondary };
    case 'in_review':
      return { bg: colors.primarySurface, fg: colors.primary };
    case 'resolved':
      return { bg: colors.successSurface, fg: colors.success };
    case 'rejected':
      return { bg: colors.dangerSurface, fg: colors.danger };
    default:
      return { bg: colors.muted, fg: colors.textSecondary };
  }
}

export function ReportBadge({
  type,
  status,
}: {
  type?: ReportType;
  status?: ReportStatus;
}) {
  const { colors } = useTheme();
  if (type) {
    const c = reportTypeColors(type, colors);
    return (
      <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.fg }]}>
        <Text style={[styles.badgeText, { color: c.fg }]}>{REPORT_TYPE_LABELS[type]}</Text>
      </View>
    );
  }
  if (status) {
    const c = reportStatusColors(status, colors);
    return (
      <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.fg }]}>
        <Text style={[styles.badgeText, { color: c.fg }]}>{REPORT_STATUS_LABELS[status]}</Text>
      </View>
    );
  }
  return null;
}

export function ReportScreenShell({
  title,
  children,
  rightAction,
}: {
  title: string;
  children?: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)/report'))}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backSpacer}>{rightAction}</View>
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function ReportLoading() {
  const { colors } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { width: 42, alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', marginHorizontal: 8 },
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
});
