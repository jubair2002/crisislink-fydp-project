import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import { getCampaignReportsForVolunteer } from '../../services/reportService';
import type { ReportRow } from '../../types/report';
import { ReportBadge, ReportLoading, formatReportDate } from './reportShared';

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
    marginBottom: 8,
  },
  badgeRow: { flexDirection: 'row' as const, gap: 6 },
  desc: { fontSize: 14, color: c.textPrimary, lineHeight: 20 },
  meta: { fontSize: 12, color: c.textSecondary, marginTop: 6 },
  empty: { alignItems: 'center' as const, paddingTop: 32, gap: 8 },
  emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' as const },
});

type Props = {
  embedded?: boolean;
};

export default function VolunteerCampaignIssuesScreen({ embedded }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((s) => s.user?.id);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await getCampaignReportsForVolunteer(userId);
      setReports(rows);
    } catch {
      setReports([]);
    }
  }, [userId]);

  React.useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return embedded ? <ReportLoading /> : null;
  }

  const content = (
    <FlatList
      data={reports}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
          <Text style={styles.emptyText}>No campaign issues reported for your assigned campaigns.</Text>
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
          <Text style={styles.meta}>{formatReportDate(item.created_at)}</Text>
        </TouchableOpacity>
      )}
    />
  );

  return content;
}
