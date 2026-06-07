import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore, type VolunteerDraft } from '../../store/profileStore';
import {
  AVAILABILITY_OPTIONS,
  DISASTER_TYPE_OPTIONS,
  GENDER_OPTIONS,
  SKILL_OPTIONS,
  type DocumentKind,
  type DisasterType,
  type VolunteerSkill,
} from '../../types/profile';
import {
  createVolunteerProfile,
  uploadDocument,
  uploadProfilePhoto,
} from '../../services/profileService';
import { getProfile } from '../../services/authService';

const TOTAL_STEPS = 5;

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Personal info', subtitle: 'Tell us a bit about yourself.' },
  2: { title: 'Skills', subtitle: 'Pick the areas where you can help.' },
  3: { title: 'Availability', subtitle: 'When are you typically free to respond?' },
  4: { title: 'Experience', subtitle: 'Have you done disaster work before?' },
  5: { title: 'Documents', subtitle: 'Upload verification documents (optional).' },
};

type FieldErrors = Record<string, string>;

export default function VolunteerProfileForm() {
  const { colors, primaryGradient } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, profile, setProfile: setAuthProfile } = useAuthStore();
  const { volunteerDraft, updateVolunteerField, resetVolunteerDraft } = useProfileStore();

  const [step, setStep] = useState<number>(volunteerDraft.currentStep || 1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [docProgress, setDocProgress] = useState<Record<DocumentKind, number>>({
    national_id: 0,
    volunteer_cert: 0,
    org_proof: 0,
  });
  const [docUploading, setDocUploading] = useState<DocumentKind | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // Hydrate phone/address from existing profile if draft is empty.
  useEffect(() => {
    if (!profile) return;
    if (!volunteerDraft.phone && profile.phone) updateVolunteerField('phone', profile.phone);
    if (!volunteerDraft.address && profile.address)
      updateVolunteerField('address', profile.address);
    if (!volunteerDraft.profile_photo_url && profile.profile_photo_url)
      updateVolunteerField('profile_photo_url', profile.profile_photo_url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id]);

  const setDraft = <K extends keyof VolunteerDraft>(key: K, value: VolunteerDraft[K]) =>
    updateVolunteerField(key, value);

  const clearErr = (key: string) => {
    if (fieldErrors[key]) {
      const next = { ...fieldErrors };
      delete next[key];
      setFieldErrors(next);
    }
  };

  // ── Validation per step ────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: FieldErrors = {};
    if (s === 1) {
      if (!volunteerDraft.phone.trim()) errs.phone = 'Phone is required';
      else if (!/^[+\d][\d\s\-()]{6,}$/.test(volunteerDraft.phone.trim()))
        errs.phone = 'Enter a valid phone number';
      if (!volunteerDraft.address.trim()) errs.address = 'Address is required';
      const ageNum = Number(volunteerDraft.age);
      if (!volunteerDraft.age.trim()) errs.age = 'Age is required';
      else if (Number.isNaN(ageNum) || ageNum < 16 || ageNum > 100)
        errs.age = 'Age must be between 16 and 100';
      if (!volunteerDraft.gender) errs.gender = 'Please select an option';
    }
    if (s === 2) {
      if (volunteerDraft.skills.length === 0) errs.skills = 'Pick at least one skill';
    }
    if (s === 3) {
      if (!volunteerDraft.availability) errs.availability = 'Choose an availability';
      if (!volunteerDraft.working_hours.trim())
        errs.working_hours = 'Working hours are required';
      if (volunteerDraft.preferred_disaster_types.length === 0)
        errs.preferred_disaster_types = 'Pick at least one disaster type';
    }
    if (s === 4) {
      if (volunteerDraft.has_previous_experience) {
        const yrs = Number(volunteerDraft.years_of_experience);
        if (!volunteerDraft.years_of_experience.trim())
          errs.years_of_experience = 'Years of experience required';
        else if (Number.isNaN(yrs) || yrs < 0 || yrs > 60)
          errs.years_of_experience = 'Enter a valid number';
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      shake();
      return;
    }
    const next = Math.min(step + 1, TOTAL_STEPS);
    setStep(next);
    setDraft('currentStep', next);
    setError('');
    setFieldErrors({});
  };

  const goBack = () => {
    if (step === 1) {
      router.back();
      return;
    }
    const prev = Math.max(step - 1, 1);
    setStep(prev);
    setDraft('currentStep', prev);
    setError('');
    setFieldErrors({});
  };

  // ── Photo & document uploads ──────────────────────────────────────────
  const pickProfilePhoto = async () => {
    if (!user) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const localUri = result.assets[0].uri;
      setDraft('profile_photo_local', localUri);
      setPhotoUploading(true);
      try {
        const url = await uploadProfilePhoto(user.id, localUri);
        setDraft('profile_photo_url', url);
      } catch (e: unknown) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Photo upload failed.');
      } finally {
        setPhotoUploading(false);
      }
    } catch (e: unknown) {
      Alert.alert('Photo error', e instanceof Error ? e.message : 'Could not pick photo.');
    }
  };

  const pickDocument = async (kind: DocumentKind) => {
    if (!user) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      setDocUploading(kind);
      setDocProgress((p) => ({ ...p, [kind]: 0 }));
      const url = await uploadDocument(user.id, kind, uri, (progress) =>
        setDocProgress((p) => ({ ...p, [kind]: progress })),
      );
      if (kind === 'national_id') setDraft('national_id_url', url);
      if (kind === 'volunteer_cert') setDraft('volunteer_cert_url', url);
      if (kind === 'org_proof') setDraft('org_proof_url', url);
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload document.');
    } finally {
      setDocUploading(null);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user) {
      setError('You are not signed in.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createVolunteerProfile(user.id, {
        phone: volunteerDraft.phone.trim(),
        address: volunteerDraft.address.trim(),
        age: Number(volunteerDraft.age),
        gender: volunteerDraft.gender,
        profile_photo_url: volunteerDraft.profile_photo_url,
        skills: volunteerDraft.skills,
        availability: volunteerDraft.availability as Exclude<VolunteerDraft['availability'], ''>,
        working_hours: volunteerDraft.working_hours.trim(),
        preferred_disaster_types: volunteerDraft.preferred_disaster_types,
        has_previous_experience: volunteerDraft.has_previous_experience,
        years_of_experience: volunteerDraft.has_previous_experience
          ? Number(volunteerDraft.years_of_experience || 0)
          : 0,
        organization: volunteerDraft.organization.trim() || undefined,
        national_id_url: volunteerDraft.national_id_url,
        volunteer_cert_url: volunteerDraft.volunteer_cert_url,
        org_proof_url: volunteerDraft.org_proof_url,
      });

      const fresh = await getProfile(user.id);
      if (fresh) setAuthProfile(fresh);

      resetVolunteerDraft();

      Alert.alert(
        'Application submitted',
        'Your volunteer application is under review. We\u2019ll notify you once it\u2019s approved.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(main)/'),
          },
        ],
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit your application.');
      shake();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const progressPct = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  return (
    <SafeAreaView style={styles.root}>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepCount}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{STEP_TITLES[step].title}</Text>
            <Text style={styles.subtitle}>{STEP_TITLES[step].subtitle}</Text>
          </View>

          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
            {error !== '' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {step === 1 && (
              <Step1Personal
                draft={volunteerDraft}
                fieldErrors={fieldErrors}
                onChange={(k, v) => {
                  setDraft(k, v as never);
                  clearErr(k as string);
                }}
                onPickPhoto={pickProfilePhoto}
                photoUploading={photoUploading}
              />
            )}
            {step === 2 && (
              <Step2Skills
                selected={volunteerDraft.skills}
                error={fieldErrors.skills}
                onChange={(skills) => {
                  setDraft('skills', skills);
                  clearErr('skills');
                }}
              />
            )}
            {step === 3 && (
              <Step3Availability
                draft={volunteerDraft}
                fieldErrors={fieldErrors}
                onChange={(k, v) => {
                  setDraft(k, v as never);
                  clearErr(k as string);
                }}
              />
            )}
            {step === 4 && (
              <Step4Experience
                draft={volunteerDraft}
                fieldErrors={fieldErrors}
                onChange={(k, v) => {
                  setDraft(k, v as never);
                  clearErr(k as string);
                }}
              />
            )}
            {step === 5 && (
              <Step5Documents
                draft={volunteerDraft}
                progress={docProgress}
                uploading={docUploading}
                onPick={pickDocument}
              />
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={goBack} style={styles.backFooterBtn} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
            <Text style={styles.backFooterText}>Back</Text>
          </TouchableOpacity>

          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={goNext}
              activeOpacity={0.88}
            >
              <LinearGradient colors={primaryGradient} style={styles.nextBtnGradient}>
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.88}
            >
              <LinearGradient colors={primaryGradient} style={styles.nextBtnGradient}>
                {submitting ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>Submit Application</Text>
                    <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 1 — Personal info
// ─────────────────────────────────────────────────────────────────────────
function Step1Personal({
  draft,
  fieldErrors,
  onChange,
  onPickPhoto,
  photoUploading,
}: {
  draft: VolunteerDraft;
  fieldErrors: FieldErrors;
  onChange: <K extends keyof VolunteerDraft>(key: K, value: VolunteerDraft[K]) => void;
  onPickPhoto: () => void;
  photoUploading: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const photoUri = draft.profile_photo_local ?? draft.profile_photo_url;
  return (
    <View>
      <Text style={styles.sectionLabel}>Profile photo (optional)</Text>
      <View style={styles.photoRow}>
        <TouchableOpacity onPress={onPickPhoto} activeOpacity={0.85} style={styles.photoCircle}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
          ) : (
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
          )}
          {photoUploading && (
            <View style={styles.photoOverlay}>
              <ActivityIndicator color={colors.onPrimary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onPickPhoto} style={styles.photoBtn} activeOpacity={0.85}>
            <Ionicons name="image-outline" size={16} color={colors.primary} />
            <Text style={styles.photoBtnText}>{photoUri ? 'Change photo' : 'Choose photo'}</Text>
          </TouchableOpacity>
          <Text style={styles.photoHint}>JPG or PNG, up to 5 MB.</Text>
        </View>
      </View>

      <Input
        label="Phone number"
        required
        value={draft.phone}
        onChangeText={(t) => onChange('phone', t)}
        keyboardType="phone-pad"
        error={fieldErrors.phone}
      />
      <Input
        label="Address"
        required
        value={draft.address}
        onChangeText={(t) => onChange('address', t)}
        error={fieldErrors.address}
      />
      <Input
        label="Age"
        required
        value={draft.age}
        onChangeText={(t) => onChange('age', t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        error={fieldErrors.age}
      />

      <Text style={styles.sectionLabel}>Gender</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((g) => {
          const active = draft.gender === g.value;
          return (
            <TouchableOpacity
              key={g.value}
              onPress={() => onChange('gender', g.value)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {fieldErrors.gender ? <Text style={styles.fieldError}>{fieldErrors.gender}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 2 — Skills
// ─────────────────────────────────────────────────────────────────────────
function Step2Skills({
  selected,
  error,
  onChange,
}: {
  selected: VolunteerSkill[];
  error?: string;
  onChange: (next: VolunteerSkill[]) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toggle = (s: VolunteerSkill) => {
    if (selected.includes(s)) onChange(selected.filter((x) => x !== s));
    else onChange([...selected, s]);
  };
  return (
    <View>
      <Text style={styles.helperLine}>
        Choose all that apply — you can update these later.
      </Text>
      <View style={{ gap: 10 }}>
        {SKILL_OPTIONS.map((s) => {
          const active = selected.includes(s.value);
          return (
            <TouchableOpacity
              key={s.value}
              onPress={() => toggle(s.value)}
              activeOpacity={0.85}
              style={[styles.checkRow, active && styles.checkRowActive]}
            >
              <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                {active && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
              </View>
              <Ionicons
                name={s.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={active ? colors.primary : colors.iconMuted}
              />
              <Text style={[styles.checkLabel, active && { color: colors.primary }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 3 — Availability
// ─────────────────────────────────────────────────────────────────────────
function Step3Availability({
  draft,
  fieldErrors,
  onChange,
}: {
  draft: VolunteerDraft;
  fieldErrors: FieldErrors;
  onChange: <K extends keyof VolunteerDraft>(key: K, value: VolunteerDraft[K]) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toggleType = (t: DisasterType) => {
    if (draft.preferred_disaster_types.includes(t))
      onChange(
        'preferred_disaster_types',
        draft.preferred_disaster_types.filter((x) => x !== t),
      );
    else onChange('preferred_disaster_types', [...draft.preferred_disaster_types, t]);
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Availability</Text>
      <View style={{ gap: 10 }}>
        {AVAILABILITY_OPTIONS.map((a) => {
          const active = draft.availability === a.value;
          return (
            <TouchableOpacity
              key={a.value}
              onPress={() => onChange('availability', a.value)}
              activeOpacity={0.85}
              style={[styles.radioRow, active && styles.radioRowActive]}
            >
              <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                {active && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioLabel, active && { color: colors.primary }]}>
                  {a.label}
                </Text>
                <Text style={styles.radioDesc}>{a.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {fieldErrors.availability ? (
        <Text style={styles.fieldError}>{fieldErrors.availability}</Text>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Input
          label="Working hours"
          required
          placeholder="e.g. 9:00 AM – 5:00 PM, weekends only"
          value={draft.working_hours}
          onChangeText={(t) => onChange('working_hours', t)}
          error={fieldErrors.working_hours}
        />
      </View>

      <Text style={styles.sectionLabel}>Preferred disaster types</Text>
      <View style={styles.tagWrap}>
        {DISASTER_TYPE_OPTIONS.map((d) => {
          const active = draft.preferred_disaster_types.includes(d.value);
          return (
            <TouchableOpacity
              key={d.value}
              onPress={() => toggleType(d.value)}
              activeOpacity={0.85}
              style={[styles.tag, active && styles.tagActive]}
            >
              <Ionicons
                name={d.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={active ? colors.primary : colors.iconMuted}
              />
              <Text style={[styles.tagText, active && styles.tagTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {fieldErrors.preferred_disaster_types ? (
        <Text style={styles.fieldError}>{fieldErrors.preferred_disaster_types}</Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 4 — Experience
// ─────────────────────────────────────────────────────────────────────────
function Step4Experience({
  draft,
  fieldErrors,
  onChange,
}: {
  draft: VolunteerDraft;
  fieldErrors: FieldErrors;
  onChange: <K extends keyof VolunteerDraft>(key: K, value: VolunteerDraft[K]) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>Previous disaster work</Text>
          <Text style={styles.toggleDesc}>Have you volunteered in disasters before?</Text>
        </View>
        <Switch
          value={draft.has_previous_experience}
          onValueChange={(v) => onChange('has_previous_experience', v)}
          trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
          thumbColor={draft.has_previous_experience ? colors.primary : colors.switchThumb}
        />
      </View>

      {draft.has_previous_experience && (
        <View style={{ marginTop: 16 }}>
          <Input
            label="Years of experience"
            required
            value={draft.years_of_experience}
            onChangeText={(t) => onChange('years_of_experience', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            error={fieldErrors.years_of_experience}
          />
          <Input
            label="Organization"
            hint="Optional — name of an org you worked with"
            value={draft.organization}
            onChangeText={(t) => onChange('organization', t)}
          />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 5 — Documents
// ─────────────────────────────────────────────────────────────────────────
function Step5Documents({
  draft,
  progress,
  uploading,
  onPick,
}: {
  draft: VolunteerDraft;
  progress: Record<DocumentKind, number>;
  uploading: DocumentKind | null;
  onPick: (kind: DocumentKind) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const docs: { kind: DocumentKind; label: string; desc: string; url?: string }[] = [
    { kind: 'national_id', label: 'National ID', desc: 'Govt-issued ID card', url: draft.national_id_url },
    {
      kind: 'volunteer_cert',
      label: 'Volunteer Certificate',
      desc: 'Training or certification proof',
      url: draft.volunteer_cert_url,
    },
    {
      kind: 'org_proof',
      label: 'Organization Proof',
      desc: 'Affiliation letter / ID',
      url: draft.org_proof_url,
    },
  ];

  return (
    <View>
      <Text style={styles.helperLine}>
        All documents are optional. Verified volunteers get priority for tasks.
      </Text>
      <View style={{ gap: 12 }}>
        {docs.map((d) => {
          const isUploading = uploading === d.kind;
          const pct = progress[d.kind];
          const uploaded = !!d.url;
          return (
            <View key={d.kind} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={styles.docIcon}>
                  <Ionicons
                    name={uploaded ? 'document-text' : 'document-text-outline'}
                    size={20}
                    color={uploaded ? colors.success : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>{d.label}</Text>
                  <Text style={styles.docDesc}>{d.desc}</Text>
                </View>
                {uploaded && (
                  <View style={styles.uploadedPill}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.uploadedPillText}>Uploaded</Text>
                  </View>
                )}
              </View>

              {isUploading && (
                <View style={styles.uploadProgressBar}>
                  <View
                    style={[
                      styles.uploadProgressFill,
                      { width: `${Math.max(8, Math.round(pct * 100))}%` },
                    ]}
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={() => onPick(d.kind)}
                disabled={isUploading}
                activeOpacity={0.85}
                style={[styles.docBtn, isUploading && styles.btnDisabled]}
              >
                {isUploading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.docBtnText}>
                      Uploading… {Math.round(pct * 100)}%
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={uploaded ? 'refresh-outline' : 'cloud-upload-outline'}
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.docBtnText}>{uploaded ? 'Replace' : 'Upload file'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.muted,
    },
    stepCount: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },

    progressBar: {
      height: 4,
      marginHorizontal: 24,
      backgroundColor: c.border,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: { height: '100%', backgroundColor: c.primary, borderRadius: 2 },

    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

    titleBlock: { marginTop: 16, marginBottom: 24 },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subtitle: { fontSize: 14, color: c.textSecondary, lineHeight: 21 },

    form: {},

    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.dangerSurface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.dangerSurfaceBorder,
    },
    errorBannerText: { color: c.danger, fontSize: 13, fontWeight: '500', flex: 1 },

    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 10,
      marginLeft: 2,
      marginTop: 4,
    },
    helperLine: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },

    fieldError: {
      fontSize: 12,
      color: c.danger,
      marginTop: 6,
      marginLeft: 4,
      fontWeight: '600',
    },

    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    photoCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.primarySurfaceBorder,
      overflow: 'hidden',
    },
    photoImage: { width: '100%', height: '100%' },
    photoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.primarySurface,
      borderWidth: 1,
      borderColor: c.primarySurfaceBorder,
    },
    photoBtnText: { color: c.primary, fontSize: 13, fontWeight: '700' },
    photoHint: { fontSize: 12, color: c.textSecondary, marginTop: 6 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.primarySurface, borderColor: c.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    chipTextActive: { color: c.primary },

    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    checkRowActive: { borderColor: c.primary, backgroundColor: c.primarySurface },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.iconMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxActive: { backgroundColor: c.primary, borderColor: c.primary },
    checkLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary, flex: 1 },

    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    radioRowActive: { borderColor: c.primary, backgroundColor: c.primarySurface },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: c.iconMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: { borderColor: c.primary },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
    radioLabel: { fontSize: 14, fontWeight: '700', color: c.textPrimary, marginBottom: 2 },
    radioDesc: { fontSize: 12, color: c.textSecondary },

    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    tagActive: { backgroundColor: c.primarySurface, borderColor: c.primary },
    tagText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    tagTextActive: { color: c.primary },

    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    toggleLabel: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    toggleDesc: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    docCard: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    docHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    docIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    docLabel: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    docDesc: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    uploadedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: c.successSurface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.successSurfaceBorder,
    },
    uploadedPillText: { fontSize: 11, fontWeight: '700', color: c.success },
    uploadProgressBar: {
      height: 4,
      backgroundColor: c.border,
      borderRadius: 2,
      marginTop: 12,
      overflow: 'hidden',
    },
    uploadProgressFill: { height: '100%', backgroundColor: c.primary },
    docBtn: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.primarySurface,
      borderWidth: 1,
      borderColor: c.primarySurfaceBorder,
    },
    docBtnText: { color: c.primary, fontSize: 13, fontWeight: '700' },

    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 20 : 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
    backFooterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    backFooterText: { color: c.textPrimary, fontWeight: '700', fontSize: 14 },
    nextBtn: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    nextBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    nextBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
    btnDisabled: { opacity: 0.65 },
  });
