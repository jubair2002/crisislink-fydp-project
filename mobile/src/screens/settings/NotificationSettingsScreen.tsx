import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { useI18n } from '../../i18n/I18nContext';
import {
  SettingsScreenShell,
  SettingsSection,
  SettingsToggleRow,
} from './settingsShared';

export default function NotificationSettingsScreen() {
  const { t } = useI18n();
  const userSettings = useSettingsStore((s) => s.userSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const toggle = async (key: keyof NonNullable<typeof userSettings>, next: boolean) => {
    if (!userSettings) return;

    if (key === 'disaster_alerts' && !next) {
      Alert.alert(t('disasterAlerts'), t('disasterAlertWarning'), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => persistToggle(key, next),
        },
      ]);
      return;
    }

    await persistToggle(key, next);
  };

  const persistToggle = async (key: keyof NonNullable<typeof userSettings>, next: boolean) => {
    setLoadingKey(key);
    try {
      await updateSetting(key, next as never);
      useToastStore.getState().show(t('saved'));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save setting.');
    } finally {
      setLoadingKey(null);
    }
  };

  if (!userSettings) {
    return <SettingsScreenShell title={t('notificationSettings')} />;
  }

  return (
    <SettingsScreenShell title={t('notificationSettings')}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingsSection title={t('notificationSettings')}>
          <SettingsToggleRow
            label={t('disasterAlerts')}
            description={t('disasterAlertsDesc')}
            value={userSettings.disaster_alerts}
            onValueChange={(v) => toggle('disaster_alerts', v)}
            loading={loadingKey === 'disaster_alerts'}
            warningOnOff={t('disasterAlertWarning')}
          />
          <SettingsToggleRow
            label={t('volunteerRequestAlerts')}
            description={t('volunteerRequestAlertsDesc')}
            value={userSettings.volunteer_request_alerts}
            onValueChange={(v) => toggle('volunteer_request_alerts', v)}
            loading={loadingKey === 'volunteer_request_alerts'}
          />
          <SettingsToggleRow
            label={t('chatNotifications')}
            description={t('chatNotificationsDesc')}
            value={userSettings.chat_notifications}
            onValueChange={(v) => toggle('chat_notifications', v)}
            loading={loadingKey === 'chat_notifications'}
          />
          <SettingsToggleRow
            label={t('campaignUpdates')}
            description={t('campaignUpdatesDesc')}
            value={userSettings.campaign_updates}
            onValueChange={(v) => toggle('campaign_updates', v)}
            loading={loadingKey === 'campaign_updates'}
          />
          <SettingsToggleRow
            label={t('donationUpdates')}
            description={t('donationUpdatesDesc')}
            value={userSettings.donation_updates}
            onValueChange={(v) => toggle('donation_updates', v)}
            loading={loadingKey === 'donation_updates'}
          />
        </SettingsSection>

        <SettingsSection title={t('emergencyAlerts')}>
          <SettingsToggleRow
            label={t('emergencyAlerts')}
            description={t('emergencyAlertsDesc')}
            value={true}
            onValueChange={() => {}}
            disabled
          />
        </SettingsSection>
      </ScrollView>
    </SettingsScreenShell>
  );
}
