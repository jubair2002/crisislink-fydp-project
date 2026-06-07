import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { MAP_DARK_STYLE, type ThemeColors } from '../../constants/themes';
import { useAuthStore } from '../../store/authStore';
import {
  completeTask,
  getTasksForVolunteer,
  requestBackup,
  startTask,
  type TaskWithAssignment,
} from '../../services/taskService';

interface TaskDetailScreenProps {
  taskId?: string;
  onBack?: () => void;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { color: c.textSecondary },
    scroll: { padding: 16, gap: 12, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 23, fontWeight: '800', color: c.textPrimary },
    subtitle: { color: c.textSecondary, textTransform: 'capitalize' },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      gap: 6,
    },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    meta: { fontSize: 12, color: c.textSecondary, textTransform: 'capitalize' },
    description: { marginTop: 4, fontSize: 13, color: c.textPrimary, lineHeight: 18 },
    mapWrap: { height: 170, borderRadius: 14, overflow: 'hidden' },
    map: { flex: 1 },
    uploadBtn: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: c.primarySurfaceBorder,
      borderRadius: 10,
      backgroundColor: c.primarySurface,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    uploadText: { color: c.primary, fontWeight: '700' },
    preview: { marginTop: 8, width: '100%', height: 150, borderRadius: 10 },
    noteInput: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      backgroundColor: c.inputBg,
      minHeight: 90,
      padding: 10,
      textAlignVertical: 'top',
      color: c.textPrimary,
    },
    actions: { gap: 10, marginTop: 4 },
    primaryBtn: { backgroundColor: c.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    successBtn: { backgroundColor: c.success, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    primaryText: { color: c.onPrimary, fontWeight: '800' },
    warnBtn: {
      backgroundColor: c.warningSurface,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      borderColor: c.warningSurfaceBorder,
      borderWidth: 1,
    },
    warnText: { color: c.warning, fontWeight: '800' },
  });

export default function TaskDetailScreen({ taskId, onBack }: TaskDetailScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<TaskWithAssignment | null>(null);
  const [note, setNote] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskId || !userId) return;
    setLoading(true);
    try {
      const all = await getTasksForVolunteer(userId);
      setTask(all.find((x) => x.task.id === taskId) ?? null);
    } finally {
      setLoading(false);
    }
  }, [taskId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) setProofUri(result.assets[0].uri);
  };

  const onStartTask = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await startTask(task.task.id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onCompleteTask = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await completeTask(task.task.id, proofUri, note);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onBackup = async () => {
    if (!task || !userId) return;
    setSaving(true);
    try {
      await requestBackup(task.task.id, userId);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.empty}>Task not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const disaster = task.task.disaster;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
        persistentScrollbar
        indicatorStyle={isDark ? 'white' : 'default'}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (onBack ? onBack() : router.back())}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Task Detail</Text>
            <Text style={styles.subtitle}>{task.task.task_type.replace(/_/g, ' ')}</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => void load()}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Disaster Details</Text>
          <Text style={styles.meta}>Type: {disaster?.disaster_type?.replace(/_/g, ' ') ?? 'Unknown'}</Text>
          <Text style={styles.meta}>Severity: {disaster?.severity ?? 'Unknown'}</Text>
          <Text style={styles.meta}>Priority: {task.task.priority}</Text>
          <Text style={styles.meta}>
            Team: {task.acceptedCount} of {Math.max(1, task.task.required_volunteers)} volunteers assigned
          </Text>
          <Text style={styles.description}>{disaster?.description ?? 'No disaster description.'}</Text>
        </View>

        {disaster && (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              customMapStyle={isDark ? MAP_DARK_STYLE : undefined}
              initialRegion={{
                latitude: disaster.latitude,
                longitude: disaster.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: disaster.latitude, longitude: disaster.longitude }} />
            </MapView>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Completion Proof</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickProof}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={styles.uploadText}>{proofUri ? 'Change photo' : 'Upload photo proof'}</Text>
          </TouchableOpacity>
          {proofUri && <Image source={{ uri: proofUri }} style={styles.preview} />}
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add completion notes..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </View>

        <View style={styles.actions}>
          {task.task.status !== 'in_progress' && task.task.status !== 'completed' && (
            <TouchableOpacity style={styles.primaryBtn} disabled={saving} onPress={onStartTask}>
              <Text style={styles.primaryText}>Start Task</Text>
            </TouchableOpacity>
          )}
          {task.task.status !== 'completed' && (
            <TouchableOpacity style={styles.successBtn} disabled={saving} onPress={onCompleteTask}>
              <Text style={styles.primaryText}>Complete Task</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.warnBtn} disabled={saving} onPress={onBackup}>
            <Text style={styles.warnText}>Request Backup</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
