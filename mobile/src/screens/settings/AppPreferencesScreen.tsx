import React from 'react';
import { ScrollView, Alert } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { useI18n } from '../../i18n/I18nContext';
import type { AppLanguage, AppTheme, MapDefaultView } from '../../types/settings';
import {
  SettingsScreenShell,
  SettingsSection,
  SettingsSegmentedControl,
} from './settingsShared';

export default function AppPreferencesScreen() {
  const { t } = useI18n();
  const userSettings = useSettingsStore((s) => s.userSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const persist = async <K extends keyof NonNullable<typeof userSettings>>(
    key: K,
    value: NonNullable<typeof userSettings>[K],
  ) => {
    try {
      await updateSetting(key, value);
      useToastStore.getState().show(t('saved'));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save setting.');
    }
  };

  if (!userSettings) {
    return <SettingsScreenShell title={t('appPreferences')} />;
  }

  const languageOptions: { value: AppLanguage; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'bn', label: 'বাংলা' },
  ];

  const themeOptions: { value: AppTheme; label: string }[] = [
    { value: 'light', label: t('light') },
    { value: 'dark', label: t('dark') },
    { value: 'system', label: t('systemDefault') },
  ];

  const mapOptions: { value: MapDefaultView; label: string }[] = [
    { value: 'standard', label: t('standard') },
    { value: 'satellite', label: t('satellite') },
    { value: 'hybrid', label: t('hybrid') },
  ];

  return (
    <SettingsScreenShell title={t('appPreferences')}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingsSection title={t('language')}>
          <SettingsSegmentedControl
            options={languageOptions}
            value={userSettings.language}
            onChange={(v) => persist('language', v)}
          />
        </SettingsSection>

        <SettingsSection title={t('theme')}>
          <SettingsSegmentedControl
            options={themeOptions}
            value={userSettings.theme}
            onChange={(v) => persist('theme', v)}
          />
        </SettingsSection>

        <SettingsSection title={t('mapDefaultView')}>
          <SettingsSegmentedControl
            options={mapOptions}
            value={userSettings.map_default_view}
            onChange={(v) => persist('map_default_view', v)}
          />
        </SettingsSection>
      </ScrollView>
    </SettingsScreenShell>
  );
}
