import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors } from '../../constants/colors';
import { HeaderGlassCircleButton } from '../../components/HeaderGlassCircleButton';
import { useAuthStore } from '../../store/authStore';
import { useHomeStore } from '../../store/homeStore';
import type { CampaignRow } from '../../types/home';
import { useHomeLocation } from './useHomeLocation';
import { SectionTitle, SectionSkeleton, EmptyHint, formatTimeAgo } from './homeShared';
import { ExpandableServiceGrid, type HomeServiceItem } from './ExpandableServiceGrid';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_PAD = 16;
const SLIDE_GAP = 12;
const SLIDE_W = SCREEN_W - PAGE_PAD * 2 - 24;

const SERVICE_ITEMS: HomeServiceItem[] = [
  { icon: 'map-outline', label: 'Live Map', onPress: () => router.push('/(main)/disasters') },
  { icon: 'cube-outline', label: 'Aid Request', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'heart-outline', label: 'Donate', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'albums-outline', label: 'Campaigns', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'people-outline', label: 'Community', onPress: () => router.push('/(main)/chat') },
  { icon: 'notifications-outline', label: 'Alerts', onPress: () => router.push('/(main)/notifications') },
  { icon: 'person-outline', label: 'Profile', onPress: () => router.push('/(main)/profile') },
  { icon: 'warning-outline', label: 'Disasters', onPress: () => router.push('/(main)/disasters') },
  { icon: 'chatbubble-outline', label: 'Messages', onPress: () => router.push('/(main)/chat') },
  { icon: 'help-circle-outline', label: 'Support', onPress: () => router.push('/(main)/campaigns') },
];

function CampaignCarouselSlide({ item }: { item: CampaignRow }) {
  const target = Math.max(1, item.target_amount || 1);
  const pct = Math.min(100, Math.round(((item.collected_amount || 0) / target) * 100));
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.slideCard, { width: SLIDE_W }]}
      onPress={() => router.push('/(main)/campaigns')}
    >
      <Text style={styles.slideTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.slideLoc} numberOfLines={1}>
        {item.location_label ?? 'Nationwide'}
      </Text>
      <View style={styles.slideProgressBg}>
        <View style={[styles.slideProgressFg, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.slideAmt}>
        {pct}% funded · {'\u09f3'}
        {Math.round(item.collected_amount ?? 0)} / {'\u09f3'}
        {Math.round(item.target_amount ?? 0)}
      </Text>
      <View style={styles.slideCta}>
        <Text style={styles.slideCtaText}>View</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

export default function CitizenHomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const { permissionDenied, refreshCoords, latitude, longitude } = useHomeLocation();

  const activeCampaigns = useHomeStore((s) => s.activeCampaigns);
  const campaignUpdates = useHomeStore((s) => s.campaignUpdates);
  const loadingSections = useHomeStore((s) => s.loadingSections);
  const fetchCitizenHomeData = useHomeStore((s) => s.fetchCitizenHomeData);

  const [refreshing, setRefreshing] = useState(false);
  const [carouselDot, setCarouselDot] = useState(0);

  const loadData = useCallback(async () => {
    const coords = await refreshCoords();
    const lat = coords?.latitude ?? latitude ?? 0;
    const lng = coords?.longitude ?? longitude ?? 0;
    await fetchCitizenHomeData(lat, lng);
  }, [fetchCitizenHomeData, latitude, longitude, refreshCoords]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const displayName = profile?.name ?? user?.email ?? 'User';

  const sliderA = useMemo(() => activeCampaigns.slice(0, 5), [activeCampaigns]);

  const onMomentumScrollEndA = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (SLIDE_W + SLIDE_GAP));
    setCarouselDot(Math.max(0, Math.min(sliderA.length - 1, idx)));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.headerStrip}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.85}>
              {profile?.profile_photo_url ? (
                <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPh]}>
                  <Ionicons name="person" size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.headerTextCol}>
              <Text style={styles.brand}>CrisisLink</Text>
              <Text style={styles.greeting} numberOfLines={1}>
                Hi, {displayName}
              </Text>
            </View>
            <HeaderGlassCircleButton
              accessibilityLabel="Notifications"
              onPress={() => router.push('/(main)/notifications')}
            >
              <Ionicons name="notifications-outline" size={21} color={Colors.textPrimary} />
            </HeaderGlassCircleButton>
          </View>
        </View>

        <Text style={styles.tagline}>Relief updates and donations in one place.</Text>

        {profile && !profile.profile_completed ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push(
                profile.role === 'volunteer' ? '/(auth)/become-volunteer' : '/(auth)/profile-setup',
              )
            }
            style={styles.incompleteCard}
          >
            <Ionicons name="alert-circle" size={18} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteSub}>Add missing details to unlock all features.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}

        {permissionDenied ? (
          <View style={styles.locBanner}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.locBannerText}>Turn on location for nearby alerts.</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionTitle title="Active campaigns" actionLabel="See all" onAction={() => router.push('/(main)/campaigns')} />
          {loadingSections.campaigns ? (
            <SectionSkeleton rows={1} />
          ) : sliderA.length === 0 ? (
            <EmptyHint icon="albums-outline" text="No active campaigns." />
          ) : (
            <>
              <FlatList
                horizontal
                data={sliderA}
                keyExtractor={(it) => it.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={SLIDE_W + SLIDE_GAP}
                decelerationRate="fast"
                contentContainerStyle={styles.carouselContent}
                onMomentumScrollEnd={onMomentumScrollEndA}
                renderItem={({ item }) => (
                  <View style={{ width: SLIDE_W + SLIDE_GAP }}>
                    <CampaignCarouselSlide item={item} />
                  </View>
                )}
              />
              {sliderA.length > 1 ? (
                <View style={styles.dots}>
                  {sliderA.map((_, i) => (
                    <View key={i} style={[styles.dot, i === carouselDot && styles.dotOn]} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        <ExpandableServiceGrid items={SERVICE_ITEMS} title="Services" />

        <View style={styles.section}>
          <SectionTitle title="Recent updates" />
          <View style={styles.updatesShell}>
            {loadingSections.updates ? (
              <SectionSkeleton rows={2} />
            ) : campaignUpdates.length === 0 ? (
              <EmptyHint icon="newspaper-outline" text="No recent updates." />
            ) : (
              campaignUpdates.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.updateRow}
                  onPress={() => router.push('/(main)/campaigns')}
                  activeOpacity={0.85}
                >
                  <View style={styles.updateLine} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.updateTitle} numberOfLines={2}>
                      {u.title}
                    </Text>
                    <Text style={styles.updateCampaign}>{u.campaigns?.title ?? 'Campaign'}</Text>
                    <Text style={styles.updateTime}>{formatTimeAgo(u.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 28 },

  headerStrip: {
    backgroundColor: Colors.card,
    marginHorizontal: PAGE_PAD,
    marginTop: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextCol: { flex: 1 },
  brand: { fontSize: 11, fontWeight: '800', color: Colors.primary, letterSpacing: 0.8 },
  greeting: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagline: {
    marginHorizontal: PAGE_PAD + 2,
    marginTop: 12,
    marginBottom: 14,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  incompleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: PAGE_PAD,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  incompleteTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  incompleteSub: { fontSize: 12, color: '#A16207', marginTop: 2 },

  locBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: PAGE_PAD,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locBannerText: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },

  section: { marginBottom: 18, paddingHorizontal: PAGE_PAD },

  carouselContent: {
    paddingRight: PAGE_PAD,
    gap: SLIDE_GAP,
  },
  slideCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slideTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  slideLoc: { fontSize: 13, color: Colors.textSecondary, marginTop: 6 },
  slideProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginTop: 14,
    overflow: 'hidden',
  },
  slideProgressFg: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  slideAmt: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, fontWeight: '600' },
  slideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  slideCtaText: { fontSize: 14, fontWeight: '800', color: Colors.primary },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotOn: { backgroundColor: Colors.primary, width: 14 },

  updatesShell: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  updateRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  updateLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 4,
    minHeight: 36,
  },
  updateTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  updateCampaign: { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  updateTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
});
