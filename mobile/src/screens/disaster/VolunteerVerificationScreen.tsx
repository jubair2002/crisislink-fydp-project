import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '../../constants/colors';
import { SEVERITY_LABELS } from '../../constants/disasterUi';
import { disasterStyles } from './disasterStyles';
import {
  getDisasterById,
  updateDisasterSeverity,
  uploadMedia,
  verifyDisaster,
} from '../../services/disasterService';
import { useAuthStore } from '../../store/authStore';
import { getVolunteerProfile } from '../../services/profileService';
import type { DisasterRow, DisasterSeverity } from '../../types/disaster';
import { createTask } from '../../services/taskService';

const SEVERITIES: DisasterSeverity[] = ['low', 'medium', 'high', 'critical'];
const TASK_TYPES = [
  { key: 'search_rescue', label: 'Search & Rescue' },
  { key: 'medical_assistance', label: 'Medical Assistance' },
  { key: 'food_distribution', label: 'Food Distribution' },
  { key: 'logistics_support', label: 'Logistics Support' },
];

export default function VolunteerVerificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [disaster, setDisaster] = useState<DisasterRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [severityDraft, setSeverityDraft] = useState<DisasterSeverity>('medium');
  const [uploadPct, setUploadPct] = useState(0);
  const [taskType, setTaskType] = useState('search_rescue');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || !id) return;
      try {
        const [d, v] = await Promise.all([getDisasterById(id), getVolunteerProfile(user.id)]);
        if (cancelled) return;
        const isAdmin = profile?.role === 'admin' || profile?.role === 'authority';
        const isApprovedVolunteer =
          profile?.role === 'volunteer' && v?.verification_status === 'approved';
        const ok = (isAdmin || isApprovedVolunteer) && d !== null;
        if (!ok) {
          Alert.alert('Access denied', 'Only admin/authority or approved volunteers can verify.');
          router.back();
          return;
        }
        setDisaster(d);
        setSeverityDraft(d?.severity ?? 'medium');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, profile?.role, user?.id]);

  const pickVerificationMedia = async () => {
    if (!disaster?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;

    const asset = res.assets[0];
    const uri = asset.uri;
    const clean = uri.split('?')[0];
    const isVideo =
      asset.type === 'video' || /\.(mp4|mov|webm|mkv)$/i.test(clean ?? '');
    setBusy(true);
    setUploadPct(0);
    try {
      await uploadMedia(
        disaster.id,
        uri,
        isVideo ? 'video' : 'photo',
        'verification',
        (r) => setUploadPct(r),
      );
      Alert.alert('Uploaded', 'Verification media attached.');
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
      setUploadPct(0);
    }
  };

  const runVerify = async (outcome: 'verified' | 'rejected') => {
    if (!user?.id || !disaster?.id) return;
    setBusy(true);
    try {
      await verifyDisaster({
        disasterId: disaster.id,
        volunteerUserId: user.id,
        outcome,
        notes: notes.trim() || null,
        severity: outcome === 'verified' ? severityDraft : undefined,
      });
      let taskCreationError: string | null = null;
      if (outcome === 'verified') {
        try {
          await createTask({
            disaster_id: disaster.id,
            task_type: taskType,
            priority: severityDraft,
            required_volunteers: 1,
            autoAssignRadiusKm: 5,
          });
        } catch (taskErr) {
          taskCreationError =
            taskErr instanceof Error ? taskErr.message : 'Unknown task creation error';
          console.warn('[verify] task creation failed:', taskCreationError);
        }
      }

      if (outcome === 'verified' && taskCreationError) {
        Alert.alert(
          'Verified, but task creation failed',
          `Disaster was verified successfully, but no assignment task was created.\n\nReason: ${taskCreationError}`,
        );
      } else {
        Alert.alert(
          outcome === 'verified' ? 'Verified' : 'Rejected',
          outcome === 'verified'
            ? 'Disaster verified and task auto-created for volunteer assignment.'
            : 'Disaster record updated.',
        );
      }
      router.replace(`/(main)/disasters/detail/${disaster.id}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(false);
    }
  };

  const saveSeverityOnly = async () => {
    if (!disaster?.id) return;
    setBusy(true);
    try {
      const row = await updateDisasterSeverity(disaster.id, severityDraft);
      setDisaster(row);
      Alert.alert('Saved', 'Severity updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update severity.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !disaster) {
    return (
      <SafeAreaView style={[disasterStyles.screenBg, styles.center]} edges={['top']}>
        <ActivityIndicator color={Colors.primary} />
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
        <Text style={disasterStyles.headerTitle}>Verify disaster</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={disasterStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={disasterStyles.muted}>
            Adjust severity if needed, attach verification photos or video, then confirm or reject this report.
          </Text>

          <Text style={[disasterStyles.sectionLabel, { marginTop: 16 }]}>Severity</Text>
          <View style={styles.segment}>
            {SEVERITIES.map((s) => {
              const active = severityDraft === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.segChip, active && styles.segChipOn]}
                  onPress={() => setSeverityDraft(s)}
                >
                  <Text style={[styles.segLabel, active && styles.segLabelOn]}>{SEVERITY_LABELS[s]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={disasterStyles.sectionLabel}>Task type after verification</Text>
          <View style={styles.segment}>
            {TASK_TYPES.map((t) => {
              const active = taskType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.segChip, active && styles.segChipOn]}
                  onPress={() => setTaskType(t.key)}
                >
                  <Text style={[styles.segLabel, active && styles.segLabelOn]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={disasterStyles.outlineBtn}
            onPress={() => void saveSeverityOnly()}
            disabled={busy}
          >
            <Ionicons name="save-outline" size={18} color={Colors.primary} />
            <Text style={disasterStyles.outlineBtnText}>Update severity only</Text>
          </TouchableOpacity>

          <Text style={[disasterStyles.sectionLabel, { marginTop: 16 }]}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add verification notes..."
            placeholderTextColor="#94A3B8"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <Text style={[disasterStyles.sectionLabel]}>Verification media</Text>
          <TouchableOpacity
            style={disasterStyles.outlineBtn}
            onPress={() => void pickVerificationMedia()}
            disabled={busy}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
            <Text style={disasterStyles.outlineBtnText}>Upload proof</Text>
          </TouchableOpacity>

          {uploadPct > 0 && uploadPct < 1 && (
            <View style={styles.progressOuter}>
              <View style={[styles.progressInner, { width: `${Math.round(uploadPct * 100)}%` }]} />
            </View>
          )}

          <TouchableOpacity
            style={[disasterStyles.primaryBtn, styles.confirmBtn, busy && { opacity: 0.75 }]}
            disabled={busy}
            onPress={() => void runVerify('verified')}
          >
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={disasterStyles.primaryBtnGradientWrap}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={disasterStyles.primaryBtnText}>Confirm disaster</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rejectBtn, busy && { opacity: 0.75 }]}
            disabled={busy}
            onPress={() => void runVerify('rejected')}
          >
            <Text style={styles.rejectText}>Reject report</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  segChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  segChipOn: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  segLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  segLabelOn: { color: Colors.primary },

  notesInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: 15,
    color: Colors.textPrimary,
  },

  progressOuter: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
    marginTop: 8,
  },
  progressInner: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  confirmBtn: {
    marginTop: 8,
  },

  rejectBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  rejectText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
});
