import React from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../i18n/I18nContext';
import {
  SettingsScreenShell,
  SettingsSection,
  SettingsNavRow,
} from './settingsShared';

export default function SettingsMainScreen() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.profile?.role) ?? 'citizen';
  const isVolunteer = role === 'volunteer';

  return (
    <SettingsScreenShell title={t('settings')}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingsSection title={t('notificationSettings')}>
          <SettingsNavRow
            icon="notifications-outline"
            label={t('notificationSettings')}
            subtitle="Alerts, chat, campaigns"
            onPress={() => router.push('/(main)/settings/notifications')}
          />
        </SettingsSection>

        <SettingsSection title={t('privacySecurity')}>
          <SettingsNavRow
            icon="shield-outline"
            label={t('privacySecurity')}
            subtitle="Password, location, visibility"
            onPress={() => router.push('/(main)/settings/privacy')}
          />
        </SettingsSection>

        <SettingsSection title={t('appPreferences')}>
          <SettingsNavRow
            icon="options-outline"
            label={t('appPreferences')}
            subtitle="Language, theme, map"
            onPress={() => router.push('/(main)/settings/preferences')}
          />
        </SettingsSection>

        {isVolunteer ? (
          <SettingsSection title={t('volunteerSettings')}>
            <SettingsNavRow
              icon="people-outline"
              label={t('volunteerSettings')}
              subtitle="Availability, tasks, skills"
              onPress={() => router.push('/(main)/settings/volunteer')}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title={t('supportHelp')}>
          <SettingsNavRow
            icon="help-circle-outline"
            label={t('supportHelp')}
            subtitle="FAQ and contact support"
            onPress={() => router.push('/(main)/settings/support')}
          />
        </SettingsSection>
      </ScrollView>
    </SettingsScreenShell>
  );
}
