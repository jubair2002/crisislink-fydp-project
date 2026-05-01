import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors } from '../../constants/colors';
import { HeaderGlassCircleButton } from '../../components/HeaderGlassCircleButton';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import { useHomeStore } from '../../store/homeStore';
import { supabase } from '../../services/supabaseClient';
import { getVolunteerProfile } from '../../services/profileService';
import type { VolunteerProfile } from '../../types/profile';
import { DISASTER_TYPE_OPTIONS } from '../../types/profile';
import { useHomeLocation } from './useHomeLocation';
import {
  SectionTitle,
  SectionSkeleton,
  EmptyHint,
  SeverityBadge,
  formatTimeAgo,
} from './homeShared';
import { ExpandableServiceGrid, type HomeServiceItem } from './ExpandableServiceGrid';

const PAGE_PAD = 16;

function disasterIcon(type: string): keyof typeof Ionicons.glyphMap {
  const hit = DISASTER_TYPE_OPTIONS.find((o) => o.value === type);
  return (hit?.icon as keyof typeof Ionicons.glyphMap) ?? 'warning-outline';
}

const VOLUNTEER_SERVICES: HomeServiceItem[] = [
  { icon: 'list-outline', label: 'My Tasks', onPress: () => router.push('/(main)/tasks') },
  { icon: 'map-outline', label: 'Live Map', onPress: () => router.push('/(main)/disasters') },
  { icon: 'cube-outline', label: 'Deliveries', onPress: () => router.push('/(main)/tasks') },
  { icon: 'heart-outline', label: 'Campaigns', onPress: () => router.push('/(main)/campaigns') },
  { icon: 'people-outline', label: 'Community', onPress: () => router.push('/(main)/chat') },
  { icon: 'notifications-outline', label: 'Alerts', onPress: () => router.push('/(main)/notifications') },
  { icon: 'person-outline', label: 'Profile', onPress: () => router.push('/(main)/profile') },
  { icon: 'navigate-outline', label: 'Respond', onPress: () => router.push('/(main)/disasters') },
  { icon: 'document-text-outline', label: 'Reports', onPress: () => router.push('/(main)/disasters') },
  { icon: 'shield-checkmark-outline', label: 'Verify', onPress: () => router.push('/(main)/tasks') },
  { icon: 'chatbubble-outline', label: 'Messages', onPress: () => router.push('/(main)/chat') },
  { icon: 'settings-outline', label: 'Account', onPress: () => router.push('/(main)/profile') },
];

export default function VolunteerHomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const {
    latitude,
    longitude,
    permissionDenied,
    refreshCoords,
  } = useHomeLocation();

  const nearbyDisasters = useHomeStore((s) => s.nearbyDisasters);
  const activeTask = useHomeStore((s) => s.activeTask);
  const loadingSections = useHomeStore((s) => s.loadingSections);

  const fetchVolunteerHomeData = useHomeStore((s) => s.fetchVolunteerHomeData);
  const reloadVolunteerAssignments = useHomeStore((s) => s.reloadVolunteerAssignments);

  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [loadingVolunteer, setLoadingVolunteer] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVolunteer = useCallback(async () => {
    if (!userId) return;
    setLoadingVolunteer(true);
    try {
      const v = await getVolunteerProfile(userId);
      setVolunteer(v);
    } catch {
      setVolunteer(null);
    } finally {
      setLoadingVolunteer(false);
    }
  }, [userId]);

  const loadAll = useCallback(async () => {
    await loadVolunteer();
    const coords = await refreshCoords();
    const lat = coords?.latitude ?? latitude ?? 23.8103;
    const lng = coords?.longitude ?? longitude ?? 90.4125;
    await fetchVolunteerHomeData(userId, lat, lng);
  }, [
    fetchVolunteerHomeData,
    latitude,
    longitude,
    loadVolunteer,
    refreshCoords,
    userId,
  ]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('volunteer_home_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
          filter: `volunteer_id=eq.${userId}`,
        },
        () => {
          void reloadVolunteerAssignments();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disasters' },
        () => {
          const lat = useLocationStore.getState().latitude ?? 23.8103;
          const lng = useLocationStore.getState().longitude ?? 90.4125;
          void fetchVolunteerHomeData(userId, lat, lng);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, fetchVolunteerHomeData, reloadVolunteerAssignments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const displayName = profile?.name ?? user?.email ?? 'Volunteer';

  const [needCounts, setNeedCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    const ids = nearbyDisasters.slice(0, 5).map((d) => d.id);
    if (!ids.length) {
      setNeedCounts({});
      return;
    }
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('disaster_id, required_volunteers')
          .in('disaster_id', ids);
        if (cancelled || error || !data) return;
        const next: Record<string, number | null> = {};
        for (const row of data as { disaster_id?: string; required_volunteers?: number }[]) {
          const did = String(row.disaster_id ?? '');
          const req = Number(row.required_volunteers ?? 1);
          next[did] = Math.max(next[did] ?? 0, req);
        }
        if (!cancelled) setNeedCounts(next);
      } catch {
        if (!cancelled) setNeedCounts({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nearbyDisasters]);

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

        {profile && !profile.profile_completed ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/become-volunteer')}
            style={styles.incompleteCard}
          >
            <Ionicons name="alert-circle" size={18} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteSub}>Finish onboarding to unlock assignments.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}

        {!loadingVolunteer && volunteer?.verification_status === 'pending' ? (
          <View style={[styles.volAlert, { borderColor: '#FDE68A', backgroundColor: Colors.card }]}>
            <Ionicons name="time-outline" size={18} color={Colors.warning} />
            <Text style={[styles.volAlertText, { color: '#92400E' }]}>
              Application under review. We will notify you when verified.
            </Text>
          </View>
        ) : null}

        {!loadingVolunteer && volunteer?.verification_status === 'rejected' ? (
          <View style={[styles.volAlert, { borderColor: '#FECACA', backgroundColor: Colors.card }]}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
            <Text style={[styles.volAlertText, { color: '#991B1B' }]}>
              Application rejected. Update details and resubmit from profile.
            </Text>
          </View>
        ) : null}

        {permissionDenied ? (
          <View style={styles.locBanner}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.locBannerText}>Turn on location for nearby missions.</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionTitle title="Active task" />
          {loadingSections.volunteerTasks ? (
            <SectionSkeleton rows={1} />
          ) : !activeTask ? (
            <View style={styles.emptyShell}>
              <EmptyHint icon="clipboard-outline" text="No active tasks assigned." />
            </View>
          ) : (
            <View style={styles.taskBanner}>
              <View style={styles.taskBannerTop}>
                <SeverityBadge severity={activeTask.task?.disaster?.severity ?? 'medium'} />
                <Text style={styles.taskType}>
                  {(activeTask.task?.task_type ?? activeTask.task?.help_type ?? 'Task').replace(/_/g, ' ')}
                </Text>
              </View>
              <Text style={styles.taskLoc} numberOfLines={2}>
                {activeTask.task?.disaster?.location_label ??
                  (activeTask.task?.disaster
                    ? `${activeTask.task.disaster.latitude.toFixed(3)}, ${activeTask.task.disaster.longitude.toFixed(3)}`
                    : 'Location pending')}
              </Text>
              <TouchableOpacity style={styles.viewTaskBtn} onPress={() => router.push('/(main)/tasks')}>
                <Text style={styles.viewTaskBtnText}>Open tasks</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ExpandableServiceGrid items={VOLUNTEER_SERVICES} title="Services" />

        <View style={styles.section}>
          <SectionTitle title="Nearby disasters" />
          {loadingSections.disasters ? (
            <SectionSkeleton rows={2} />
          ) : nearbyDisasters.length === 0 ? (
            <View style={styles.emptyShell}>
              <EmptyHint icon="shield-checkmark-outline" text="No nearby disasters." />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {nearbyDisasters.slice(0, 5).map((d) => (
                <View key={d.id} style={styles.disCard}>
                  <View style={styles.disTop}>
                    <Ionicons name={disasterIcon(String(d.disaster_type))} size={22} color={Colors.primary} />
                    <SeverityBadge severity={d.severity} />
                  </View>
                  <Text style={styles.disMeta}>
                    {d.distanceKm != null ? `${d.distanceKm.toFixed(1)} km` : 'Nearby'} · {formatTimeAgo(d.created_at)}
                  </Text>
                  {needCounts[d.id] != null && needCounts[d.id]! > 0 ? (
                    <View style={styles.needBadge}>
                      <Text style={styles.needBadgeText}>Volunteers needed: {needCounts[d.id]}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.respondBtn} onPress={() => router.push(`/(main)/disasters/detail/${d.id}`)}>
                    <Text style={styles.respondBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
    marginBottom: 14,
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
    marginBottom: 10,
  },
  incompleteTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  incompleteSub: { fontSize: 12, color: '#A16207', marginTop: 2 },

  volAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: PAGE_PAD,
    marginBottom: 10,
  },
  volAlertText: { flex: 1, fontSize: 12, lineHeight: 17 },

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

  emptyShell: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  taskBanner: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  taskBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskType: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  taskLoc: { marginTop: 8, fontSize: 13, color: Colors.textSecondary },
  viewTaskBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewTaskBtnText: { color: '#FFFFFF', fontWeight: '800' },

  disCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disMeta: { marginTop: 8, fontSize: 13, color: Colors.textSecondary },
  needBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  needBadgeText: { fontSize: 11, fontWeight: '800', color: '#9A3412' },
  respondBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  respondBtnText: { color: '#FFFFFF', fontWeight: '800' },
});
