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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { signUpWithEmail } from '../../services/authService';
import type { UserRole } from '../../types/auth';
import { Input } from '../../components/Input';

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'citizen', label: 'Citizen', desc: 'Report & donate' },
  { value: 'volunteer', label: 'Volunteer', desc: 'Respond & help' },
];

export default function SignupScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (password.length < 6) errs.password = 'Min 6 characters';
    if (password !== confirmPw) errs.confirmPw = "Passwords don't match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async () => {
    setError(''); setSuccess('');
    if (!validate()) { shake(); return; }
    setLoading(true);
    try {
      await signUpWithEmail(name.trim(), email.trim(), password, role);
      setSuccess('Account created! Check your email to confirm your account.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Weak', color: colors.danger, percent: 33 };
    if (password.length < 10) return { label: 'Good', color: colors.warning, percent: 66 };
    return { label: 'Strong', color: colors.success, percent: 100 };
  };
  const strength = passwordStrength();

  const clearErr = (key: string) => () => {
    if (fieldErrors[key]) {
      const next = { ...fieldErrors };
      delete next[key];
      setFieldErrors(next);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join thousands helping in times of crisis</Text>
          </View>

          {success !== '' ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successBody}>{success}</Text>
              <TouchableOpacity
                style={styles.successBtn}
                onPress={() => router.replace('/(auth)/login')}
              >
                <LinearGradient colors={[colors.primary, colors.primary]} style={styles.successBtnGradient}>
                  <Text style={styles.successBtnText}>Continue to Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
              {error !== '' && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              <Text style={styles.sectionLabel}>I want to join as</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const active = role === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.roleCard, active && styles.roleCardActive]}
                      onPress={() => setRole(r.value)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                        {r.label}
                      </Text>
                      <Text style={styles.roleDesc}>{r.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ marginTop: 4 }}>
                <Input
                  label="Full name"
                  value={name}
                  onChangeText={(t) => { setName(t); clearErr('name')(); }}
                  autoCapitalize="words"
                  error={fieldErrors.name}
                />
                <Input
                  label="Email address"
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearErr('email')(); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={fieldErrors.email}
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearErr('password')(); }}
                  isPassword
                  autoCapitalize="none"
                  error={fieldErrors.password}
                />
                {strength && !fieldErrors.password && (
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
                  label="Confirm password"
                  value={confirmPw}
                  onChangeText={(t) => { setConfirmPw(t); clearErr('confirmPw')(); }}
                  isPassword
                  autoCapitalize="none"
                  error={fieldErrors.confirmPw}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient colors={[colors.primary, colors.primary]} style={styles.submitBtnGradient}>
                  {loading ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          <TouchableOpacity style={styles.bottomLink} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.bottomLinkText}>
              Already have an account? <Text style={styles.bottomLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, _isDark: boolean) => ({
  root: { flex: 1, backgroundColor: c.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.muted,
  },

  titleBlock: { marginTop: 24, marginBottom: 24, alignItems: 'flex-start' },
  title: {
    fontSize: 30, fontWeight: '800', color: c.textPrimary,
    letterSpacing: -0.6, marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: c.textSecondary, lineHeight: 22 },

  form: {},

  errorBanner: {
    backgroundColor: c.dangerSurface, borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: c.dangerSurfaceBorder,
  },
  errorBannerText: { color: c.danger, fontSize: 13, fontWeight: '500' },

  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: c.textSecondary,
    marginBottom: 10, marginLeft: 2,
  },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: c.border,
    padding: 16, backgroundColor: c.card,
  },
  roleCardActive: {
    borderColor: c.primary, backgroundColor: c.primarySurface,
  },
  roleLabel: { fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 4 },
  roleLabelActive: { color: c.primary },
  roleDesc: { fontSize: 12, color: c.textSecondary },

  strengthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: -8, marginBottom: 16, paddingHorizontal: 4,
  },
  strengthBar: { flex: 1, height: 4, backgroundColor: c.border, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 48 },

  submitBtn: {
    borderRadius: 16, overflow: 'hidden', marginTop: 8,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnGradient: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 17,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary, letterSpacing: 0.3 },

  successCard: {
    backgroundColor: c.card, borderRadius: 24, padding: 32, alignItems: 'center',
    shadowColor: c.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6, marginBottom: 16,
    borderWidth: 1, borderColor: c.border,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: c.textPrimary, marginBottom: 8 },
  successBody: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  successBtn: { borderRadius: 14, overflow: 'hidden', alignSelf: 'stretch' },
  successBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  successBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },

  bottomLink: { alignSelf: 'center', marginTop: 24, paddingVertical: 8 },
  bottomLinkText: { fontSize: 14, color: c.textSecondary },
  bottomLinkBold: { color: c.primary, fontWeight: '700' },
});
