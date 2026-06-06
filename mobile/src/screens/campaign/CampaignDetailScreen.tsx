import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
import { useAuthStore } from '../../store/authStore';
import {
  daysRemaining,
  fetchCampaignById,
  fetchCampaignResources,
  fetchCampaignUpdates,
  fetchCampaignVolunteers,
  fundingProgress,
  joinCampaignAsVolunteer,
} from '../../services/campaignService';
import type { Campaign, CampaignResource, CampaignUpdate, CampaignVolunteer } from '../../types/campaign';
import { formatTimeAgo } from '../home/homeShared';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isVolunteer = profile?.role === 'volunteer';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [resources, setResources] = useState<CampaignResource[]>([]);
  const [volunteers, setVolunteers] = useState<CampaignVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, u, r, v] = await Promise.all([
        fetchCampaignById(id),
        fetchCampaignUpdates(id),
        fetchCampaignResources(id),
        fetchCampaignVolunteers(id),
      ]);
      setCampaign(c);
      setUpdates(u);
      setResources(r);
      setVolunteers(v);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoinVolunteer = async () => {
    if (!id || !user?.id) return;
    setJoining(true);
    try {
      await joinCampaignAsVolunteer(id, user.id);
      await load();
    } finally {
      setJoining(false);
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pct = fundingProgress(campaign);
  const days = daysRemaining(campaign.end_date);
  const alreadyJoined = volunteers.some((v) => v.volunteer_user_id === user?.id);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {campaign.media_url ? (
          <Image source={{ uri: campaign.media_url }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="heart" size={48} color="#93C5FD" />
          </View>
        )}

        <View style={styles.heroOverlay}>
          <HeaderGlassCircleButton onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </HeaderGlassCircleButton>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{campaign.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.loc}>{campaign.location ?? 'Nationwide'}</Text>
            {days != null && <Text style={styles.days}>{days === 0 ? 'Ends today' : `${days} days left`}</Text>}
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFg, { width: `${pct}%` }]} />
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.raised}>
                {'\u09f3'}
                {Math.round(campaign.collected_amount).toLocaleString()} raised
              </Text>
              <Text style={styles.target}>
                of {'\u09f3'}
                {Math.round(campaign.target_amount).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.pctLabel}>{pct}% funded</Text>
          </View>

          {campaign.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this campaign</Text>
              <Text style={styles.bodyText}>{campaign.description}</Text>
            </View>
          ) : null}

          {resources.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resource transparency</Text>
              {resources.map((r) => (
                <View key={r.id} style={styles.resourceRow}>
                  <Text style={styles.resourceType}>{r.resource_type}</Text>
                  <Text style={styles.resourceMeta}>
                    Pledged: {r.quantity_pledged} · Purchased: {r.quantity_purchased} · Distributed:{' '}
                    {r.quantity_distributed}
                  </Text>
                  {r.purchase_amount > 0 && (
                    <Text style={styles.resourceAmt}>
                      {'\u09f3'}
                      {Math.round(r.purchase_amount).toLocaleString()} spent
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {updates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campaign updates</Text>
              {updates.map((u) => (
                <View key={u.id} style={styles.updateCard}>
                  <Text style={styles.updateTitle}>{u.title}</Text>
                  <Text style={styles.updateTime}>{formatTimeAgo(u.created_at)}</Text>
                  {u.description ? <Text style={styles.updateBody}>{u.description}</Text> : null}
                  {u.media_url ? (
                    <Image source={{ uri: u.media_url }} style={styles.updateImage} />
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {volunteers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Volunteers ({volunteers.length})</Text>
              {volunteers.slice(0, 8).map((v) => (
                <View key={v.id} style={styles.volRow}>
                  <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.volName}>{v.profile?.name ?? 'Volunteer'}</Text>
                  <Text style={styles.volRole}>{v.role}</Text>
                </View>
              ))}
            </View>
          )}

          {isVolunteer && !alreadyJoined && (
            <TouchableOpacity
              style={styles.volunteerBtn}
              onPress={() => void handleJoinVolunteer()}
              disabled={joining}
            >
              <Ionicons name="hand-left-outline" size={18} color={Colors.primary} />
              <Text style={styles.volunteerBtnText}>{joining ? 'Joining…' : 'Volunteer for this campaign'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.donateBtn}
          onPress={() => router.push(`/(main)/campaigns/${campaign.id}/donate`)}
        >
          <Ionicons name="heart" size={20} color="#FFF" />
          <Text style={styles.donateBtnText}>Donate Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { textAlign: 'center', fontSize: 16, color: Colors.textSecondary, marginTop: 40 },
  link: { textAlign: 'center', color: Colors.primary, marginTop: 12 },
  hero: { width: '100%', height: 220 },
  heroPlaceholder: { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 48, left: 16 },
  body: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  loc: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  days: { fontSize: 12, fontWeight: '600', color: Colors.primary, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  progressCard: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressBg: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  progressFg: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  raised: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  target: { fontSize: 13, color: Colors.textSecondary },
  pctLabel: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  bodyText: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  resourceRow: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resourceType: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  resourceMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  resourceAmt: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: 4 },
  updateCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  updateTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  updateTime: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  updateBody: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
  updateImage: { width: '100%', height: 160, borderRadius: 8, marginTop: 10 },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  volName: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  volRole: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' },
  volunteerBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  volunteerBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  donateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  donateBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
