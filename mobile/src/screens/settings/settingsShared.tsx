import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export function goBackFromSettings() {
  if (router.canGoBack()) router.back();
  else router.replace('/(main)/settings');
}

export function SettingsScreenShell({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBackFromSettings}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function SettingsSection({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

export function SettingsNavRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  showChevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.primary;

  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.85}>
      <View
        style={[
          styles.navIcon,
          { backgroundColor: destructive ? colors.dangerSurface : colors.primarySurface },
        ]}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.navLabel, { color: destructive ? colors.danger : colors.textPrimary }]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
    </TouchableOpacity>
  );
}

export function SettingsToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  loading = false,
  warningOnOff,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  warningOnOff?: string;
}) {
  const { colors } = useTheme();

  const handleChange = (next: boolean) => {
    if (warningOnOff && !next) {
      // Still allow toggle but caller may show alert via warningOnOff prop usage in parent
    }
    onValueChange(next);
  };

  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
        {warningOnOff && !value ? (
          <Text style={[styles.toggleWarning, { color: colors.warning }]}>{warningOnOff}</Text>
        ) : null}
      </View>
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      <Switch
        value={value}
        onValueChange={handleChange}
        disabled={disabled || loading}
        trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
        thumbColor={value ? colors.primary : colors.switchThumb}
        ios_backgroundColor={colors.switchTrackOff}
      />
    </View>
  );
}

export function SettingsSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              active && { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.primary : colors.textSecondary },
                active && styles.segmentTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DistanceSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const { colors } = useTheme();
  const steps = Math.floor((max - min) / step) + 1;

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: colors.primary }]}>{value} km</Text>
      </View>
      <View style={styles.sliderTrack}>
        {Array.from({ length: steps }, (_, i) => min + i * step).map((km) => {
          const active = km <= value;
          return (
            <TouchableOpacity
              key={km}
              style={[
                styles.sliderDot,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onChange(km)}
              activeOpacity={0.8}
            />
          );
        })}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{min} km</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{max} km</Text>
      </View>
    </View>
  );
}

export function DeleteAccountModal({
  visible,
  step,
  password,
  onPasswordChange,
  loading,
  onCancel,
  onConfirmWarning,
  onConfirmDelete,
}: {
  visible: boolean;
  step: 1 | 2;
  password: string;
  onPasswordChange: (v: string) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirmWarning: () => void;
  onConfirmDelete: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={onCancel}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {step === 1 ? (
            <>
              <View style={styles.modalIconWrap}>
                <Ionicons name="warning" size={28} color={colors.danger} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('deleteAccount')}?
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                {t('deleteWarning')}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                  onPress={onCancel}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.danger }]}
                  onPress={onConfirmWarning}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Continue</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('confirmPassword')}
              </Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary, marginBottom: 12 }]}>
                Enter your password to permanently delete your account.
              </Text>
              <DeletePasswordInput value={password} onChange={onPasswordChange} />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                  onPress={onCancel}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.danger, opacity: loading ? 0.7 : 1 }]}
                  onPress={onConfirmDelete}
                  disabled={loading || !password}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>{t('deleteAccount')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DeletePasswordInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      secureTextEntry
      placeholder="Password"
      placeholderTextColor={colors.textSecondary}
      style={[
        styles.passwordField,
        { borderColor: colors.border, backgroundColor: colors.muted, color: colors.textPrimary },
      ]}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { width: 42 },
  title: { fontSize: 16, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { fontSize: 14, fontWeight: '700' },
  navSubtitle: { fontSize: 12, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: '700' },
  toggleDesc: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  toggleWarning: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  segment: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: { fontSize: 12, fontWeight: '600' },
  segmentTextActive: { fontWeight: '800' },
  sliderWrap: { paddingVertical: 8 },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderValue: { fontSize: 14, fontWeight: '800' },
  sliderTrack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  sliderDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalIconWrap: { alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  modalBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {},
  passwordInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  passwordField: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginTop: 4,
  },
});
