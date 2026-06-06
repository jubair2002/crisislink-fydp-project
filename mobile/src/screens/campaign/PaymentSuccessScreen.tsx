import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { copyText } from '../../utils/copyText';
import { Colors } from '../../constants/colors';
import { pollDonationStatus } from '../../services/donationService';
import { saveDonationRecord } from '../../services/donationHistoryStorage';
import { useToastStore } from '../../store/toastStore';

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams<{
    donationId?: string;
    code?: string;
    amount?: string;
    campaignTitle?: string;
    pending?: string;
  }>();

  const scale = useRef(new Animated.Value(0)).current;
  const showToast = useToastStore((s) => s.show);
  const [trackingCode, setTrackingCode] = React.useState(params.code ?? '');
  const [loading, setLoading] = React.useState(params.pending === '1');

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [scale]);

  useEffect(() => {
    if (params.pending !== '1' || !params.donationId) return;
    void (async () => {
      const donation = await pollDonationStatus(params.donationId!, 20, 2500);
      if (donation?.donation_code) {
        setTrackingCode(donation.donation_code);
        await saveDonationRecord({
          donation_code: donation.donation_code,
          donation_id: donation.id,
          amount: Number(params.amount ?? donation.amount ?? 0),
          campaign_title: params.campaignTitle,
          saved_at: new Date().toISOString(),
        });
      }
      setLoading(false);
    })();
  }, [params.donationId, params.pending, params.amount, params.campaignTitle]);

  useEffect(() => {
    const code = params.code?.trim();
    if (!code || params.pending === '1') return;
    void saveDonationRecord({
      donation_code: code,
      donation_id: params.donationId,
      amount: Number(params.amount ?? 0),
      campaign_title: params.campaignTitle,
      saved_at: new Date().toISOString(),
    });
  }, [params.code, params.donationId, params.amount, params.campaignTitle, params.pending]);

  const handleCopy = async () => {
    if (!trackingCode) return;
    await copyText(trackingCode);
    showToast('Tracking ID copied');
  };

  const handleShare = async () => {
    if (!trackingCode) return;
    try {
      await Share.share({
        message: `I donated to ${params.campaignTitle ?? 'a relief campaign'} on CrisisLink. Track my donation: ${trackingCode}`,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={48} color="#FFF" />
      </Animated.View>

      <Text style={styles.title}>Thank you!</Text>
      <Text style={styles.subtitle}>
        Your donation of {'\u09f3'}
        {Number(params.amount ?? 0).toLocaleString()} to {params.campaignTitle ?? 'the campaign'} is{' '}
        {loading ? 'being confirmed…' : 'confirmed'}.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : trackingCode ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Donation tracking ID</Text>
          <Text style={styles.code}>{trackingCode}</Text>
          <TouchableOpacity style={styles.copyInline} onPress={() => void handleCopy()}>
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={styles.copyInlineText}>Copy ID</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.pendingNote}>
          Payment is processing. Check back shortly with your transaction reference.
        </Text>
      )}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() =>
          router.push({
            pathname: '/(main)/campaigns/track',
            params: trackingCode ? { code: trackingCode } : undefined,
          })
        }
      >
        <Ionicons name="receipt-outline" size={18} color="#FFF" />
        <Text style={styles.primaryBtnText}>Track your donation</Text>
      </TouchableOpacity>

      {trackingCode ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void handleShare()}>
          <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>Share</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace('/(main)/campaigns')}>
        <Text style={styles.linkText}>Browse more campaigns</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  codeBox: {
    marginTop: 24,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  code: { fontSize: 22, fontWeight: '800', color: Colors.primary, marginTop: 6, letterSpacing: 1 },
  copyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  copyInlineText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  pendingNote: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 20 },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  linkBtn: { marginTop: 16 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
});
