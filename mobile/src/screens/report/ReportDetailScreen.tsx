import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import {
  addReportResponse,
  getReportById,
  getReportResponses,
  getReportStatusEvents,
  subscribeToReportUpdates,
  updateReportStatus,
} from '../../services/reportService';
import type { ReportResponseRow, ReportRow, ReportStatusEvent } from '../../types/report';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from '../../types/report';
import {
  ReportBadge,
  ReportLoading,
  ReportScreenShell,
  formatReportDate,
} from './reportShared';

const createStyles = (c: ThemeColors) => ({
  scroll: { paddingBottom: 32 },
  section: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: c.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: c.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  badgeRow: { flexDirection: 'row' as const, gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 },
  body: { fontSize: 14, color: c.textPrimary, lineHeight: 21 },
  meta: { fontSize: 12, color: c.textSecondary, marginTop: 8 },
  image: { width: '100%' as const, height: 200, borderRadius: 12, marginTop: 10 },
  timelineItem: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
    marginTop: 4,
  },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: 13, fontWeight: '800' as const, color: c.textPrimary },
  timelineNote: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  timelineDate: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  responseCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: c.muted,
  },
  responseAuthor: { fontSize: 12, fontWeight: '800' as const, color: c.primary, marginBottom: 4 },
  responseBody: { fontSize: 13, color: c.textPrimary, lineHeight: 18 },
  resolution: {
    borderWidth: 1,
    borderColor: c.successSurfaceBorder,
    backgroundColor: c.successSurface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  resolutionTitle: { fontSize: 13, fontWeight: '800' as const, color: c.success, marginBottom: 4 },
  resolutionText: { fontSize: 13, color: c.textPrimary, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: c.card,
    textAlignVertical: 'top' as const,
  },
  actionRow: { flexDirection: 'row' as const, gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  actionBtnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
  actionText: { fontWeight: '700' as const, fontSize: 13 },
});

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.profile?.role);

  const [report, setReport] = useState<ReportRow | null>(null);
  const [responses, setResponses] = useState<ReportResponseRow[]>([]);
  const [events, setEvents] = useState<ReportStatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const isOwner = report?.user_id === userId;
  const canHandle =
    !isOwner &&
    (role === 'admin' ||
      role === 'authority' ||
      (role === 'volunteer' && report?.report_type === 'campaign'));

  const load = useCallback(async () => {
    if (!id) return;
    const [r, res, ev] = await Promise.all([
      getReportById(id),
      getReportResponses(id),
      getReportStatusEvents(id),
    ]);
    setReport(r);
    setResponses(res);
    setEvents(ev);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void load()
      .catch(() => {
        setReport(null);
      })
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToReportUpdates(id, () => {
      void load();
    });
    return unsub;
  }, [id, load]);

  const sendReply = async () => {
    if (!id || !userId || !reply.trim()) return;
    setBusy(true);
    try {
      await addReportResponse(id, userId, reply.trim());
      setReply('');
      await load();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send response.');
    } finally {
      setBusy(false);
    }
  };

  const markResolved = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await updateReportStatus(
        id,
        'resolved',
        resolutionText.trim() || 'Issue has been resolved.',
      );
      setResolveModal(false);
      setResolutionText('');
      await load();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ReportScreenShell title="Report Details">
        <ReportLoading />
      </ReportScreenShell>
    );
  }

  if (!report) {
    return (
      <ReportScreenShell title="Report Details">
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Report not found.</Text>
        </View>
      </ReportScreenShell>
    );
  }

  return (
    <ReportScreenShell title="Report Details">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <View style={styles.badgeRow}>
            <ReportBadge type={report.report_type} />
            <ReportBadge status={report.status} />
          </View>
          <Text style={styles.sectionTitle}>{REPORT_TYPE_LABELS[report.report_type]}</Text>
          <Text style={styles.body}>{report.description}</Text>
          {report.image_url ? (
            <Image source={{ uri: report.image_url }} style={styles.image} resizeMode="cover" />
          ) : null}
          {report.campaign?.title ? (
            <Text style={styles.meta}>Campaign: {report.campaign.title}</Text>
          ) : null}
          {report.location_label ? (
            <Text style={styles.meta}>Location: {report.location_label}</Text>
          ) : null}
          <Text style={styles.meta}>Submitted {formatReportDate(report.created_at)}</Text>
        </View>

        {report.status === 'resolved' && report.resolution_message ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution</Text>
            <View style={styles.resolution}>
              <Text style={styles.resolutionTitle}>Resolved</Text>
              <Text style={styles.resolutionText}>{report.resolution_message}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status timeline</Text>
          {events.length === 0 ? (
            <Text style={styles.meta}>No timeline events yet.</Text>
          ) : (
            events.map((ev) => (
              <View key={ev.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{REPORT_STATUS_LABELS[ev.status]}</Text>
                  {ev.note ? <Text style={styles.timelineNote}>{ev.note}</Text> : null}
                  <Text style={styles.timelineDate}>{formatReportDate(ev.created_at)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responses</Text>
          {responses.length === 0 ? (
            <Text style={styles.meta}>No responses yet.</Text>
          ) : (
            responses.map((r) => (
              <View key={r.id} style={styles.responseCard}>
                <Text style={styles.responseAuthor}>
                  {r.responder?.name ?? 'Support team'} · {formatReportDate(r.created_at)}
                </Text>
                <Text style={styles.responseBody}>{r.message}</Text>
              </View>
            ))
          )}
        </View>

        {canHandle && report.status !== 'resolved' && report.status !== 'rejected' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Respond to report</Text>
            <TextInput
              value={reply}
              onChangeText={setReply}
              multiline
              placeholder="Write a response to the reporter..."
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => void sendReply()}
                disabled={busy || !reply.trim()}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.actionText, { color: colors.primary }]}>Send reply</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => setResolveModal(true)}
                disabled={busy}
              >
                <Text style={[styles.actionText, { color: colors.onPrimary }]}>Mark resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={resolveModal} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.overlay }}
          onPress={() => setResolveModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
              Resolve report
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 10 }}>
              Add a resolution message for the reporter.
            </Text>
            <TextInput
              value={resolutionText}
              onChangeText={setResolutionText}
              multiline
              placeholder="Resolution message..."
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setResolveModal(false)}>
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => void markResolved()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.actionText, { color: colors.onPrimary }]}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ReportScreenShell>
  );
}
