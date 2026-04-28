import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { getVolunteerProfile } from '../../services/profileService';
import type { VolunteerProfile } from '../../types/profile';

export default function DashboardScreen() {
  const { user, profile } = useAuthStore();
  const role = profile?.role ?? 'citizen';
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [loadingVolunteer, setLoadingVolunteer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || role !== 'volunteer') {
        setVolunteer(null);
        return;
      }
      setLoadingVolunteer(true);
      try {
        const v = await getVolunteerProfile(user.id);
        if (!cancelled) setVolunteer(v);
      } catch {
        if (!cancelled) setVolunteer(null);
      } finally {
        if (!cancelled) setLoadingVolunteer(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, role]);

  const profileIncomplete = profile && !profile.profile_completed;
  // Placeholder until the notifications service is wired up.
  const unreadCount = 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/profile')}
            style={styles.greetingTouch}
          >
            {profile?.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={22} color={Colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Welcome back 👋</Text>
              <Text style={styles.name} numberOfLines={1}>
                {profile?.name ?? user?.email}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(main)/notifications')}
            activeOpacity={0.7}
            hitSlop={10}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {profileIncomplete && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push(
                profile?.role === 'volunteer'
                  ? '/(auth)/become-volunteer'
                  : '/(auth)/profile-setup',
              )
            }
            style={styles.incompleteCard}
          >
            <View style={styles.incompleteIcon}>
              <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteText}>
                We need a few more details before you can use CrisisLink.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {role === 'volunteer' && volunteer?.verification_status === 'pending' && (
          <View style={[styles.statusCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="time-outline" size={18} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#92400E' }]}>Application under review</Text>
              <Text style={styles.statusText}>
                Your volunteer application is pending verification. We&rsquo;ll notify you once approved.
              </Text>
            </View>
          </View>
        )}

        {role === 'volunteer' && volunteer?.verification_status === 'rejected' && (
          <View style={[styles.statusCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#991B1B' }]}>Application rejected</Text>
              <Text style={styles.statusText}>
                Please update your information and resubmit your application.
              </Text>
            </View>
          </View>
        )}

        {role === 'volunteer' && volunteer?.verification_status === 'approved' && (
          <View style={[styles.statusCard, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: '#065F46' }]}>Verified volunteer</Text>
              <Text style={styles.statusText}>
                You&rsquo;re cleared to receive task assignments and disaster response calls.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.placeholder}>
          {loadingVolunteer ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
              <Text style={styles.placeholderTitle}>Dashboard Coming Soon</Text>
              <Text style={styles.placeholderSub}>
                Disaster alerts, volunteer tasks, and donation campaigns will appear here.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    marginBottom: 18,
  },
  greetingTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  name: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 1 },

  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  incompleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  incompleteIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  incompleteTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  incompleteText: { fontSize: 12, color: '#92400E', marginTop: 2 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusTitle: { fontSize: 14, fontWeight: '700' },
  statusText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },

  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  placeholderTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  placeholderSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
