import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getVolunteerProfile } from '../../services/profileService';
import { startTracking, stopTracking } from '../../services/locationService';
import { useToastStore } from '../../store/toastStore';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SKILL_OPTIONS, type VolunteerProfile, type VolunteerSkill } from '../../types/profile';
import type { AvailabilityStatus } from '../../types/settings';
import {
  SettingsScreenShell,
  SettingsSection,
  SettingsToggleRow,
  DistanceSlider,
} from './settingsShared';

export default function VolunteerSettingsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const role = useAuthStore((s) => s.profile?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const volunteerSettings = useSettingsStore((s) => s.volunteerSettings);
  const updateVolunteerSetting = useSettingsStore((s) => s.updateVolunteerSetting);
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'volunteer' || !userId) return;
    getVolunteerProfile(userId).then(setVolunteer).catch(() => setVolunteer(null));
  }, [role, userId]);

  if (role !== 'volunteer') {
    return (
      <SettingsScreenShell title={t('volunteerSettings')}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
          Volunteer settings are only available for volunteer accounts.
        </Text>
      </SettingsScreenShell>
    );
  }

  if (!volunteerSettings || !userId) {
    return <SettingsScreenShell title={t('volunteerSettings')} />;
  }

  const isOnline =
    volunteerSettings.availability_status === 'online' ||
    volunteerSettings.availability_status === 'available' ||
    volunteerSettings.availability_status === 'busy';

  const workStatus: 'available' | 'busy' =
    volunteerSettings.availability_status === 'busy' ? 'busy' : 'available';

  const persist = async <K extends keyof typeof volunteerSettings>(
    key: K,
    value: (typeof volunteerSettings)[K],
  ) => {
    setLoadingKey(key);
    try {
      await updateVolunteerSetting(key, value);
      useToastStore.getState().show(t('saved'));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save setting.');
    } finally {
      setLoadingKey(null);
    }
  };

  const setOnlineStatus = async (online: boolean) => {
    const status: AvailabilityStatus = online ? 'available' : 'offline';
    setLoadingKey('availability_status');
    try {
      await updateVolunteerSetting('availability_status', status);
      if (online) {
        await startTracking(userId);
      } else {
        await stopTracking();
      }
      useToastStore.getState().show(t('saved'));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update availability.');
    } finally {
      setLoadingKey(null);
    }
  };

  const setWorkStatus = async (status: 'available' | 'busy') => {
    if (!isOnline) return;
    await persist('availability_status', status);
  };

  const removeSkill = async (skill: VolunteerSkill) => {
    const next = volunteerSettings.skills.filter((s) => s !== skill);
    await persist('skills', next);
  };

  const addSkill = async (skill: VolunteerSkill) => {
    if (volunteerSettings.skills.includes(skill)) {
      setSkillModalOpen(false);
      return;
    }
    const next = [...volunteerSettings.skills, skill];
    setSkillModalOpen(false);
    await persist('skills', next);
  };

  const verification = volunteer?.verification_status ?? 'pending';
  const rejectionReason = volunteer?.verification_rejection_reason;

  const verificationCard = (() => {
    if (verification === 'approved') {
      return { icon: 'checkmark-circle' as const, color: colors.success, label: `${t('verified')} ✓` };
    }
    if (verification === 'rejected') {
      return { icon: 'close-circle' as const, color: colors.danger, label: `${t('rejected')} ✗` };
    }
    return { icon: 'time' as const, color: colors.warning, label: `${t('pending')} ⏳` };
  })();

  return (
    <SettingsScreenShell title={t('volunteerSettings')}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingsSection title={t('availability')}>
          <View style={[styles.statusCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {isOnline ? t('online') : t('offline')}
            </Text>
            <SettingsToggleRow
              label={isOnline ? t('online') : t('offline')}
              value={isOnline}
              onValueChange={setOnlineStatus}
              loading={loadingKey === 'availability_status'}
            />
          </View>

          {isOnline ? (
            <View style={styles.workRow}>
              <TouchableOpacity
                style={[
                  styles.workBtn,
                  {
                    backgroundColor:
                      workStatus === 'available' ? colors.successSurface : colors.muted,
                    borderColor:
                      workStatus === 'available' ? colors.successSurfaceBorder : colors.border,
                  },
                ]}
                onPress={() => setWorkStatus('available')}
              >
                <Text
                  style={{
                    color: workStatus === 'available' ? colors.success : colors.textSecondary,
                    fontWeight: '700',
                  }}
                >
                  {t('available')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.workBtn,
                  {
                    backgroundColor: workStatus === 'busy' ? colors.warningSurface : colors.muted,
                    borderColor: workStatus === 'busy' ? colors.warningSurfaceBorder : colors.border,
                  },
                ]}
                onPress={() => setWorkStatus('busy')}
              >
                <Text
                  style={{
                    color: workStatus === 'busy' ? colors.warning : colors.textSecondary,
                    fontWeight: '700',
                  }}
                >
                  {t('busy')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Task Preferences">
          <SettingsToggleRow
            label={t('acceptEmergencyTasks')}
            value={volunteerSettings.accept_emergency}
            onValueChange={(v) => persist('accept_emergency', v)}
            loading={loadingKey === 'accept_emergency'}
          />
          <SettingsToggleRow
            label={t('acceptCampaignTasks')}
            value={volunteerSettings.accept_campaign}
            onValueChange={(v) => persist('accept_campaign', v)}
            loading={loadingKey === 'accept_campaign'}
          />
          <DistanceSlider
            label={t('maxTaskDistance')}
            value={volunteerSettings.max_distance_km}
            min={5}
            max={50}
            step={5}
            onChange={(v) => persist('max_distance_km', v)}
          />
        </SettingsSection>

        <SettingsSection title={t('skillManagement')}>
          {volunteerSettings.skills.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
              No skills added yet.
            </Text>
          ) : (
            volunteerSettings.skills.map((skill) => {
              const opt = SKILL_OPTIONS.find((o) => o.value === skill);
              return (
                <View key={skill} style={styles.skillRow}>
                  <Ionicons
                    name={(opt?.icon as keyof typeof Ionicons.glyphMap) ?? 'ellipse-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.skillLabel, { color: colors.textPrimary }]}>
                    {opt?.label ?? skill}
                  </Text>
                  <TouchableOpacity onPress={() => removeSkill(skill)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <TouchableOpacity
            style={[styles.addSkillBtn, { borderColor: colors.primary }]}
            onPress={() => setSkillModalOpen(true)}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('addSkill')}</Text>
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title={t('verificationStatus')}>
          <View style={[styles.verifyCard, { borderColor: colors.border }]}>
            <Ionicons name={verificationCard.icon} size={28} color={verificationCard.color} />
            <Text style={[styles.verifyLabel, { color: verificationCard.color }]}>
              {verificationCard.label}
            </Text>
            {verification === 'rejected' && rejectionReason ? (
              <Text style={[styles.rejectReason, { color: colors.textSecondary }]}>
                {rejectionReason}
              </Text>
            ) : null}
            {verification === 'rejected' ? (
              <TouchableOpacity
                style={[styles.resubmitBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(auth)/become-volunteer')}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>{t('resubmit')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </SettingsSection>
      </ScrollView>

      <Modal visible={skillModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSkillModalOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('addSkill')}</Text>
            {SKILL_OPTIONS.filter((o) => !volunteerSettings.skills.includes(o.value)).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.skillOption, { borderColor: colors.border }]}
                onPress={() => addSkill(opt.value)}
              >
                <Ionicons
                  name={opt.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={colors.primary}
                />
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SettingsScreenShell>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  statusLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  workRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  workBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  skillLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  verifyCard: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  verifyLabel: { fontSize: 16, fontWeight: '800' },
  rejectReason: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  resubmitBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  skillOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
