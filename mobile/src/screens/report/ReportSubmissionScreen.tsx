import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import {
  fetchUserCampaignOptions,
  submitReport,
} from '../../services/reportService';
import { getCurrentLocation } from '../../services/locationService';
import {
  REPORT_TYPE_OPTIONS,
  type ReportType,
} from '../../types/report';
import { ReportScreenShell } from './reportShared';

const MIN_DESCRIPTION = 30;

const createStyles = (c: ThemeColors) => ({
  scroll: { paddingBottom: 32 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: c.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 4,
  },
  radioCard: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: c.card,
  },
  radioCardActive: {
    borderColor: c.primary,
    backgroundColor: c.primarySurface,
  },
  radioTitle: { fontSize: 15, fontWeight: '800' as const, color: c.textPrimary, marginBottom: 4 },
  radioDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 140,
    fontSize: 14,
    lineHeight: 20,
    color: c.textPrimary,
    backgroundColor: c.card,
  },
  charCount: { fontSize: 11, color: c.textSecondary, textAlign: 'right' as const, marginTop: 6 },
  charCountError: { color: c.danger },
  mediaRow: { flexDirection: 'row' as const, gap: 10, marginTop: 4 },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  thumb: { width: 88, height: 88, borderRadius: 12, marginTop: 10 },
  thumbWrap: { position: 'relative' as const, alignSelf: 'flex-start' as const },
  thumbRemove: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: c.overlay,
    borderRadius: 12,
  },
  dropdown: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: c.card,
  },
  dropdownText: { fontSize: 14, fontWeight: '600' as const, color: c.textPrimary, flex: 1 },
  locRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: c.card,
  },
  locText: { flex: 1, fontSize: 13, color: c.textSecondary },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    backgroundColor: c.primary,
  },
  submitText: { color: c.onPrimary, fontWeight: '800' as const, fontSize: 15 },
  historyLink: {
    marginTop: 14,
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  historyText: { color: c.primary, fontWeight: '700' as const, fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' as const, backgroundColor: c.overlay },
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },
  modalTitle: { fontSize: 16, fontWeight: '800' as const, color: c.textPrimary, marginBottom: 12 },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  modalItemText: { fontSize: 14, fontWeight: '600' as const, color: c.textPrimary },
});

export default function ReportSubmissionScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.profile?.role) ?? 'citizen';
  const isVolunteer = role === 'volunteer';

  const [reportType, setReportType] = useState<ReportType>('feedback');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [campaignModal, setCampaignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCampaigns = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await fetchUserCampaignOptions(user.id, isVolunteer);
      setCampaigns(rows);
    } catch {
      setCampaigns([]);
    }
  }, [isVolunteer, user?.id]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) ?? null;
  const descLen = description.trim().length;
  const descValid = descLen >= MIN_DESCRIPTION;

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const detectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        Alert.alert('Location', 'Could not detect your location. Check permissions.');
        return;
      }
      setCoords(loc);
      setLocationLabel(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!descValid) {
      Alert.alert('Description required', `Please enter at least ${MIN_DESCRIPTION} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const report = await submitReport(user.id, {
        report_type: reportType,
        description: description.trim(),
        image_uri: imageUri,
        campaign_id: reportType === 'campaign' ? campaignId : null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location_label: locationLabel,
      });

      Alert.alert(
        'Report submitted',
        reportType === 'feedback'
          ? 'Thank you for your feedback. We will review it soon.'
          : 'Your report has been submitted and routed to the right team.',
        [
          {
            text: 'View report',
            onPress: () => router.replace(`/(main)/report/${report.id}`),
          },
          { text: 'Done', style: 'cancel', onPress: () => router.replace('/(main)/report/history') },
        ],
      );
      setDescription('');
      setImageUri(null);
      setCampaignId(null);
      setCoords(null);
      setLocationLabel(null);
    } catch (e: unknown) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReportScreenShell
      title="Submit Report"
      rightAction={
        <TouchableOpacity onPress={() => router.push('/(main)/report/history')} hitSlop={8}>
          <Ionicons name="time-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Report type</Text>
        {REPORT_TYPE_OPTIONS.map((opt) => {
          const active = reportType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radioCard, active && styles.radioCardActive]}
              onPress={() => setReportType(opt.value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.radioTitle, active && { color: colors.primary }]}>
                {opt.label}
              </Text>
              <Text style={styles.radioDesc}>{opt.description}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          placeholder="Describe the issue or feedback in detail..."
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, !descValid && descLen > 0 && styles.charCountError]}>
          {descLen}/{MIN_DESCRIPTION} min characters
        </Text>

        <Text style={styles.sectionLabel}>Photo (optional)</Text>
        <View style={styles.mediaRow}>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => void pickImage(true)}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => void pickImage(false)}>
            <Ionicons name="images-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Gallery</Text>
          </TouchableOpacity>
        </View>
        {imageUri ? (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: imageUri }} style={styles.thumb} />
            <TouchableOpacity style={styles.thumbRemove} onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ) : null}

        {reportType === 'campaign' ? (
          <>
            <Text style={styles.sectionLabel}>Related campaign (optional)</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setCampaignModal(true)}>
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedCampaign?.title ?? 'Select a campaign'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.chevron} />
            </TouchableOpacity>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Location (optional)</Text>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.locText} numberOfLines={2}>
            {locationLabel ?? 'No location attached'}
          </Text>
          <TouchableOpacity onPress={() => void detectLocation()} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Detect</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitText}>Submit report</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/(main)/report/history')}
        >
          <Text style={styles.historyText}>View my report history</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={campaignModal} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setCampaignModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select campaign</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setCampaignId(null);
                  setCampaignModal(false);
                }}
              >
                <Text style={styles.modalItemText}>None</Text>
              </TouchableOpacity>
              {campaigns.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setCampaignId(c.id);
                    setCampaignModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{c.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ReportScreenShell>
  );
}
