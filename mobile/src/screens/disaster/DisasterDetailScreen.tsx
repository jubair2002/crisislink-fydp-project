import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { STATUS_LABELS, SEVERITY_LABELS } from '../../constants/disasterUi';
import { DISASTER_TYPE_OPTIONS } from '../../types/profile';
import { disasterStyles } from './disasterStyles';
import {
  getDisasterById,
  getDisasterMedia,
  getDisasterUpdates,
} from '../../services/disasterService';
import { useAuthStore } from '../../store/authStore';
import { getVolunteerProfile } from '../../services/profileService';
import { useToastStore } from '../../store/toastStore';
import type { DisasterMediaRow, DisasterRow, DisasterUpdateRow } from '../../types/disaster';
import { createTask } from '../../services/taskService';

const TASK_TYPES = [
  { key: 'search_rescue', label: 'Search & Rescue' },
  { key: 'medical_assistance', label: 'Medical Assistance' },
  { key: 'food_distribution', label: 'Food Distribution' },
  { key: 'logistics_support', label: 'Logistics Support' },
];

export default function DisasterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [disaster, setDisaster] = useState<DisasterRow | null>(null);
  const [media, setMedia] = useState<DisasterMediaRow[]>([]);
  const [updates, setUpdates] = useState<DisasterUpdateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [volunteerApproved, setVolunteerApproved] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [d, m, u, v] = await Promise.all([
        getDisasterById(id),
        getDisasterMedia(id),
        getDisasterUpdates(id),
        user?.id ? getVolunteerProfile(user.id) : Promise.resolve(null),
      ]);
      setDisaster(d);
      setMedia(m);
      setUpdates(u);
      setVolunteerApproved(
        profile?.role === 'volunteer' && v?.verification_status === 'approved',
      );
    } catch {
      setDisaster(null);
    } finally {
      setLoading(false);
    }
  }, [id, profile?.role, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeLabel =
    DISASTER_TYPE_OPTIONS.find((t) => t.value === disaster?.disaster_type)?.label ??
    String(disaster?.disaster_type ?? '');

  const requestHelp = () => {
    showToast('Nearby responders have been alerted — stay safe.');
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${disaster?.latitude},${disaster?.longitude}`,
    );
  };

  const openCreateTaskPicker = () => {
    if (!disaster) return;
    if (creatingTask) return;

    Alert.alert(
      'Create Response Task',
      'Select task type for auto-assignment:',
      [
        ...TASK_TYPES.map((taskType) => ({
          text: taskType.label,
          onPress: () => {
            void (async () => {
              setCreatingTask(true);
              try {
                await createTask({
                  disaster_id: disaster.id,
                  task_type: taskType.key,
                  priority: disaster.severity,
                  required_volunteers: 1,
                });
                showToast('Task created and auto-assignment started.');
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Could not create task.');
              } finally {
                setCreatingTask(false);
              }
            })();
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[disasterStyles.screenBg, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!disaster) {
    return (
      <SafeAreaView style={[disasterStyles.screenBg, styles.center]} edges={['top']}>
        <Text style={styles.muted}>Disaster not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={disasterStyles.screenBgWhite} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={disasterStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={disasterStyles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={disasterStyles.headerTitle}>Disaster detail</Text>
      </View>

      <ScrollView contentContainerStyle={disasterStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[disasterStyles.card, { gap: 10 }]}>
          <Text style={styles.tag}>{typeLabel}</Text>
          <Text style={styles.h1}>{SEVERITY_LABELS[disaster.severity]} severity</Text>
          <Text style={disasterStyles.muted}>
            Status:{' '}
            <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>
              {STATUS_LABELS[disaster.status] ?? disaster.status}
            </Text>
          </Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${disaster.latitude},${disaster.longitude}`,
              )
            }
          >
            <Text style={styles.mapLink}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />{' '}
              {disaster.location_label ??
                `${disaster.latitude.toFixed(4)}, ${disaster.longitude.toFixed(4)}`}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Description</Text>
        <View style={disasterStyles.card}>
          <Text style={styles.body}>{disaster.description}</Text>
        </View>

        {media.length > 0 && (
          <>
            <Text style={styles.section}>Photos & media</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {media.map((m) =>
                m.media_type === 'photo' ? (
                  <Image key={m.id} source={{ uri: m.public_url ?? m.file_url }} style={styles.photo} />
                ) : (
                  <View key={m.id} style={[styles.photo, styles.videoPh]}>
                    <Ionicons name="videocam" size={32} color="#FFFFFF" />
                  </View>
                ),
              )}
            </ScrollView>
          </>
        )}

        <View style={styles.rowBtns}>
          {profile?.role === 'citizen' ? (
            <TouchableOpacity style={[disasterStyles.primaryBtn, { flex: 1 }]} onPress={requestHelp}>
              <LinearGradient colors={['#2563EB', '#1D4ED8']} style={disasterStyles.primaryBtnGradientWrap}>
                <Text style={disasterStyles.primaryBtnText}>Request help</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          {volunteerApproved ? (
            <TouchableOpacity
              style={[disasterStyles.outlineBtn, { flex: 1 }]}
              onPress={() => router.push(`/(main)/disasters/verify/${disaster.id}`)}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
              <Text style={disasterStyles.outlineBtnText}>Verify disaster</Text>
            </TouchableOpacity>
          ) : null}
          {(profile?.role === 'admin' || profile?.role === 'authority') && disaster.status === 'verified' ? (
            <TouchableOpacity
              style={[disasterStyles.outlineBtn, { flex: 1, opacity: creatingTask ? 0.7 : 1 }]}
              onPress={openCreateTaskPicker}
              disabled={creatingTask}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={disasterStyles.outlineBtnText}>
                {creatingTask ? 'Creating...' : 'Create task'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.timelineHead}>
          <Text style={styles.section}>Timeline</Text>
          <TouchableOpacity onPress={() => router.push(`/(main)/disasters/timeline/${disaster.id}`)}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={disasterStyles.card}>
          {updates.length === 0 ? (
            <Text style={disasterStyles.muted}>No updates yet.</Text>
          ) : (
            updates.slice(-5).map((u) => (
              <View key={u.id} style={styles.upRow}>
                <View style={styles.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.upBody}>{u.body_text}</Text>
                  <Text style={styles.upTime}>{new Date(u.created_at).toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  muted: { color: Colors.textSecondary },
  link: { color: Colors.primary, fontWeight: '700' },

  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  h1: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  mapLink: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 4 },

  section: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 6,
  },
  body: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },

  photo: {
    width: 140,
    height: 100,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  videoPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },

  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8, flexWrap: 'wrap' },

  timelineHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  seeAll: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  upRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  upBody: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  upTime: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
});
