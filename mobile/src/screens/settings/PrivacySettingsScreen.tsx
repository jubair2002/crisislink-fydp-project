import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { sendPasswordResetEmail } from '../../services/settingsService';
import { stopTracking } from '../../services/locationService';
import { useToastStore } from '../../store/toastStore';
import { useI18n } from '../../i18n/I18nContext';
import type { ProfileVisibility } from '../../types/settings';
import {
  SettingsScreenShell,
  SettingsSection,
  SettingsNavRow,
  SettingsToggleRow,
  SettingsSegmentedControl,
} from './settingsShared';

export default function PrivacySettingsScreen() {
  const { t } = useI18n();
  const email = useAuthStore((s) => s.profile?.email);
  const userSettings = useSettingsStore((s) => s.userSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  const persist = async <K extends keyof NonNullable<typeof userSettings>>(
    key: K,
    value: NonNullable<typeof userSettings>[K],
  ) => {
    setLoadingKey(key);
    try {
      await updateSetting(key, value);
      if (key === 'location_sharing' && value === false) {
        await stopTracking();
      }
      useToastStore.getState().show(t('saved'));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save setting.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(email);
      Alert.alert(t('changePassword'), t('passwordResetSent'));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  if (!userSettings) {
    return <SettingsScreenShell title={t('privacySecurity')} />;
  }

  const visibilityOptions: { value: ProfileVisibility; label: string }[] = [
    { value: 'public', label: t('public') },
    { value: 'volunteers_only', label: t('volunteersOnly') },
    { value: 'private', label: t('private') },
  ];

  return (
    <SettingsScreenShell title={t('privacySecurity')}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingsSection title={t('privacySecurity')}>
          <SettingsNavRow
            icon="lock-closed-outline"
            label={t('changePassword')}
            subtitle={t('changePasswordDesc')}
            onPress={handlePasswordReset}
            showChevron={false}
          />
        </SettingsSection>

        <SettingsSection title={t('locationSharing')}>
          <SettingsToggleRow
            label={t('locationSharing')}
            description={t('locationSharingDesc')}
            value={userSettings.location_sharing}
            onValueChange={(v) => persist('location_sharing', v)}
            loading={loadingKey === 'location_sharing'}
          />
        </SettingsSection>

        <SettingsSection title={t('profileVisibility')}>
          <SettingsSegmentedControl
            options={visibilityOptions}
            value={userSettings.profile_visibility}
            onChange={(v) => persist('profile_visibility', v)}
          />
        </SettingsSection>

        <SettingsSection title={t('anonymousDonations')}>
          <SettingsToggleRow
            label={t('anonymousDonations')}
            description={t('anonymousDonationsDesc')}
            value={userSettings.anonymous_donations}
            onValueChange={(v) => persist('anonymous_donations', v)}
            loading={loadingKey === 'anonymous_donations'}
          />
        </SettingsSection>

        <SettingsSection title={t('viewMyData')}>
          <SettingsNavRow
            icon="document-text-outline"
            label={t('viewMyData')}
            subtitle={t('viewMyDataDesc')}
            onPress={() => Alert.alert(t('viewMyData'), t('comingSoon'))}
            showChevron={false}
          />
        </SettingsSection>
      </ScrollView>
    </SettingsScreenShell>
  );
}
