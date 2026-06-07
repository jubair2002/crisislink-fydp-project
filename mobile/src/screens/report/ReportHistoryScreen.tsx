import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import { getReportsForUser } from '../../services/reportService';
import type { ReportRow } from '../../types/report';
import {
  ReportBadge,
  ReportLoading,
  ReportScreenShell,
  formatReportDate,
} from './reportShared';

const createStyles = (c: ThemeColors) => ({
  list: { paddingBottom: 24 },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: c.card,
  },
  cardTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
    marginBottom: 8,
  },
  badgeRow: { flexDirection: 'row' as const, gap: 6, flexWrap: 'wrap' as const, flex: 1 },
  date: { fontSize: 11, color: c.textSecondary },
  desc: { fontSize: 14, color: c.textPrimary, lineHeight: 20, marginBottom: 6 },
  meta: { fontSize: 12, color: c.textSecondary },
  empty: { alignItems: 'center' as const, paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800' as const, color: c.textPrimary },
  emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' as const },
  fab: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center' as const,
  },
  fabText: { color: c.onPrimary, fontWeight: '800' as const },
});

export default function ReportHistoryScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((s) => s.user?.id);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await getReportsForUser(userId);
      setReports(rows);
    } catch {
      setReports([]);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ReportScreenShell title="My Reports">
        <ReportLoading />
      </ReportScreenShell>
    );
  }

  return (
    <ReportScreenShell title="My Reports">
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>
              Submit a campaign issue, platform bug, or general feedback.
            </Text>
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/(main)/report')}>
              <Text style={styles.fabText}>Submit a report</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/(main)/report/${item.id}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.badgeRow}>
                <ReportBadge type={item.report_type} />
                <ReportBadge status={item.status} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
            </View>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
            {item.campaign?.title ? (
              <Text style={styles.meta}>Campaign: {item.campaign.title}</Text>
            ) : null}
            <Text style={styles.date}>{formatReportDate(item.created_at)}</Text>
          </TouchableOpacity>
        )}
      />
    </ReportScreenShell>
  );
}
