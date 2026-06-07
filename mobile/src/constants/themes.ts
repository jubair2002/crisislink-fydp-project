import { Colors as LightColors } from './colors';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  dark: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  muted: string;
  switchTrackOff: string;
  switchTrackOn: string;
  switchThumb: string;
  tabBar: string;
  tabBarBorder: string;
  inputBg: string;
  inputBorder: string;
  inputErrorBg: string;
  skeleton: string;
  iconMuted: string;
  overlay: string;
  primarySurface: string;
  primarySurfaceBorder: string;
  dangerSurface: string;
  dangerSurfaceBorder: string;
  warningSurface: string;
  warningSurfaceBorder: string;
  successSurface: string;
  successSurfaceBorder: string;
  onPrimary: string;
  shadow: string;
  elevated: string;
  chevron: string;
  white: string;
}

export const lightTheme: ThemeColors = {
  ...LightColors,
  border: '#E2E8F0',
  muted: '#F1F5F9',
  switchTrackOff: '#CBD5E1',
  switchTrackOn: '#93C5FD',
  switchThumb: '#F8FAFC',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  inputErrorBg: '#FEF2F2',
  skeleton: '#E2E8F0',
  iconMuted: '#CBD5E1',
  overlay: 'rgba(15,23,42,0.55)',
  primarySurface: '#EFF6FF',
  primarySurfaceBorder: '#BFDBFE',
  dangerSurface: '#FEF2F2',
  dangerSurfaceBorder: '#FECACA',
  warningSurface: '#FFFBEB',
  warningSurfaceBorder: '#FDE68A',
  successSurface: '#ECFDF5',
  successSurfaceBorder: '#A7F3D0',
  onPrimary: '#FFFFFF',
  shadow: '#000000',
  elevated: '#FFFFFF',
  chevron: '#94A3B8',
  white: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  primary: '#3B82F6',
  secondary: '#22D3EE',
  accent: '#F87171',
  background: '#0B1220',
  card: '#1E293B',
  dark: '#020617',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  border: '#334155',
  muted: '#1E293B',
  switchTrackOff: '#475569',
  switchTrackOn: '#1D4ED8',
  switchThumb: '#F8FAFC',
  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
  inputBg: '#1E293B',
  inputBorder: '#334155',
  inputErrorBg: '#3B1C1C',
  skeleton: '#334155',
  iconMuted: '#64748B',
  overlay: 'rgba(2,6,23,0.75)',
  primarySurface: '#172554',
  primarySurfaceBorder: '#1E3A8A',
  dangerSurface: '#3B1C1C',
  dangerSurfaceBorder: '#7F1D1D',
  warningSurface: '#422006',
  warningSurfaceBorder: '#78350F',
  successSurface: '#052E16',
  successSurfaceBorder: '#166534',
  onPrimary: '#FFFFFF',
  shadow: '#000000',
  elevated: '#1E293B',
  chevron: '#64748B',
  white: '#FFFFFF',
};

/** Google Maps dark style for react-native-maps */
export const MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];
