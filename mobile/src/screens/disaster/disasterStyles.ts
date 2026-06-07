import { StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';

const createDisasterStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screenBg: {
      flex: 1,
      backgroundColor: c.background,
    },
    screenBgWhite: {
      flex: 1,
      backgroundColor: c.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 8,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.muted,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 8,
      marginLeft: 2,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 14,
    },
    primaryBtn: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 6,
    },
    primaryBtnGradientWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      backgroundColor: c.primary,
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.onPrimary,
      letterSpacing: 0.3,
    },
    outlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.primarySurfaceBorder,
      backgroundColor: c.primarySurface,
    },
    outlineBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
    },
    ghostBtn: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    ghostBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    errorBanner: {
      backgroundColor: c.dangerSurface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.dangerSurfaceBorder,
    },
    errorBannerText: { color: c.danger, fontSize: 13, fontWeight: '500' },
    muted: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
  });

export function useDisasterStyles() {
  return useThemedStyles(createDisasterStyles);
}

