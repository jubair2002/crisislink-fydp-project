import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '../../constants/themes';
import { useDisasterStyles } from './disasterStyles';
import { addUpdate, getDisasterUpdates } from '../../services/disasterService';
import { useAuthStore } from '../../store/authStore';
import { getVolunteerProfile } from '../../services/profileService';
import type { DisasterUpdateRow } from '../../types/disaster';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const createStyles = (c: ThemeColors) => ({
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  empty: { textAlign: 'center' as const, color: c.textSecondary, marginTop: 40 },

  row: { flexDirection: 'row' as const, marginBottom: 12 },
  line: {
    width: 3,
    borderRadius: 2,
    backgroundColor: c.primarySurfaceBorder,
    marginRight: 12,
    minHeight: 48,
  },
  card: {
    flex: 1,
    backgroundColor: c.muted,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  body: { fontSize: 14, color: c.textPrimary, lineHeight: 20 },
  meta: { fontSize: 11, color: c.textSecondary, marginTop: 8 },

  compose: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.textPrimary,
    backgroundColor: c.inputBg,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  volHint: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center' as const,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});

export default function DisasterTimelineScreen() {
  const disasterStyles = useDisasterStyles();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [items, setItems] = useState<DisasterUpdateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [volunteerApproved, setVolunteerApproved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [rows, v] = await Promise.all([
        getDisasterUpdates(id),
        user?.id ? getVolunteerProfile(user.id) : Promise.resolve(null),
      ]);
      setItems(rows);
      setVolunteerApproved(profile?.role === 'volunteer' && v?.verification_status === 'approved');
    } finally {
      setLoading(false);
    }
  }, [id, profile?.role, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitUpdate = async () => {
    if (!user?.id || !id || text.trim().length < 3) return;
    setSending(true);
    try {
      const row = await addUpdate(id, text.trim(), user.id);
      setItems((prev) => [...prev, row]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={disasterStyles.screenBgWhite} edges={['top']}>
      <View style={disasterStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={disasterStyles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={disasterStyles.headerTitle}>Timeline</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={88}
        >
          <FlatList
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            data={[...items].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.line} />
                <View style={styles.card}>
                  <Text style={styles.body}>{item.body_text}</Text>
                  <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No updates yet.</Text>}
          />

          {volunteerApproved ? (
            <View style={styles.compose}>
              <TextInput
                style={styles.input}
                placeholder="Add an update for responders..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={text}
                onChangeText={setText}
              />
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.7 }]}
                disabled={sending || text.trim().length < 3}
                onPress={() => void submitUpdate()}
              >
                <Ionicons name="send" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.volHint}>Volunteers can post updates here.</Text>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
