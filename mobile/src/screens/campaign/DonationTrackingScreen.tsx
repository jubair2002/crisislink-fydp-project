import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors } from '../../constants/colors';
import { HeaderGlassCircleButton } from '../../components/HeaderGlassCircleButton';
import { Input } from '../../components/Input';
import { trackDonation } from '../../services/donationService';
import type { DonationTrackingPayload } from '../../types/campaign';

const LIFECYCLE = ['Received', 'Allocated', 'Used'] as const;

function statusIndex(status: string): number {
  const s = status.toLowerCase();
  if (s.includes('used') || s.includes('distributed')) return 2;
  if (s.includes('alloc')) return 1;
  return 0;
}

export default function DonationTrackingScreen() {
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(initialCode ?? '');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<DonationTrackingPayload | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async (searchCode: string) => {
    const trimmed = searchCode.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const result = await trackDonation(trimmed);
      if (!result) {
        setPayload(null);
        setError('No donation found with that tracking ID.');
      } else {
        setPayload(result);
      }
    } catch (e) {
      setPayload(null);
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) void search(initialCode);
  }, [initialCode, search]);

  const latestStatus =
    payload?.tracking?.length
      ? payload.tracking[payload.tracking.length - 1]?.status ?? 'Received'
      : 'Received';
  const currentStep = statusIndex(latestStatus);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <HeaderGlassCircleButton onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </HeaderGlassCircleButton>
        <Text style={styles.headerTitle}>Track Donation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hint}>Enter your donation tracking ID (e.g. DON-2026-000123)</Text>
        <Input
          placeholder="DON-2026-000123"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => void search(code)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.searchBtnText}>Look up</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {payload && (
          <View style={styles.result}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCode}>{payload.donation.donation_code}</Text>
              <Text style={styles.summaryAmt}>
                {'\u09f3'}
                {Number(payload.donation.amount).toLocaleString()}
              </Text>
              <Text style={styles.summaryMeta}>
                {payload.donation.donor_name} · {payload.campaign?.title ?? 'Campaign'}
              </Text>
              <Text style={styles.summaryStatus}>Status: {payload.donation.payment_status}</Text>
            </View>

            <Text style={styles.sectionTitle}>Donation lifecycle</Text>
            <View style={styles.lifecycle}>
              {LIFECYCLE.map((step, idx) => (
                <View key={step} style={styles.lifecycleStep}>
                  <View
                    style={[
                      styles.lifecycleDot,
                      idx <= currentStep && styles.lifecycleDotActive,
                    ]}
                  >
                    {idx < currentStep ? (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    ) : (
                      <Text style={styles.lifecycleNum}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.lifecycleLabel,
                      idx <= currentStep && styles.lifecycleLabelActive,
                    ]}
                  >
                    {step}
                  </Text>
                  {idx < LIFECYCLE.length - 1 && (
                    <View
                      style={[
                        styles.lifecycleLine,
                        idx < currentStep && styles.lifecycleLineActive,
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            {payload.tracking.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Activity log</Text>
                {payload.tracking.map((t) => (
                  <View key={t.id} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logStatus}>{t.status}</Text>
                      {t.updated_at && (
                        <Text style={styles.logTime}>
                          {new Date(t.updated_at).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    {t.description ? <Text style={styles.logDesc}>{t.description}</Text> : null}
                    {t.proof_url ? (
                      <Image source={{ uri: t.proof_url }} style={styles.proofImage} />
                    ) : null}
                  </View>
                ))}
              </>
            )}

            {payload.resources.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Funded resources</Text>
                {payload.resources.map((r, i) => (
                  <View key={`${r.resource_type}-${i}`} style={styles.resourceCard}>
                    <Text style={styles.resourceType}>{r.resource_type}</Text>
                    <Text style={styles.resourceMeta}>
                      Purchased: {r.quantity_purchased} · Distributed: {r.quantity_distributed}
                    </Text>
                    {r.purchase_amount > 0 && (
                      <Text style={styles.resourceAmt}>
                        {'\u09f3'}
                        {Math.round(r.purchase_amount).toLocaleString()}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  error: { color: Colors.danger, fontSize: 14, marginBottom: 12 },
  result: { marginTop: 8 },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  summaryCode: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  summaryAmt: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  summaryMeta: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  summaryStatus: { fontSize: 12, color: Colors.success, fontWeight: '600', marginTop: 8, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  lifecycle: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  lifecycleStep: { flex: 1, alignItems: 'center', position: 'relative' },
  lifecycleDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifecycleDotActive: { backgroundColor: Colors.primary },
  lifecycleNum: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  lifecycleLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  lifecycleLabelActive: { color: Colors.primary, fontWeight: '600' },
  lifecycleLine: {
    position: 'absolute',
    top: 16,
    left: '60%',
    width: '80%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: -1,
  },
  lifecycleLineActive: { backgroundColor: Colors.primary },
  logCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  logStatus: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  logTime: { fontSize: 11, color: Colors.textSecondary },
  logDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  proofImage: { width: '100%', height: 160, borderRadius: 8, marginTop: 10 },
  resourceCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resourceType: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  resourceMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  resourceAmt: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: 4 },
});
