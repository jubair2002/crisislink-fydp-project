import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

/** Shared layout + typography aligned with LoginScreen / Dashboard */
export const disasterStyles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenBgWhite: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
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
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },

  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnGradientWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  ghostBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: { color: Colors.danger, fontSize: 13, fontWeight: '500' },

  muted: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
