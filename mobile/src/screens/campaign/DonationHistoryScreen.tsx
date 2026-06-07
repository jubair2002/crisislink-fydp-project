import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { copyText } from '../../utils/copyText';

import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { HeaderGlassCircleButton } from '../../components/HeaderGlassCircleButton';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { getDonationHistory } from '../../services/donationService';
import {
  getSavedDonations,
  type SavedDonation,
} from '../../services/donationHistoryStorage';

type HistoryItem = SavedDonation & { source: 'local' | 'server' };

function mergeHistory(local: SavedDonation[], server: SavedDonation[]): HistoryItem[] {
  const map = new Map<string, HistoryItem>();

  for (const row of server) {
    if (!row.donation_code) continue;
    map.set(row.donation_code.toUpperCase(), {
      donation_code: row.donation_code,
      donation_id: row.donation_id,
      amount: row.amount,
      campaign_title: row.campaign_title,
      saved_at: row.saved_at,
      source: 'server',
    });
  }

  for (const row of local) {
    const key = row.donation_code.toUpperCase();
    if (!map.has(key)) {
      map.set(key, { ...row, source: 'local' });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime(),
  );
}

export default function DonationHistoryScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const local = await getSavedDonations();
      let server: SavedDonation[] = [];

      if (user?.id) {
        const rows = await getDonationHistory(user.id);
        server = rows
          .filter((d) => d.donation_code && d.payment_status === 'paid')
          .map((d) => ({
            donation_code: d.donation_code!,
            donation_id: d.id,
            amount: d.amount,
            campaign_title: d.campaigns?.title ?? undefined,
            saved_at: d.created_at ?? new Date().toISOString(),
          }));
      }

      setItems(mergeHistory(local, server));
    } catch {
      const local = await getSavedDonations();
      setItems(local.map((row) => ({ ...row, source: 'local' as const })));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const copyCode = async (code: string) => {
    await copyText(code);
    setCopiedCode(code);
    showToast('Tracking ID copied');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <HeaderGlassCircleButton onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </HeaderGlassCircleButton>
        <Text style={styles.headerTitle}>Donation History</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.hint}>Tap a tracking ID to track your donation, or copy it anytime.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.donation_code}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={48} color={colors.iconMuted} />
              <Text style={styles.emptyTitle}>No donations yet</Text>
              <Text style={styles.emptySub}>
                Your tracking IDs appear here after you donate.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(main)/campaigns')}
              >
                <Text style={styles.emptyBtnText}>Browse campaigns</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campaignTitle} numberOfLines={2}>
                    {item.campaign_title ?? 'Relief campaign'}
                  </Text>
                  <Text style={styles.amount}>
                    {'\u09f3'}
                    {Math.round(item.amount).toLocaleString()}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(item.saved_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.codeRow}>
                <TouchableOpacity
                  style={styles.codeTap}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/campaigns/track',
                      params: { code: item.donation_code },
                    })
                  }
                >
                  <Text style={styles.codeLabel}>Tracking ID</Text>
                  <Text style={styles.code}>{item.donation_code}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => void copyCode(item.donation_code)}
                >
                  <Ionicons
                    name={copiedCode === item.donation_code ? 'checkmark' : 'copy-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, _isDark: boolean) => ({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  hint: {
    fontSize: 13,
    color: c.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  campaignTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  amount: { fontSize: 18, fontWeight: '800', color: c.primary, marginTop: 4 },
  date: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.muted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  codeTap: { flex: 1, padding: 12 },
  codeLabel: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
  code: {
    fontSize: 15,
    fontWeight: '800',
    color: c.primary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  copyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderLeftWidth: 1,
    borderLeftColor: c.border,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  emptySub: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: c.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: c.onPrimary, fontWeight: '700' },
});
