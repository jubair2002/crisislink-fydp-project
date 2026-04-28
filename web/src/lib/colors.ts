/**
 * Shared color palette — kept in sync with the mobile app
 * (`mobile/src/constants/colors.ts`).
 *
 * Use the Tailwind utilities (e.g. `bg-brand`, `text-brand-secondary`) defined
 * in `globals.css` for layout / typography work; reach for these constants
 * when feeding chart libraries or other JS APIs that need raw hex values.
 */
export const Colors = {
  primary: '#2563EB',
  secondary: '#06B6D4',
  accent: '#EF4444',
  background: '#F8FAFC',
  card: '#FFFFFF',
  dark: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

/**
 * A categorical palette for charts. Order is stable so that "skill A" always
 * gets the same color regardless of the underlying data ordering.
 */
export const ChartPalette = [
  Colors.primary,
  Colors.secondary,
  Colors.success,
  Colors.warning,
  Colors.danger,
  '#A855F7',
  '#EC4899',
  '#14B8A6',
];
