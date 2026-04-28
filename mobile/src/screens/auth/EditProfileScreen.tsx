import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '../../constants/colors';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/authStore';
import {
  getCitizenProfile,
  updateCitizenProfile,
  uploadProfilePhoto,
} from '../../services/profileService';
import type { Profile } from '../../types/auth';

type EditableField = 'name' | 'phone' | 'address' | 'city' | 'emergency_contact' | 'bio';

const EDITABLE_FIELDS: EditableField[] = ['name', 'phone', 'address', 'city', 'emergency_contact', 'bio'];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 800;

export default function EditProfileScreen() {
  const { user, profile, setProfile } = useAuthStore();

  const [form, setForm] = useState<Record<EditableField, string>>({
    name: '',
    phone: '',
    address: '',
    city: '',
    emergency_contact: '',
    bio: '',
  });
  const [photoLocal, setPhotoLocal] = useState<string | undefined>();
  const [photoRemote, setPhotoRemote] = useState<string | undefined>();
  const [photoUploading, setPhotoUploading] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EditableField, string>>>({});

  const lastServerForm = useRef<Record<EditableField, string> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!profile) return;
    const next: Record<EditableField, string> = {
      name: profile.name ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      city: profile.city ?? '',
      emergency_contact: profile.emergency_contact ?? '',
      bio: profile.bio ?? '',
    };
    setForm(next);
    setPhotoRemote(profile.profile_photo_url);
    lastServerForm.current = next;
  }, [profile?.user_id]);

  // Debounced auto-save whenever form changes
  useEffect(() => {
    if (!user) return;
    if (!lastServerForm.current) return;

    const baseline = lastServerForm.current;
    const dirtyKeys = EDITABLE_FIELDS.filter((k) => form[k] !== baseline[k]);
    if (dirtyKeys.length === 0) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      // Validate before saving
      const errs: Partial<Record<EditableField, string>> = {};
      if (!form.name.trim()) errs.name = 'Name is required';
      if (form.phone && !/^[+\d][\d\s\-()]{6,}$/.test(form.phone.trim()))
        errs.phone = 'Enter a valid phone number';
      if (form.emergency_contact && !/^[+\d][\d\s\-()]{6,}$/.test(form.emergency_contact.trim()))
        errs.emergency_contact = 'Enter a valid phone number';
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        setSaveState('error');
        setErrorMsg('Fix the highlighted fields before saving.');
        return;
      }

      if (inFlight.current) return;
      inFlight.current = true;
      setSaveState('saving');
      setErrorMsg('');
      try {
        const payload: Record<string, unknown> = {};
        for (const k of dirtyKeys) payload[k] = form[k].trim();

        const updated = await updateCitizenProfile(user.id, payload);
        lastServerForm.current = { ...form };
        setProfile(updated as Profile);
        setSaveState('saved');
        setTimeout(() => {
          setSaveState((s) => (s === 'saved' ? 'idle' : s));
        }, 1800);
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Could not save changes.');
        setSaveState('error');
      } finally {
        inFlight.current = false;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, user?.id]);

  const onChange = (key: EditableField, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) {
      const next = { ...fieldErrors };
      delete next[key];
      setFieldErrors(next);
    }
  };

  const pickPhoto = async () => {
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
      setPhotoLocal(localUri);
      setPhotoUploading(true);
      try {
        const url = await uploadProfilePhoto(user.id, localUri);
        setPhotoRemote(url);
        const refreshed = await getCitizenProfile(user.id);
        if (refreshed) setProfile(refreshed);
      } catch (e: unknown) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Photo upload failed.');
      } finally {
        setPhotoUploading(false);
      }
    } catch (e: unknown) {
      Alert.alert('Photo error', e instanceof Error ? e.message : 'Could not pick photo.');
    }
  };

  const photoUri = photoLocal ?? photoRemote;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.replace('/(main)/profile')}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit profile</Text>
        <SaveBadge state={saveState} />
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
          {errorMsg !== '' && saveState === 'error' && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.photoBlock}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.photoCircle}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              ) : (
                <Ionicons name="person" size={42} color={Colors.primary} />
              )}
              {photoUploading && (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickPhoto} style={styles.photoBtn} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={14} color={Colors.primary} />
              <Text style={styles.photoBtnText}>{photoUri ? 'Change photo' : 'Add photo'}</Text>
            </TouchableOpacity>
            <Text style={styles.photoEmail}>{profile?.email}</Text>
          </View>

          <Input
            label="Full name"
            required
            value={form.name}
            onChangeText={(t) => onChange('name', t)}
            error={fieldErrors.name}
            autoCapitalize="words"
          />
          <Input
            label="Phone number"
            value={form.phone}
            onChangeText={(t) => onChange('phone', t)}
            keyboardType="phone-pad"
            error={fieldErrors.phone}
          />
          <Input
            label="Address"
            value={form.address}
            onChangeText={(t) => onChange('address', t)}
          />
          <Input
            label="City"
            value={form.city}
            onChangeText={(t) => onChange('city', t)}
            autoCapitalize="words"
          />
          <Input
            label="Emergency contact"
            hint="Phone number for emergency contact"
            value={form.emergency_contact}
            onChangeText={(t) => onChange('emergency_contact', t)}
            keyboardType="phone-pad"
            error={fieldErrors.emergency_contact}
          />
          <Input
            label="Bio"
            hint="Optional — short bio about yourself"
            value={form.bio}
            onChangeText={(t) => onChange('bio', t)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.autosaveNote}>
            Changes are saved automatically as you type.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return <View style={{ width: 90 }} />;
  if (state === 'saving') {
    return (
      <View style={[styles.saveBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={[styles.saveBadgeText, { color: Colors.primary }]}>Saving…</Text>
      </View>
    );
  }
  if (state === 'saved') {
    return (
      <View style={[styles.saveBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
        <Text style={[styles.saveBadgeText, { color: Colors.success }]}>Saved</Text>
      </View>
    );
  }
  return (
    <View style={[styles.saveBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
      <Ionicons name="close-circle" size={14} color={Colors.danger} />
      <Text style={[styles.saveBadgeText, { color: Colors.danger }]}>Error</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },

  saveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 90,
    justifyContent: 'center',
  },
  saveBadgeText: { fontSize: 12, fontWeight: '700' },

  scrollContent: { padding: 24, paddingBottom: 48 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: { color: Colors.danger, fontSize: 13, fontWeight: '500', flex: 1 },

  photoBlock: { alignItems: 'center', marginBottom: 24, gap: 8 },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  photoBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  photoEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  autosaveNote: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
  },
});
