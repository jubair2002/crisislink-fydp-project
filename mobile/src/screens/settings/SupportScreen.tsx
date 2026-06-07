import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appJson from '../../../app.json';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SettingsScreenShell,
  SettingsSection,
  SettingsNavRow,
} from './settingsShared';

const FAQ_ITEMS = [
  {
    q: 'How do I report a disaster?',
    a: 'Open the Disasters tab, tap Report, and fill in the type, severity, location, and optional photos.',
  },
  {
    q: 'How do volunteers receive tasks?',
    a: 'Set your status to Online and Available in Volunteer Settings. You will receive alerts for nearby tasks.',
  },
  {
    q: 'Can I donate anonymously?',
    a: 'Yes. Enable Anonymous Donations under Privacy & Security in Settings.',
  },
  {
    q: 'How do I change my password?',
    a: 'Go to Settings → Privacy & Security → Change Password to receive a reset email.',
  },
  {
    q: 'Who can see my profile?',
    a: 'Control visibility in Settings → Privacy & Security → Profile Visibility.',
  },
];

const SUPPORT_EMAIL = 'support@crisislink.network';

export default function SupportScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const appVersion = appJson.expo.version ?? '1.0.0';

  const contactSupport = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('CrisisLink Support Request')}`,
    ).catch(() => {});
  };

  return (
    <SettingsScreenShell title={t('supportHelp')}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingsSection title={t('supportHelp')}>
          <SettingsNavRow
            icon="mail-outline"
            label={t('contactSupport')}
            subtitle={SUPPORT_EMAIL}
            onPress={contactSupport}
            showChevron={false}
          />
        </SettingsSection>

        <SettingsSection title={t('faq')}>
          {FAQ_ITEMS.map((item, index) => {
            const open = openFaq === index;
            return (
              <View key={item.q} style={[styles.faqItem, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => setOpenFaq(open ? null : index)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{item.q}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {open ? (
                  <Text style={[styles.faqA, { color: colors.textSecondary }]}>{item.a}</Text>
                ) : null}
              </View>
            );
          })}
        </SettingsSection>

        <View style={styles.versionWrap}>
          <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
            {t('appVersion')}
          </Text>
          <Text style={[styles.versionValue, { color: colors.textPrimary }]}>{appVersion}</Text>
        </View>
      </ScrollView>
    </SettingsScreenShell>
  );
}

const styles = StyleSheet.create({
  faqItem: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '700' },
  faqA: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  versionWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  versionLabel: { fontSize: 12, fontWeight: '600' },
  versionValue: { fontSize: 14, fontWeight: '800' },
});
