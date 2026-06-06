import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Colors } from '../../constants/colors';
import { HeaderGlassCircleButton } from '../../components/HeaderGlassCircleButton';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { fetchCampaignById, fundingProgress } from '../../services/campaignService';
import { initPayment, pollDonationStatus } from '../../services/donationService';
import type { Campaign } from '../../types/campaign';

const PRESETS = [100, 500, 1000, 5000];

export default function DonationFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState(profile?.name ?? '');
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    if (profile?.name && !donorName) setDonorName(profile.name);
  }, [profile?.name]);

  useEffect(() => {
    if (!id) return;
    void fetchCampaignById(id)
      .then(setCampaign)
      .finally(() => setLoading(false));
  }, [id]);

  const resolvedAmount = customAmount.trim()
    ? Number(customAmount.replace(/[^0-9.]/g, ''))
    : amount;

  const handleSubmit = async () => {
    if (!id || !campaign) return;
    const finalAmount = resolvedAmount;
    if (!finalAmount || finalAmount < 10) {
      showToast('Minimum donation is \u09f310');
      return;
    }
    const name = donorName.trim() || (anonymous ? 'Anonymous Donor' : 'Guest Donor');
    if (!anonymous && name.length < 2) {
      showToast('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const result = await initPayment(id, finalAmount, {
        name,
        anonymous,
        userId: user?.id ?? null,
      });

      await WebBrowser.openBrowserAsync(result.payment_url);

      const donation = await pollDonationStatus(result.donation_id);

      if (donation?.payment_status === 'paid') {
        router.replace({
          pathname: '/(main)/campaigns/payment-success',
          params: {
            donationId: donation.id,
            code: donation.donation_code ?? '',
            amount: String(donation.amount),
            campaignTitle: campaign.title,
          },
        });
      } else if (donation?.payment_status === 'failed') {
        showToast('Payment failed. Please try again.');
      } else {
        router.replace({
          pathname: '/(main)/campaigns/payment-success',
          params: {
            donationId: result.donation_id,
            code: '',
            amount: String(finalAmount),
            campaignTitle: campaign.title,
            pending: '1',
          },
        });
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Payment could not be started');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Campaign not found.</Text>
      </SafeAreaView>
    );
  }

  const pct = fundingProgress(campaign);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <HeaderGlassCircleButton onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </HeaderGlassCircleButton>
          <Text style={styles.headerTitle}>Donate</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignMeta}>{pct}% funded · {campaign.location ?? 'Nationwide'}</Text>

          <Text style={styles.label}>Select amount</Text>
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetBtn, amount === p && !customAmount && styles.presetActive]}
                onPress={() => {
                  setAmount(p);
                  setCustomAmount('');
                }}
              >
                <Text style={[styles.presetText, amount === p && !customAmount && styles.presetTextActive]}>
                  {'\u09f3'}
                  {p.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Custom amount"
            placeholder="Enter amount in BDT"
            keyboardType="numeric"
            value={customAmount}
            onChangeText={setCustomAmount}
          />

          <Input
            label="Donor name"
            placeholder="Your name"
            value={donorName}
            onChangeText={setDonorName}
            editable={!anonymous}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Donate anonymously</Text>
              <Text style={styles.switchHint}>Your name will show as "Anonymous Donor"</Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ true: Colors.primary, false: '#CBD5E1' }}
            />
          </View>

          {!user && (
            <View style={styles.guestNote}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.guestNoteText}>
                No login required. Save your tracking ID after payment to follow your donation.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitDisabled]}
            onPress={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="#FFF" />
                <Text style={styles.submitText}>
                  Pay {'\u09f3'}
                  {(resolvedAmount ?? 0).toLocaleString()} via SSLCommerz
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.secureNote}>Secure payment · SSLCommerz</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  campaignTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  campaignMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: Colors.card,
  },
  presetActive: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  presetText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  presetTextActive: { color: Colors.primary },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  switchHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  guestNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  guestNoteText: { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 18 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secureNote: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary, marginTop: 12 },
  errorText: { textAlign: 'center', marginTop: 40, color: Colors.textSecondary },
});
