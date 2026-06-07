import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { getGlobalChannels, joinChannel } from '../../services/chatService';
import type { Chat } from '../../types/chat';
import { ChatTopBar } from './chatShared';

export default function GlobalChannelsScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [channels, setChannels] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getGlobalChannels(profile?.role);
      setChannels(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = async (channel: Chat) => {
    if (!user) return;
    setJoiningId(channel.id);
    try {
      await joinChannel(channel.id, user.id);
      router.push(`/(main)/chat/${channel.id}`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not join channel.');
    } finally {
      setJoiningId(null);
    }
  };

  const renderItem = ({ item }: { item: Chat }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="globe-outline" size={24} color={Colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={3}>
          {item.description ?? 'Public community channel.'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.joinBtn}
        onPress={() => handleJoin(item)}
        disabled={joiningId === item.id}
      >
        {joiningId === item.id ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Text style={styles.joinText}>Join</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ChatTopBar title="Global channels" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListHeaderComponent={
            <Text style={styles.headerNote}>
              Anyone can join and post in these public channels. Citizens, volunteers, and admins are welcome.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  headerNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    justifyContent: 'center',
  },
  joinText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
