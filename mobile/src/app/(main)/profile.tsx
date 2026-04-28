import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { getVolunteerProfile } from '../../services/profileService';
import { deleteAccount } from '../../services/authService';
import type { VolunteerProfile } from '../../types/profile';

export default function ProfileTabScreen() {
  const { user, profile, logout } = useAuthStore();
  const role = profile?.role ?? 'citizen';
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || role !== 'volunteer') return;
      setLoading(true);
      try {
        const v = await getVolunteerProfile(user.id);
        if (!cancelled) setVolunteer(v);
      } catch {
        if (!cancelled) setVolunteer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, role]);

  const verifyBadge = (() => {
    if (role !== 'volunteer' || !volunteer) return null;
    if (volunteer.verification_status === 'approved')
      return { color: Colors.success, bg: '#ECFDF5', border: '#A7F3D0', label: 'Verified' };
    if (volunteer.verification_status === 'pending')
      return { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', label: 'Pending review' };
    if (volunteer.verification_status === 'rejected')
      return { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', label: 'Rejected' };
    return { color: Colors.textSecondary, bg: '#F1F5F9', border: '#E2E8F0', label: 'Suspended' };
  })();

  const profileIncomplete = profile && !profile.profile_completed;
  const setupRoute: '/(auth)/become-volunteer' | '/(auth)/profile-setup' =
    profile?.role === 'volunteer' ? '/(auth)/become-volunteer' : '/(auth)/profile-setup';

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This will permanently remove your account, profile, and any volunteer data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              // The auth state listener picks this up and routes to /(auth)/welcome.
            } catch (e: unknown) {
              setDeleting(false);
              Alert.alert(
                'Could not delete account',
                e instanceof Error ? e.message : 'Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          {profile?.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={26} color={Colors.primary} />
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.name ?? 'User'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {profile?.email ?? ''}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Ionicons
                  name={role === 'volunteer' ? 'people' : 'person'}
                  size={11}
                  color={Colors.primary}
                />
                <Text style={styles.roleBadgeText}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </View>
              {verifyBadge && (
                <View
                  style={[
                    styles.verifyBadge,
                    { backgroundColor: verifyBadge.bg, borderColor: verifyBadge.border },
                  ]}
                >
                  <Ionicons
                    name={
                      volunteer?.verification_status === 'approved'
                        ? 'shield-checkmark'
                        : 'time-outline'
                    }
                    size={11}
                    color={verifyBadge.color}
                  />
                  <Text style={[styles.verifyBadgeText, { color: verifyBadge.color }]}>
                    {verifyBadge.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/edit-profile')}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={14} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {profileIncomplete && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(setupRoute)}
            style={styles.incompleteCard}
          >
            <View style={styles.incompleteIcon}>
              <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteText}>
                {profile?.role === 'volunteer'
                  ? 'Finish your volunteer application to start receiving tasks.'
                  : 'Add your contact details so we can reach you in an emergency.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Row icon="call-outline" label="Phone" value={profile?.phone || 'Not set'} />
          <Row icon="location-outline" label="Address" value={profile?.address || 'Not set'} />
          <Row icon="business-outline" label="City" value={profile?.city || 'Not set'} />
          <Row
            icon="alert-circle-outline"
            label="Emergency contact"
            value={profile?.emergency_contact || 'Not set'}
          />
        </View>

        {role === 'volunteer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Volunteer details</Text>
            {loading ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : volunteer ? (
              <>
                <Row
                  icon="people-outline"
                  label="Skills"
                  value={
                    volunteer.skills && volunteer.skills.length > 0
                      ? volunteer.skills
                          .map((s) => s.replace(/_/g, ' '))
                          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                          .join(', ')
                      : 'None'
                  }
                />
                <Row
                  icon="time-outline"
                  label="Availability"
                  value={
                    volunteer.availability
                      ? volunteer.availability.replace(/_/g, ' ')
                      : 'Not set'
                  }
                />
                <Row
                  icon="briefcase-outline"
                  label="Experience"
                  value={
                    volunteer.has_previous_experience
                      ? `${volunteer.years_of_experience ?? 0} years`
                      : 'No prior experience'
                  }
                />
              </>
            ) : (
              <Text style={{ color: Colors.textSecondary, padding: 12 }}>
                No volunteer record found.
              </Text>
            )}
          </View>
        )}

        {role === 'citizen' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/become-volunteer')}
            style={styles.upgradeRow}
          >
            <View style={styles.upgradeRowIcon}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeRowTitle}>Become a Volunteer</Text>
              <Text style={styles.upgradeRowSub}>Apply to help disaster response efforts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.accountRow}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/change-password')}
          >
            <View style={[styles.accountIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountRowTitle}>Change password</Text>
              <Text style={styles.accountRowSub}>Update your sign-in password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.accountDivider} />

          <TouchableOpacity
            style={styles.accountRow}
            activeOpacity={0.85}
            onPress={confirmDeleteAccount}
            disabled={deleting}
          >
            <View style={[styles.accountIcon, { backgroundColor: '#FEF2F2' }]}>
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountRowTitle, { color: Colors.danger }]}>
                Delete account
              </Text>
              <Text style={styles.accountRowSub}>Permanently remove your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 110 },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  headerInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  email: { fontSize: 12, color: Colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  verifyBadgeText: { fontSize: 10, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },

  incompleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
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
  incompleteText: { fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 16 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  rowValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },

  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  upgradeRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeRowTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  upgradeRowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  accountSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRowTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  accountRowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  accountDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
});
