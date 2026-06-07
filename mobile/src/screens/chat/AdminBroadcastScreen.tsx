import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { sendBroadcast } from '../../services/chatService';
import type { BroadcastTargetType } from '../../types/chat';
import { ChatTopBar } from './chatShared';

const TARGETS: { id: BroadcastTargetType; label: string; desc: string }[] = [
  { id: 'all', label: 'All users', desc: 'Every registered user receives this broadcast.' },
  { id: 'volunteers', label: 'All volunteers', desc: 'Only users with the volunteer role.' },
  { id: 'campaign', label: 'Specific campaign', desc: 'Active volunteers on a campaign (enter campaign ID).' },
];

export default function AdminBroadcastScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const showToast = useToastStore((s) => s.show);

  const [targetType, setTargetType] = useState<BroadcastTargetType>('all');
  const [campaignId, setCampaignId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ChatTopBar title="Broadcast" onBack={() => router.back()} />
        <View style={styles.denied}>
          <Text style={styles.deniedText}>Admin access required to send broadcasts.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = async () => {
    if (!user) return;
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) {
      Alert.alert('Missing fields', 'Enter a title and message.');
      return;
    }
    if (targetType === 'campaign' && !campaignId.trim()) {
      Alert.alert('Campaign required', 'Enter a campaign ID for campaign-targeted broadcasts.');
      return;
    }

    Alert.alert('Send broadcast?', `This will notify ${targetType === 'all' ? 'all users' : targetType}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        style: 'destructive',
        onPress: async () => {
          setSending(true);
          try {
            await sendBroadcast(
              user.id,
              targetType,
              t,
              m,
              targetType === 'campaign' ? campaignId.trim() : null,
            );
            showToast('Broadcast sent.');
            setTitle('');
            setMessage('');
            router.back();
          } catch (e: unknown) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not send broadcast.');
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ChatTopBar title="Send broadcast" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          Admin dashboard placeholder — send one-way announcements with push notifications to selected audiences.
        </Text>

        <Text style={styles.label}>Target audience</Text>
        {TARGETS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.targetCard, targetType === t.id && styles.targetCardActive]}
            onPress={() => setTargetType(t.id)}
          >
            <Text style={[styles.targetLabel, targetType === t.id && styles.targetLabelActive]}>
              {t.label}
            </Text>
            <Text style={styles.targetDesc}>{t.desc}</Text>
          </TouchableOpacity>
        ))}

        {targetType === 'campaign' ? (
          <>
            <Text style={styles.label}>Campaign ID</Text>
            <TextInput
              style={styles.input}
              value={campaignId}
              onChangeText={setCampaignId}
              placeholder="UUID of the campaign"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
          </>
        ) : null}

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Broadcast title"
          placeholderTextColor="#94A3B8"
          maxLength={120}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Your announcement…"
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendBtnText}>Send broadcast</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  note: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  targetCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  targetCardActive: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  targetLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  targetLabelActive: { color: Colors.primary },
  targetDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  sendBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedText: { color: Colors.textSecondary, textAlign: 'center' },
});
