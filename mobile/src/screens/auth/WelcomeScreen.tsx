import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { signInWithGoogle } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const { setUser, setProfile } = useAuthStore();

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setUser(result.user);
        setProfile(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brandText}>CrisisLink Network</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Connect.{'\n'}Respond.{'\n'}<Text style={styles.heroAccent}>Save lives.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            A community-powered platform for disaster management, volunteer coordination, and relief donations.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/(auth)/signup')}
          style={styles.primaryBtn}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGradient}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogle}
          disabled={googleLoading}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text> &amp;{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors, _isDark: boolean) => ({
  root: { flex: 1, backgroundColor: c.background },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  header: { paddingTop: 16, paddingBottom: 8 },
  brandText: { fontSize: 17, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.3 },

  hero: { paddingTop: 32, paddingBottom: 32 },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: c.textPrimary,
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroAccent: { color: c.primary },
  heroSubtitle: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 23,
  },

  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.background,
  },

  errorBox: {
    backgroundColor: c.dangerSurface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: c.danger, fontSize: 12 },

  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 10,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: c.onPrimary, letterSpacing: 0.3 },

  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.card,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { fontSize: 11, color: c.chevron, fontWeight: '600', letterSpacing: 0.4 },

  googleBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },

  terms: {
    textAlign: 'center',
    fontSize: 11,
    color: c.chevron,
    lineHeight: 16,
    marginTop: 14,
  },
  termsLink: { color: c.primary, fontWeight: '600' },
});
