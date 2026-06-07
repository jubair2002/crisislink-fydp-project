import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '../../constants/themes';
import { DISASTER_TYPE_OPTIONS, type DisasterType } from '../../types/profile';
import { Input } from '../../components/Input';
import { useDisasterStyles } from './disasterStyles';
import { createReport, getDuplicateNearby, uploadMedia } from '../../services/disasterService';
import type { DisasterRow } from '../../types/disaster';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_ORDER: Severity[] = ['low', 'medium', 'high', 'critical'];

const createStyles = (c: ThemeColors) => ({
  dropdown: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: c.inputBg,
    marginBottom: 4,
  },
  dropdownText: { fontSize: 15, fontWeight: '600' as const, color: c.textPrimary },
  locRow: { flexDirection: 'row' as const, gap: 10 },

  segment: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 8,
  },
  segChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
  },
  segChipOn: {
    borderColor: c.primary,
    backgroundColor: c.primarySurface,
  },
  segLabel: { fontSize: 13, fontWeight: '600' as const, color: c.textSecondary },
  segLabelOn: { color: c.primary },

  mediaActions: { flexDirection: 'row' as const, gap: 10, marginBottom: 12 },
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
  mediaBtnText: { fontSize: 14, fontWeight: '700' as const, color: c.primary },

  thumbRow: { marginBottom: 12 },
  thumbWrap: { marginRight: 10 },
  thumb: { width: 88, height: 88, borderRadius: 12 },
  thumbX: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    backgroundColor: c.overlay,
    borderRadius: 12,
  },

  videoBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.primarySurface,
    marginBottom: 12,
  },
  videoBadgeText: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: c.textPrimary },
  removeVid: { fontSize: 14, fontWeight: '700' as const, color: c.danger },

  progressOuter: {
    height: 8,
    borderRadius: 6,
    backgroundColor: c.skeleton,
    overflow: 'hidden' as const,
    marginBottom: 14,
  },
  progressInner: {
    height: '100%' as const,
    backgroundColor: c.primary,
    borderRadius: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end' as const,
    paddingBottom: 24,
  },
  modalSheet: {
    marginHorizontal: 16,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%' as const,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' as const, color: c.textPrimary, marginBottom: 12 },
  modalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  modalRowOn: { backgroundColor: c.primarySurface },
  modalRowText: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: c.textPrimary },

  dupBackdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center' as const,
    padding: 24,
  },
  dupCard: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  dupTitle: { fontSize: 18, fontWeight: '800' as const, color: c.textPrimary, textAlign: 'center' as const },
  dupBody: { fontSize: 14, color: c.textSecondary, lineHeight: 21, textAlign: 'center' as const },
  dupSecondary: { alignItems: 'center' as const, paddingVertical: 8 },
  dupSecondaryText: { fontSize: 15, fontWeight: '700' as const, color: c.primary },

  fieldErr: { color: c.danger, fontSize: 12, marginBottom: 6, marginLeft: 4 },
});

export default function ReportDisasterScreen() {
  const disasterStyles = useDisasterStyles();
  const styles = useThemedStyles(createStyles);
  const { colors, primaryGradient } = useTheme();

  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{ pickedLat?: string; pickedLng?: string }>();

  const [disasterType, setDisasterType] = useState<DisasterType>('flood');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [loadingLoc, setLoadingLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ description?: string; location?: string }>({});

  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [duplicateRow, setDuplicateRow] = useState<DisasterRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (params.pickedLat != null && params.pickedLng != null) {
        const la = Number(params.pickedLat);
        const ln = Number(params.pickedLng);
        if (!Number.isNaN(la) && !Number.isNaN(ln)) {
          setLat(la);
          setLng(ln);
        }
      }
    }, [params.pickedLat, params.pickedLng]),
  );

  const pickLocation = async () => {
    setError('');
    setLoadingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to report.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      if (fieldErrors.location) setFieldErrors((e) => ({ ...e, location: undefined }));
    } catch {
      setError('Could not read GPS location.');
    } finally {
      setLoadingLoc(false);
    }
  };

  const openMapPicker = () => {
    router.push({
      pathname: '/(main)/disasters/map-picker',
      params:
        lat != null && lng != null
          ? { lat: String(lat), lng: String(lng) }
          : {},
    });
  };

  const pickPhotos = async () => {
    setVideoUri(null);
    const remain = 5 - photos.length;
    if (remain <= 0) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remain,
      quality: 0.85,
    });

    if (res.canceled || !res.assets?.length) return;
    const uris = res.assets.map((a) => a.uri).slice(0, remain);
    setPhotos((prev) => [...prev, ...uris]);
  };

  const pickVideo = async () => {
    setPhotos([]);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.85,
      videoMaxDuration: 120,
    });

    if (res.canceled || !res.assets?.[0]?.uri) return;
    setVideoUri(res.assets[0].uri);
  };

  const removePhotoAt = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    const errs: typeof fieldErrors = {};
    if (lat == null || lng == null) errs.location = 'Choose a location';
    if (description.trim().length < 20) errs.description = 'Describe what happened (min 20 characters)';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const runSubmit = async () => {
    if (!user?.id || lat == null || lng == null) return;

    setSubmitting(true);
    setError('');
    setUploadProgress(0);

    try {
      const row = await createReport({
        reporter_user_id: user.id,
        disaster_type: disasterType,
        latitude: lat,
        longitude: lng,
        severity,
        description: description.trim(),
      });

      const files: { uri: string; mediaType: 'photo' | 'video' }[] = [];
      if (videoUri) files.push({ uri: videoUri, mediaType: 'video' });
      else photos.forEach((uri) => files.push({ uri, mediaType: 'photo' }));

      let done = 0;
      const total = Math.max(files.length, 1);

      for (const f of files) {
        await uploadMedia(row.id, f.uri, f.mediaType, 'report', (ratio) => {
          const slice = (done + ratio) / total;
          setUploadProgress(slice);
        });
        done += 1;
        setUploadProgress(done / total);
      }

      router.replace('/(main)/disasters');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit report.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const attemptSubmit = async () => {
    setError('');
    if (!validateForm()) return;
    if (!user?.id) {
      setError('You must be signed in.');
      return;
    }
    if (lat == null || lng == null) return;

    const dup = await getDuplicateNearby(lat, lng);
    if (dup) {
      setDuplicateRow(dup);
      setDupModalOpen(true);
      return;
    }
    await runSubmit();
  };

  const confirmDuplicateSeparate = async () => {
    setDupModalOpen(false);
    setDuplicateRow(null);
    await runSubmit();
  };

  const labelForType = (t: DisasterType) =>
    DISASTER_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

  return (
    <SafeAreaView style={disasterStyles.screenBgWhite} edges={['top']}>
      <View style={disasterStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={disasterStyles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={disasterStyles.headerTitle}>Report disaster</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={disasterStyles.scrollContent}
        >
          {error !== '' && (
            <View style={disasterStyles.errorBanner}>
              <Text style={disasterStyles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Text style={disasterStyles.sectionLabel}>Disaster type</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setTypeModalOpen(true)}>
            <Text style={styles.dropdownText}>{labelForType(disasterType)}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.chevron} />
          </TouchableOpacity>

          <Text style={[disasterStyles.sectionLabel, { marginTop: 8 }]}>Location</Text>
          {fieldErrors.location ? (
            <Text style={styles.fieldErr}>{fieldErrors.location}</Text>
          ) : null}

          <View style={styles.locRow}>
            <TouchableOpacity
              style={[disasterStyles.outlineBtn, { flex: 1 }]}
              onPress={pickLocation}
              disabled={loadingLoc}
            >
              {loadingLoc ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                  <Text style={disasterStyles.outlineBtnText}>Use my location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[disasterStyles.outlineBtn, { marginTop: 10 }]} onPress={openMapPicker}>
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={disasterStyles.outlineBtnText}>Pick on map</Text>
          </TouchableOpacity>

          {lat != null && lng != null && (
            <Text style={[disasterStyles.muted, { marginTop: 10 }]}>
              Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          )}

          <Text style={[disasterStyles.sectionLabel, { marginTop: 18 }]}>Severity</Text>
          <View style={styles.segment}>
            {SEVERITY_ORDER.map((s) => {
              const active = severity === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={[styles.segChip, active && styles.segChipOn]}
                >
                  <Text style={[styles.segLabel, active && styles.segLabelOn]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Description"
            required
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: undefined });
            }}
            error={fieldErrors.description}
            hint="Minimum 20 characters"
          />

          <Text style={disasterStyles.sectionLabel}>Photos or video</Text>
          <Text style={[disasterStyles.muted, { marginBottom: 10 }]}>
            Up to 5 photos, or one video (not both).
          </Text>

          <View style={styles.mediaActions}>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickPhotos} disabled={!!videoUri}>
              <Ionicons name="images-outline" size={20} color={colors.primary} />
              <Text style={styles.mediaBtnText}>Add photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo} disabled={photos.length > 0}>
              <Ionicons name="videocam-outline" size={20} color={colors.primary} />
              <Text style={styles.mediaBtnText}>Add video</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {photos.map((uri, idx) => (
                <View key={uri + idx} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} />
                  <TouchableOpacity style={styles.thumbX} onPress={() => removePhotoAt(idx)}>
                    <Ionicons name="close-circle" size={22} color={colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {videoUri ? (
            <View style={styles.videoBadge}>
              <Ionicons name="film-outline" size={18} color={colors.primary} />
              <Text style={styles.videoBadgeText}>1 video selected</Text>
              <TouchableOpacity onPress={() => setVideoUri(null)}>
                <Text style={styles.removeVid}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {(submitting || uploadProgress > 0) && (
            <View style={styles.progressOuter}>
              <View style={[styles.progressInner, { width: `${Math.round(uploadProgress * 100)}%` }]} />
            </View>
          )}

          <TouchableOpacity
            style={[disasterStyles.primaryBtn, submitting && { opacity: 0.75 }]}
            onPress={() => void attemptSubmit()}
            disabled={submitting}
            activeOpacity={0.88}
          >
            <LinearGradient colors={primaryGradient} style={disasterStyles.primaryBtnGradientWrap}>
              {submitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={disasterStyles.primaryBtnText}>Submit report</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={typeModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setTypeModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Disaster type</Text>
            {DISASTER_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalRow, disasterType === opt.value && styles.modalRowOn]}
                onPress={() => {
                  setDisasterType(opt.value);
                  setTypeModalOpen(false);
                }}
              >
                <Ionicons name={opt.icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={colors.primary} />
                <Text style={styles.modalRowText}>{opt.label}</Text>
                {disasterType === opt.value ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={dupModalOpen} transparent animationType="fade">
        <View style={styles.dupBackdrop}>
          <View style={styles.dupCard}>
            <Ionicons name="warning-outline" size={40} color={colors.warning} style={{ alignSelf: 'center' }} />
            <Text style={styles.dupTitle}>Similar report nearby</Text>
            <Text style={styles.dupBody}>
              A similar disaster was already reported nearby in the last 30 minutes. Do you want to add to that
              report instead?
            </Text>
            <TouchableOpacity
              style={disasterStyles.primaryBtn}
              onPress={() => {
                setDupModalOpen(false);
                if (duplicateRow?.id) router.replace(`/(main)/disasters/detail/${duplicateRow.id}`);
              }}
            >
              <LinearGradient colors={primaryGradient} style={disasterStyles.primaryBtnGradientWrap}>
                <Text style={disasterStyles.primaryBtnText}>View existing</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dupSecondary} onPress={() => void confirmDuplicateSeparate()}>
              <Text style={styles.dupSecondaryText}>Report separately</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
