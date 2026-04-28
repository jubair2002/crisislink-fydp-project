import React, { useEffect, useRef, useState } from 'react';
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
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '../../constants/colors';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import {
  getCitizenProfile,
  updateCitizenProfile,
  uploadProfilePhoto,
} from '../../services/profileService';

export default function CitizenProfileForm() {
  const { user, profile: authProfile, setProfile: setAuthProfile } = useAuthStore();
  const { setProfile } = useProfileStore();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [photoLocal, setPhotoLocal] = useState<string | undefined>();
  const [photoRemote, setPhotoRemote] = useState<string | undefined>();

  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // Hydrate fields with anything already saved on the profile
  useEffect(() => {
    if (!authProfile) return;
    setPhone(authProfile.phone ?? '');
    setAddress(authProfile.address ?? '');
    setCity(authProfile.city ?? '');
    setEmergencyContact(authProfile.emergency_contact ?? '');
    setPhotoRemote(authProfile.profile_photo_url);
  }, [authProfile]);

  const clearErr = (key: string) => () => {
    if (fieldErrors[key]) {
      const next = { ...fieldErrors };
      delete next[key];
      setFieldErrors(next);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!phone.trim()) errs.phone = 'Phone is required';
    else if (!/^[+\d][\d\s\-()]{6,}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!address.trim()) errs.address = 'Address is required';
    if (!city.trim()) errs.city = 'City is required';
    if (emergencyContact && !/^[+\d][\d\s\-()]{6,}$/.test(emergencyContact.trim()))
      errs.emergencyContact = 'Enter a valid phone number';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to set a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setPhotoLocal(result.assets[0].uri);
    } catch (e: unknown) {
      Alert.alert('Photo error', e instanceof Error ? e.message : 'Could not pick photo.');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!user) {
      setError('You are not signed in.');
      return;
    }
    if (!validate()) {
      shake();
      return;
    }

    setLoading(true);
    try {
      let photoUrl = photoRemote;
      if (photoLocal) {
        setPhotoUploading(true);
        photoUrl = await uploadProfilePhoto(user.id, photoLocal);
        setPhotoUploading(false);
      }

      const updated = await updateCitizenProfile(user.id, {
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        emergency_contact: emergencyContact.trim() || undefined,
        profile_photo_url: photoUrl,
        profile_completed: true,
      });

      // Refresh server-side profile so guards re-evaluate.
      const fresh = await getCitizenProfile(user.id);
      setAuthProfile(fresh ?? updated);
      setProfile(fresh ?? updated);

      router.replace('/(main)/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
      shake();
    } finally {
      setLoading(false);
      setPhotoUploading(false);
    }
  };

  const photoUri = photoLocal ?? photoRemote;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {router.canGoBack() ? (
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 42 }} />
            )}
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Help us reach you when disasters strike near your area.
            </Text>
          </View>

          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
            {error !== '' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Profile photo (optional)</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.photoCircle}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                ) : (
                  <Ionicons name="camera-outline" size={28} color={Colors.primary} />
                )}
                {photoUploading && (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.photoBtn}>
                  <Ionicons name="image-outline" size={16} color={Colors.primary} />
                  <Text style={styles.photoBtnText}>{photoUri ? 'Change photo' : 'Choose photo'}</Text>
                </TouchableOpacity>
                <Text style={styles.photoHint}>JPG or PNG, up to 5 MB.</Text>
              </View>
            </View>

            <Input
              label="Phone number"
              required
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                clearErr('phone')();
              }}
              keyboardType="phone-pad"
              error={fieldErrors.phone}
            />
            <Input
              label="Address"
              required
              value={address}
              onChangeText={(t) => {
                setAddress(t);
                clearErr('address')();
              }}
              error={fieldErrors.address}
            />
            <Input
              label="City"
              required
              value={city}
              onChangeText={(t) => {
                setCity(t);
                clearErr('city')();
              }}
              autoCapitalize="words"
              error={fieldErrors.city}
            />
            <Input
              label="Emergency contact"
              hint="Optional — phone number of someone we can contact in an emergency"
              value={emergencyContact}
              onChangeText={(t) => {
                setEmergencyContact(t);
                clearErr('emergencyContact')();
              }}
              keyboardType="phone-pad"
              error={fieldErrors.emergencyContact}
            />

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.submitBtnGradient}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save and Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  titleBlock: { marginTop: 24, marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },

  form: {},

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

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 2,
  },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  photoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  photoBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  photoHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },

  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
});
