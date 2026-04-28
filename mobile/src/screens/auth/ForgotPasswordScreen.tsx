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
import { resetPassword } from '../../services/authService';
import { Input } from '../../components/Input';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sent, setSent] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const animateSuccess = () => {
    Animated.spring(successScale, {
      toValue: 1, tension: 50, friction: 6, useNativeDriver: true,
    }).start();
  };

  const handleSend = async () => {
    setError(''); setFieldError('');
    if (!email.trim()) { setFieldError('Email is required'); shake(); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setFieldError('Enter a valid email'); shake(); return; }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      animateSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email.');
      shake();
    } finally {
      setLoading(false);
    }
  };

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {sent ? (
            <Animated.View style={[styles.successWrap, { transform: [{ scale: successScale }] }]}>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successBody}>
                We've sent a password reset link to{'\n'}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  Link expires in 1 hour. Check your spam folder if needed.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.88}
              >
                <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.submitBtnGradient}>
                  <Text style={styles.submitBtnText}>Back to Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tryAgainBtn}
                onPress={() => { setSent(false); successScale.setValue(0); setEmail(''); }}
              >
                <Text style={styles.tryAgainText}>Try a different email</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>Forgot password?</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
              </View>

              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                {error !== '' && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                <Input
                  label="Email address"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (fieldError) setFieldError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={fieldError || undefined}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled, { marginTop: 8 }]}
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.submitBtnGradient}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Send Reset Link</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  titleBlock: { marginTop: 32, marginBottom: 32, alignItems: 'flex-start' },
  title: {
    fontSize: 30, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.6, marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorBannerText: { color: Colors.danger, fontSize: 13, fontWeight: '500' },

  submitBtn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnGradient: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 17,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  successWrap: { marginTop: 40, alignItems: 'center' },
  successTitle: {
    fontSize: 26, fontWeight: '800', color: Colors.textPrimary,
    marginBottom: 12, letterSpacing: -0.4,
  },
  successBody: {
    fontSize: 15, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 20,
  },
  successEmail: { color: Colors.primary, fontWeight: '700' },
  hintBox: {
    backgroundColor: '#EFF6FF', padding: 14, borderRadius: 12,
    marginBottom: 28, alignSelf: 'stretch',
  },
  hintText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, textAlign: 'center' },
  tryAgainBtn: { marginTop: 16, paddingVertical: 8 },
  tryAgainText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});
