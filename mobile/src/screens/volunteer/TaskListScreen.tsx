import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { getTasksForVolunteer, type TaskWithAssignment } from '../../services/taskService';

const FILTERS = ['all', 'assigned', 'accepted', 'in_progress', 'completed'] as const;
type FilterValue = (typeof FILTERS)[number];

interface TaskListScreenProps {
  onBack?: () => void;
  onOpenTask?: (taskId: string) => void;
}

export default function TaskListScreen({ onBack, onOpenTask }: TaskListScreenProps) {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [rows, setRows] = useState<TaskWithAssignment[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const tasks = await getTasksForVolunteer(userId);
      setRows(tasks);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((x) => x.task.status === filter || x.assignment.status === filter);
  }, [filter, rows]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => (onBack ? onBack() : router.back())}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Volunteer Tasks</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => void load()}>
          <Ionicons name="refresh" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filter, filter === f && styles.filterOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.assignment.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 36 }}
          ListEmptyComponent={<Text style={styles.empty}>No tasks found for this status.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (onOpenTask) {
                  onOpenTask(item.task.id);
                  return;
                }
                router.push({
                  pathname: '/(main)/tasks',
                  params: { taskId: item.task.id, view: 'detail' },
                });
              }}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.disasterType}>
                  {(item.task.disaster?.disaster_type ?? 'unknown').replace(/_/g, ' ')}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.task.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Priority: {item.task.priority}</Text>
              <Text style={styles.meta}>
                Distance: {item.distanceKm === null ? 'unknown' : `${item.distanceKm.toFixed(2)} km`}
              </Text>
              <Text style={styles.groupMeta}>
                {item.acceptedCount} of {Math.max(item.task.required_volunteers, 1)} volunteers assigned
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  filter: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  filterOn: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  filterText: { textTransform: 'capitalize', color: Colors.textSecondary, fontWeight: '700', fontSize: 12 },
  filterTextOn: { color: Colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 36 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 5,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disasterType: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textTransform: 'capitalize' },
  meta: { color: Colors.textSecondary, fontSize: 12 },
  groupMeta: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  badge: { backgroundColor: '#DBEAFE', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1E3A8A', textTransform: 'capitalize' },
});
