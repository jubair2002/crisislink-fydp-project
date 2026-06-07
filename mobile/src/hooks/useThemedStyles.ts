import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeColors } from '../constants/themes';

// StyleSheet.create widens flex/font literals; loose return keeps call sites simple.
export function useThemedStyles(
  factory: (colors: ThemeColors, isDark: boolean) => Record<string, object>,
) {
  const { colors, isDark } = useTheme();
  return useMemo(
    () => StyleSheet.create(factory(colors, isDark)),
    [colors, isDark],
  );
}
