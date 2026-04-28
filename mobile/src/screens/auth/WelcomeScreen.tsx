import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { signInWithGoogle } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

export default function WelcomeScreen() {
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGradient}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
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
            <ActivityIndicator size="small" color={Colors.textPrimary} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  header: { paddingTop: 16, paddingBottom: 8 },
  brandText: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.3 },

  hero: { paddingTop: 32, paddingBottom: 32 },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroAccent: { color: Colors.primary },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
  },

  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: Colors.danger, fontSize: 12 },

  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
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
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.4 },

  googleBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  terms: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 14,
  },
  termsLink: { color: Colors.primary, fontWeight: '600' },
});
