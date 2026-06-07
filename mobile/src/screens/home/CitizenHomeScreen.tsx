import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { ThemeColors } from '../../constants/themes';
import { NotificationBellButton } from '../../components/NotificationBellButton';
import { LatestBroadcastBanner } from '../../components/LatestBroadcastBanner';
import { CampaignCarousel } from '../../components/CampaignCarousel';
import { useAuthStore } from '../../store/authStore';
import { useHomeStore } from '../../store/homeStore';
import { useHomeLocation } from './useHomeLocation';
import { SectionTitle, SectionSkeleton, EmptyHint, formatTimeAgo } from './homeShared';
import { ExpandableServiceGrid, type HomeServiceItem } from './ExpandableServiceGrid';
import { openGeneralChannel } from '../chat/openGeneralChannel';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const PAGE_PAD = 16;

const SERVICE_ITEMS: HomeServiceItem[] = [
  { icon: 'map-outline', label: 'Live Map', onPress: () => router.push('/(main)/disasters') },
  { icon: 'cube-outline', label: 'Aid Request', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'heart-outline', label: 'Donate', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'time-outline', label: 'Donation History', onPress: () => router.push('/(main)/campaigns/history') },
  { icon: 'albums-outline', label: 'Campaigns', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'people-outline', label: 'Community', onPress: () => void openGeneralChannel() },
  { icon: 'notifications-outline', label: 'Alerts', onPress: () => router.push('/(main)/notifications') },
  { icon: 'warning-outline', label: 'Disasters', onPress: () => router.push('/(main)/disasters') },
  { icon: 'help-circle-outline', label: 'Support', onPress: () => router.push('/(main)/settings/support') },
  { icon: 'settings-outline', label: 'Settings', onPress: () => router.push('/(main)/settings') },
  { icon: 'flag-outline', label: 'Report', onPress: () => router.push('/(main)/report') },
];

const createStyles = (c: ThemeColors) => ({
  screen: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingBottom: 28 },

  headerStrip: {
    backgroundColor: c.card,
    marginHorizontal: PAGE_PAD,
    marginTop: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  headerTextCol: { flex: 1 },
  brand: { fontSize: 11, fontWeight: '800' as const, color: c.primary, letterSpacing: 0.8 },
  greeting: { fontSize: 17, fontWeight: '800' as const, color: c.textPrimary, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPh: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.primarySurface,
    borderWidth: 1,
    borderColor: c.primarySurfaceBorder,
  },
  tagline: {
    marginHorizontal: PAGE_PAD + 2,
    marginTop: 12,
    marginBottom: 14,
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },

  incompleteCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginHorizontal: PAGE_PAD,
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.warningSurfaceBorder,
    marginBottom: 12,
  },
  incompleteTitle: { fontSize: 14, fontWeight: '700' as const, color: c.warning },
  incompleteSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

  locBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginHorizontal: PAGE_PAD,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  locBannerText: { flex: 1, fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },

  section: { marginBottom: 18, paddingHorizontal: PAGE_PAD },

  campaignSection: { marginBottom: 18, paddingHorizontal: PAGE_PAD },

  updatesShell: {
    backgroundColor: c.card,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  updateRow: {
    flexDirection: 'row' as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    alignItems: 'flex-start' as const,
  },
  updateLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: c.primary,
    marginTop: 4,
    minHeight: 36,
  },
  updateTitle: { fontSize: 15, fontWeight: '700' as const, color: c.textPrimary },
  updateCampaign: { fontSize: 12, color: c.primary, marginTop: 4, fontWeight: '600' as const },
  updateTime: { fontSize: 12, color: c.textSecondary, marginTop: 6 },
});

export default function CitizenHomeScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const { permissionDenied, refreshCoords, latitude, longitude } = useHomeLocation();

  const activeCampaigns = useHomeStore((s) => s.activeCampaigns);
  const campaignUpdates = useHomeStore((s) => s.campaignUpdates);
  const loadingSections = useHomeStore((s) => s.loadingSections);
  const fetchCitizenHomeData = useHomeStore((s) => s.fetchCitizenHomeData);

  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.headerStrip}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.85}>
              {profile?.profile_photo_url ? (
                <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPh]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.headerTextCol}>
              <Text style={styles.brand}>CrisisLink</Text>
              <Text style={styles.greeting} numberOfLines={1}>
                Hi, {displayName}
              </Text>
            </View>
            <NotificationBellButton />
          </View>
        </View>

        <Text style={styles.tagline}>Relief updates and donations in one place.</Text>

        <LatestBroadcastBanner />

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
            <Ionicons name="alert-circle" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteSub}>Add missing details to unlock all features.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
          </TouchableOpacity>
        ) : null}

        {permissionDenied ? (
          <View style={styles.locBanner}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.locBannerText}>Turn on location for nearby alerts.</Text>
          </View>
        ) : null}

        <View style={styles.campaignSection}>
          <SectionTitle title="Active campaigns" actionLabel="See all" onAction={() => router.push('/(main)/campaigns')} />
          {loadingSections.campaigns ? (
            <SectionSkeleton rows={1} />
          ) : activeCampaigns.length === 0 ? (
            <EmptyHint icon="albums-outline" text="No active campaigns." />
          ) : (
            <CampaignCarousel campaigns={activeCampaigns} />
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
