import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/authStore';
import { changePassword } from '../../services/authService';

export default function ChangePasswordScreen() {
  const { user } = useAuthStore();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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

  const clearErr = (key: string) => () => {
    if (fieldErrors[key]) {
      const nextErrs = { ...fieldErrors };
      delete nextErrs[key];
      setFieldErrors(nextErrs);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!current) errs.current = 'Current password is required';
    if (!next) errs.next = 'New password is required';
    else if (next.length < 6) errs.next = 'Min 6 characters';
    if (next !== confirm) errs.confirm = "Passwords don't match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const passwordStrength = () => {
    if (!next) return null;
    if (next.length < 6) return { label: 'Weak', color: Colors.danger, percent: 33 };
    if (next.length < 10) return { label: 'Good', color: Colors.warning, percent: 66 };
    return { label: 'Strong', color: Colors.success, percent: 100 };
  };
  const strength = passwordStrength();

  const handleSubmit = async () => {
    setError('');
    if (!user?.email) {
      setError('You are not signed in.');
      return;
    }
    if (!validate()) {
      shake();
      return;
    }

    setLoading(true);
    try {
      await changePassword(user.email, current, next);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not change password.');
      shake();
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.topTitle}>Change password</Text>
        <View style={{ width: 42 }} />
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
          {success ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successBody}>
                Your password has been changed successfully. Use the new password the next time you sign in.
              </Text>
              <TouchableOpacity
                style={styles.successBtn}
                activeOpacity={0.88}
                onPress={() => router.replace('/(main)/profile')}
              >
                <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.successBtnGradient}>
                  <Text style={styles.successBtnText}>Back to Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={styles.intro}>
                Enter your current password and choose a new one. Make sure it&rsquo;s at least 6 characters.
              </Text>

              {error !== '' && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              <Input
                label="Current password"
                isPassword
                value={current}
                onChangeText={(t) => {
                  setCurrent(t);
                  clearErr('current')();
                }}
                autoCapitalize="none"
                error={fieldErrors.current}
              />

              <Input
                label="New password"
                isPassword
                value={next}
                onChangeText={(t) => {
                  setNext(t);
                  clearErr('next')();
                }}
                autoCapitalize="none"
                error={fieldErrors.next}
              />
              {strength && !fieldErrors.next && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        { width: `${strength.percent}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}

              <Input
                label="Confirm new password"
                isPassword
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  clearErr('confirm')();
                }}
                autoCapitalize="none"
                error={fieldErrors.confirm}
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
                    <Text style={styles.submitBtnText}>Update password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40 },

  intro: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },

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

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 48 },

  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 17 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 12,
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  successBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successBtn: { borderRadius: 14, overflow: 'hidden', alignSelf: 'stretch' },
  successBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  successBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
