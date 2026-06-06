import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { Colors } from '../../constants/colors';
import { HeaderGlassCircleButton } from '../../components/HeaderGlassCircleButton';
import { CampaignCoverImage } from '../../components/CampaignCoverImage';
import {
  daysRemaining,
  fetchActiveCampaigns,
  fundingProgress,
} from '../../services/campaignService';
import type { Campaign } from '../../types/campaign';

type SortKey = 'default' | 'ending_soon' | 'most_funded' | 'most_raised';

function CampaignCard({ item }: { item: Campaign }) {
  const pct = fundingProgress(item);
  const days = daysRemaining(item.end_date);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/(main)/campaigns/${item.id}`)}
      >
        <View style={styles.cardImageWrap}>
          <CampaignCoverImage uri={item.media_url} height={200} rounded={0} />
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.75)']}
            style={styles.cardImageGradient}
          />
          {days != null && (
            <View style={styles.daysBadge}>
              <Ionicons name="time-outline" size={12} color="#FFF" />
              <Text style={styles.daysText}>{days === 0 ? 'Last day' : `${days}d left`}</Text>
            </View>
          )}
          <Text style={styles.cardImageTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.locText} numberOfLines={1}>
              {item.location ?? 'Nationwide'}
            </Text>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFg, { width: `${pct}%` }]} />
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountText}>
              {'\u09f3'}
              {Math.round(item.collected_amount).toLocaleString()} raised
            </Text>
            <Text style={styles.pctText}>{pct}% of goal</Text>
          </View>
          <Text style={styles.goalText}>
            Goal {'\u09f3'}
            {Math.round(item.target_amount).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => router.push(`/(main)/campaigns/${item.id}`)}
        >
          <Text style={styles.detailsBtnText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.donateBtn}
          onPress={() => router.push(`/(main)/campaigns/${item.id}/donate`)}
        >
          <Ionicons name="heart" size={16} color="#FFF" />
          <Text style={styles.donateBtnText}>Donate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CampaignListScreen() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('default');

  const load = useCallback(async () => {
    try {
      const rows = await fetchActiveCampaigns();
      setCampaigns(rows);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = campaigns;

    if (q) {
      rows = rows.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.location ?? '').toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q),
      );
    }

    const sorted = [...rows];
    if (sort === 'ending_soon') {
      sorted.sort((a, b) => {
        const da = a.end_date ? new Date(a.end_date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.end_date ? new Date(b.end_date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else if (sort === 'most_funded') {
      sorted.sort((a, b) => fundingProgress(b) - fundingProgress(a));
    } else if (sort === 'most_raised') {
      sorted.sort((a, b) => (b.collected_amount ?? 0) - (a.collected_amount ?? 0));
    }

    return sorted;
  }, [campaigns, search, sort]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'default', label: 'All' },
    { key: 'ending_soon', label: 'Ending soon' },
    { key: 'most_funded', label: 'Most funded' },
    { key: 'most_raised', label: 'Top raised' },
  ];

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.pageSubtitle}>
        Support verified relief drives across Bangladesh. Every contribution is tracked.
      </Text>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location…"
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {sortOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, sort === opt.key && styles.chipActive]}
            onPress={() => setSort(opt.key)}
          >
            <Text style={[styles.chipText, sort === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length > 0 ? (
        <Text style={styles.resultCount}>
          {filtered.length} active campaign{filtered.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <HeaderGlassCircleButton onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </HeaderGlassCircleButton>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Campaigns</Text>
        </View>
        <HeaderGlassCircleButton onPress={() => router.push('/(main)/campaigns/history')}>
          <Ionicons name="time-outline" size={22} color={Colors.textPrimary} />
        </HeaderGlassCircleButton>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CampaignCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {search ? 'No matches found' : 'No active campaigns'}
              </Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'Try a different search term or clear filters.'
                  : 'Check back soon for relief fundraising drives.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.trackLink}
              onPress={() => router.push('/(main)/campaigns/track')}
            >
              <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
              <Text style={styles.trackLinkText}>Track a donation by ID</Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  listHeader: { marginBottom: 4 },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  chips: { gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  resultCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageWrap: { position: 'relative' },
  cardImageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImageTitle: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  daysBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  daysText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  cardBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  progressBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFg: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  amountText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
  pctText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  goalText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailsBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  detailsBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  donateBtn: {
    flex: 1.4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  donateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  trackLinkText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
