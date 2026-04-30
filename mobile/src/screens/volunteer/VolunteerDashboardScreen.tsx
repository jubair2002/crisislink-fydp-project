import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { getVolunteerProfile } from '../../services/profileService';
import { getDisastersNearby } from '../../services/disasterService';
import { getCurrentLocation, startTracking, stopTracking } from '../../services/locationService';
import IncomingTaskPopup from './IncomingTaskPopup';
import {
  acceptTask,
  declineTask,
  getTasksForVolunteer,
  processAssignmentTimeout,
  setAvailabilityStatus,
  subscribeTaskUpdates,
  subscribeVolunteerAssignments,
  getTaskForAssignmentPopup,
  type TaskRow,
  type TaskWithAssignment,
} from '../../services/taskService';

type ActivePopupTask = {
  taskId: string;
  assignmentId: string;
  taskType: string;
  disasterType: string;
  severity: string;
  distanceKm: number | null;
};

export default function VolunteerDashboardScreen() {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline'>('offline');
  const [workStatus, setWorkStatus] = useState<'available' | 'busy'>('available');
  const [tasks, setTasks] = useState<TaskWithAssignment[]>([]);
  const [nearby, setNearby] = useState<
    Array<{ id: string; disaster_type: string; severity: string; latitude: number; longitude: number }>
  >([]);
  const [stats, setStats] = useState({ completed: 0, rating: 0 });
  const [popupTask, setPopupTask] = useState<ActivePopupTask | null>(null);
  const [taskCache, setTaskCache] = useState<Record<string, TaskRow>>({});
  const [selectedView, setSelectedView] = useState<'dashboard' | 'list' | 'detail'>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const activeTaskCount = useMemo(
    () => tasks.filter((t) => t.task.status !== 'completed' && t.assignment.status !== 'declined').length,
    [tasks],
  );
  const firstActiveTask = useMemo(
    () =>
      tasks.find(
        (t) =>
          t.task.status !== 'completed' &&
          t.assignment.status !== 'declined' &&
          t.assignment.status !== 'timeout',
      ) ?? null,
    [tasks],
  );

  const load = useCallback(async () => {
    if (!userId || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const [volunteer, rows] = await Promise.all([getVolunteerProfile(userId), getTasksForVolunteer(userId)]);

      setTasks(rows);
      if (!popupTask) {
        const pending = rows.find((r) => r.assignment.status === 'assigned');
        if (pending) {
          setPopupTask({
            taskId: pending.task.id,
            assignmentId: pending.assignment.id,
            taskType: pending.task.task_type ?? 'Emergency response',
            disasterType: pending.task.disaster?.disaster_type ?? 'unknown',
            severity: pending.task.disaster?.severity ?? 'medium',
            distanceKm: pending.distanceKm,
          });
        }
      }
      setStats({
        completed: volunteer?.tasks_completed ?? 0,
        rating: volunteer?.rating ?? 0,
      });

      if (volunteer?.availability_status === 'offline') {
        setOnlineStatus('offline');
      } else if (volunteer?.availability_status === 'busy') {
        setOnlineStatus('online');
        setWorkStatus('busy');
      } else {
        setOnlineStatus('online');
        setWorkStatus('available');
      }

      // Do not block dashboard rendering on location permission or GPS resolution.
      void (async () => {
        try {
          const loc = await getCurrentLocation();
          if (!loc) {
            setNearby([]);
            return;
          }
          const disasters = await getDisastersNearby(loc.lat, loc.lng, 10);
          setNearby(
            disasters.slice(0, 5).map((d) => ({
              id: d.id,
              disaster_type: d.disaster_type,
              severity: d.severity,
              latitude: d.latitude,
              longitude: d.longitude,
            })),
          );
        } catch {
          setNearby([]);
        }
      })();
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [popupTask, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const unsubAssignments = subscribeVolunteerAssignments(userId, ({ event, assignment }) => {
      if (
        (event === 'INSERT' || event === 'UPDATE') &&
        assignment.status === 'assigned' &&
        assignment.task_id
      ) {
        void (async () => {
          const cachedTask = taskCache[assignment.task_id];
          const liveTask = cachedTask ?? (await getTaskForAssignmentPopup(assignment.task_id));
          const disaster = liveTask?.disaster;
          setPopupTask({
            taskId: assignment.task_id,
            assignmentId: assignment.id,
            taskType: liveTask?.task_type ?? 'Emergency response',
            disasterType: disaster?.disaster_type ?? 'unknown',
            severity: disaster?.severity ?? 'medium',
            distanceKm: null,
          });
        })();
      }
      if (!isLoadingRef.current) void load();
    });

    const unsubTasks = subscribeTaskUpdates(({ task }) => {
      setTaskCache((prev) => ({ ...prev, [task.id]: task }));
      if (!isLoadingRef.current) void load();
    });
    return () => {
      unsubAssignments();
      unsubTasks();
    };
  }, [load, taskCache, userId]);

  const updateAvailability = async (
    online: 'online' | 'offline',
    work: 'available' | 'busy' = workStatus,
  ) => {
    if (!userId) return;
    setBusy(true);
    try {
      const status = online === 'offline' ? 'offline' : work;
      await setAvailabilityStatus(userId, status);
      setOnlineStatus(online);
      setWorkStatus(work);

      if (online === 'online' && work === 'available') {
        await startTracking(userId);
      } else {
        await stopTracking();
      }
    } finally {
      setBusy(false);
    }
  };

  const onAcceptIncoming = async () => {
    if (!popupTask || !userId) return;
    await acceptTask(popupTask.taskId, userId);
    setPopupTask(null);
    await load();
  };

  const onDeclineIncoming = async () => {
    if (!popupTask || !userId) return;
    await declineTask(popupTask.taskId, userId);
    setPopupTask(null);
    await load();
  };

  const onTimeoutIncoming = async () => {
    if (!popupTask || !userId) return;
    await processAssignmentTimeout(popupTask.taskId, userId);
    setPopupTask(null);
    await load();
  };

  if (selectedView === 'list') {
    const TaskListScreen = require('./TaskListScreen').default as React.ComponentType<{
      onBack?: () => void;
      onOpenTask?: (taskId: string) => void;
    }>;
    return (
      <TaskListScreen
        onBack={() => setSelectedView('dashboard')}
        onOpenTask={(taskId: string) => {
          setSelectedTaskId(taskId);
          setSelectedView('detail');
        }}
      />
    );
  }

  if (selectedView === 'detail' && selectedTaskId) {
    const TaskDetailScreen = require('./TaskDetailScreen').default as React.ComponentType<{
      taskId: string;
      onBack?: () => void;
    }>;
    return <TaskDetailScreen taskId={selectedTaskId} onBack={() => setSelectedView('dashboard')} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <IncomingTaskPopup
        visible={!!popupTask}
        disasterType={popupTask?.disasterType ?? ''}
        severity={popupTask?.severity ?? 'medium'}
        distanceKm={popupTask?.distanceKm ?? null}
        taskType={popupTask?.taskType ?? ''}
        onAccept={() => void onAcceptIncoming()}
        onDecline={() => void onDeclineIncoming()}
        onTimeout={() => void onTimeoutIncoming()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Volunteer Dashboard</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => void load()}>
            <Ionicons name="refresh" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Availability</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggle, onlineStatus === 'online' && styles.toggleOn]}
                  disabled={busy}
                  onPress={() => void updateAvailability('online', workStatus)}
                >
                  <Text style={[styles.toggleText, onlineStatus === 'online' && styles.toggleTextOn]}>
                    Online
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, onlineStatus === 'offline' && styles.toggleOn]}
                  disabled={busy}
                  onPress={() => void updateAvailability('offline')}
                >
                  <Text style={[styles.toggleText, onlineStatus === 'offline' && styles.toggleTextOn]}>
                    Offline
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggle, workStatus === 'available' && styles.toggleOn]}
                  disabled={busy || onlineStatus === 'offline'}
                  onPress={() => void updateAvailability('online', 'available')}
                >
                  <Text style={[styles.toggleText, workStatus === 'available' && styles.toggleTextOn]}>
                    Available
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, workStatus === 'busy' && styles.toggleOn]}
                  disabled={busy || onlineStatus === 'offline'}
                  onPress={() => void updateAvailability('online', 'busy')}
                >
                  <Text style={[styles.toggleText, workStatus === 'busy' && styles.toggleTextOn]}>Busy</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="clipboard-outline" size={18} color={Colors.primary} />
                <Text style={styles.statValue}>{activeTaskCount}</Text>
                <Text style={styles.statLabel}>Active tasks</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-done-outline" size={18} color={Colors.success} />
                <Text style={styles.statValue}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="star-outline" size={18} color="#D97706" />
                <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Nearby Disasters</Text>
                <Text style={styles.cardSub}>{nearby.length} nearby</Text>
              </View>
              <View style={styles.mapWrap}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: nearby[0]?.latitude ?? 23.8103,
                    longitude: nearby[0]?.longitude ?? 90.4125,
                    latitudeDelta: 0.2,
                    longitudeDelta: 0.2,
                  }}
                >
                  {nearby.map((d) => (
                    <Marker
                      key={d.id}
                      coordinate={{ latitude: d.latitude, longitude: d.longitude }}
                      title={d.disaster_type.replace(/_/g, ' ')}
                      description={`Severity: ${d.severity}`}
                    />
                  ))}
                </MapView>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedView('list')}>
                  <Text style={styles.actionText}>Open Task List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, !firstActiveTask && styles.actionBtnDisabled]}
                  disabled={!firstActiveTask}
                  onPress={() => {
                    if (!firstActiveTask) return;
                    setSelectedTaskId(firstActiveTask.task.id);
                    setSelectedView('detail');
                  }}
                >
                  <Text style={styles.actionText}>Open Active Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 23, fontWeight: '800', color: Colors.textPrimary },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { marginTop: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  cardSub: { color: Colors.textSecondary, fontSize: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleOn: { backgroundColor: '#EFF6FF', borderColor: Colors.primary },
  toggleText: { color: Colors.textSecondary, fontWeight: '700' },
  toggleTextOn: { color: Colors.primary },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  mapWrap: { height: 170, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  actionText: { color: Colors.primary, fontWeight: '700' },
});
