import { useEffect, useState } from 'react';
import {
  View,
  Text,
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

import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuthStore } from '../../store/authStore';
import { getVolunteerProfile } from '../../services/profileService';
import { deleteAccount } from '../../services/authService';
import type { VolunteerProfile } from '../../types/profile';

export default function ProfileTabScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 20, paddingBottom: 110 },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: {
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.primarySurfaceBorder,
    },
    headerInfo: { flex: 1, gap: 2 },
    name: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    email: { fontSize: 12, color: c.textSecondary },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.primarySurface,
      borderColor: c.primarySurfaceBorder,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    roleBadgeText: { fontSize: 10, fontWeight: '700', color: c.primary },
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
      backgroundColor: c.primarySurface,
      borderWidth: 1,
      borderColor: c.primarySurfaceBorder,
    },
    editBtnText: { color: c.primary, fontSize: 11, fontWeight: '700' },
    incompleteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.warningSurface,
      borderWidth: 1,
      borderColor: c.warningSurfaceBorder,
      marginBottom: 14,
    },
    incompleteIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.warningSurfaceBorder,
    },
    incompleteTitle: { fontSize: 14, fontWeight: '700', color: c.warning },
    incompleteText: { fontSize: 12, color: c.warning, marginTop: 2, lineHeight: 16, opacity: 0.85 },
    section: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
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
    rowLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 2 },
    rowValue: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
    upgradeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 16,
    },
    upgradeRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upgradeRowTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    upgradeRowSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    accountSection: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
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
    accountRowTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    accountRowSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    accountDivider: { height: 1, backgroundColor: c.muted, marginVertical: 8 },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.dangerSurfaceBorder,
      borderRadius: 14,
      backgroundColor: c.dangerSurface,
    },
    logoutText: { color: c.danger, fontWeight: '700', fontSize: 15 },
  }));

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
      return {
        color: colors.success,
        bg: colors.successSurface,
        border: colors.successSurfaceBorder,
        label: 'Verified',
      };
    if (volunteer.verification_status === 'pending')
      return {
        color: colors.warning,
        bg: colors.warningSurface,
        border: colors.warningSurfaceBorder,
        label: 'Pending review',
      };
    if (volunteer.verification_status === 'rejected')
      return {
        color: colors.danger,
        bg: colors.dangerSurface,
        border: colors.dangerSurfaceBorder,
        label: 'Rejected',
      };
    return {
      color: colors.textSecondary,
      bg: colors.muted,
      border: colors.border,
      label: 'Suspended',
    };
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
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          {profile?.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={26} color={colors.primary} />
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
                  color={colors.primary}
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
            <Ionicons name="create-outline" size={14} color={colors.primary} />
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
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Complete your profile</Text>
              <Text style={styles.incompleteText}>
                {profile?.role === 'volunteer'
                  ? 'Finish your volunteer application to start receiving tasks.'
                  : 'Add your contact details so we can reach you in an emergency.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
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
                <ActivityIndicator color={colors.primary} />
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
              <Text style={{ color: colors.textSecondary, padding: 12 }}>
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
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeRowTitle}>Become a Volunteer</Text>
              <Text style={styles.upgradeRowSub}>Apply to help disaster response efforts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
          </TouchableOpacity>
        )}

        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.accountRow}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/change-password')}
          >
            <View style={[styles.accountIcon, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountRowTitle}>Change password</Text>
              <Text style={styles.accountRowSub}>Update your sign-in password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
          </TouchableOpacity>

          <View style={styles.accountDivider} />

          <TouchableOpacity
            style={styles.accountRow}
            activeOpacity={0.85}
            onPress={confirmDeleteAccount}
            disabled={deleting}
          >
            <View style={[styles.accountIcon, { backgroundColor: colors.dangerSurface }]}>
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountRowTitle, { color: colors.danger }]}>
                Delete account
              </Text>
              <Text style={styles.accountRowSub}>Permanently remove your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
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
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 8,
    },
    rowLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 2 },
    rowValue: { fontSize: 14, color: c.textPrimary, fontWeight: '600' },
  }));

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}
