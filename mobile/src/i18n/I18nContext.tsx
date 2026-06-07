import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { translations, type TranslationKey } from './translations';
import type { AppLanguage } from '../types/settings';

interface I18nContextValue {
  language: AppLanguage;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  t: (key) => translations.en[key],
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useSettingsStore((s) => s.userSettings?.language ?? 'en');

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      t: (key) => translations[language][key] ?? translations.en[key],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
