import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import type { AppTheme } from '../types/settings';
import { lightTheme, darkTheme, type ThemeColors } from '../constants/themes';
import { useSettingsStore } from '../store/settingsStore';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  themePreference: AppTheme;
  primaryGradient: [string, string];
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightTheme,
  isDark: false,
  themePreference: 'system',
  primaryGradient: ['#2563EB', '#1D4ED8'],
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.userSettings?.theme ?? 'system');

  const isDark = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return systemScheme === 'dark';
  }, [themePreference, systemScheme]);

  const colors = isDark ? darkTheme : lightTheme;
  const primaryGradient: [string, string] = isDark
    ? [colors.primary, '#1E3A8A']
    : [colors.primary, '#1D4ED8'];

  const value = useMemo(
    () => ({ colors, isDark, themePreference, primaryGradient }),
    [colors, isDark, themePreference, primaryGradient],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
