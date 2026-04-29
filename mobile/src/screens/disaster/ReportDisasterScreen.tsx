import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { DISASTER_TYPE_OPTIONS, type DisasterType } from '../../types/profile';
import { Input } from '../../components/Input';
import { disasterStyles } from './disasterStyles';
import { createReport, getDuplicateNearby, uploadMedia } from '../../services/disasterService';
import type { DisasterRow } from '../../types/disaster';
import { useAuthStore } from '../../store/authStore';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_ORDER: Severity[] = ['low', 'medium', 'high', 'critical'];

export default function ReportDisasterScreen() {
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={disasterStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={disasterStyles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
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
            <Ionicons name="chevron-down" size={20} color="#94A3B8" />
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
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
                  <Text style={disasterStyles.outlineBtnText}>Use my location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[disasterStyles.outlineBtn, { marginTop: 10 }]} onPress={openMapPicker}>
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
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
              <Ionicons name="images-outline" size={20} color={Colors.primary} />
              <Text style={styles.mediaBtnText}>Add photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo} disabled={photos.length > 0}>
              <Ionicons name="videocam-outline" size={20} color={Colors.primary} />
              <Text style={styles.mediaBtnText}>Add video</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {photos.map((uri, idx) => (
                <View key={uri + idx} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} />
                  <TouchableOpacity style={styles.thumbX} onPress={() => removePhotoAt(idx)}>
                    <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {videoUri ? (
            <View style={styles.videoBadge}>
              <Ionicons name="film-outline" size={18} color={Colors.primary} />
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
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={disasterStyles.primaryBtnGradientWrap}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
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
                <Ionicons name={opt.icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={Colors.primary} />
                <Text style={styles.modalRowText}>{opt.label}</Text>
                {disasterType === opt.value ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={dupModalOpen} transparent animationType="fade">
        <View style={styles.dupBackdrop}>
          <View style={styles.dupCard}>
            <Ionicons name="warning-outline" size={40} color={Colors.warning} style={{ alignSelf: 'center' }} />
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
              <LinearGradient colors={['#2563EB', '#1D4ED8']} style={disasterStyles.primaryBtnGradientWrap}>
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

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 4,
  },
  dropdownText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  locRow: { flexDirection: 'row', gap: 10 },

  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  segChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  segChipOn: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  segLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segLabelOn: { color: Colors.primary },

  mediaActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  mediaBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  thumbRow: { marginBottom: 12 },
  thumbWrap: { marginRight: 10 },
  thumb: { width: 88, height: 88, borderRadius: 12 },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
  },

  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  videoBadgeText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  removeVid: { fontSize: 14, fontWeight: '700', color: Colors.danger },

  progressOuter: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressInner: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  modalSheet: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  modalRowOn: { backgroundColor: '#EFF6FF' },
  modalRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },

  dupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  dupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  dupTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  dupBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, textAlign: 'center' },
  dupSecondary: { alignItems: 'center', paddingVertical: 8 },
  dupSecondaryText: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  fieldErr: { color: Colors.danger, fontSize: 12, marginBottom: 6, marginLeft: 4 },
});
