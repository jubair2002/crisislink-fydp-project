import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { SEVERITY_MARKER_COLORS } from '../../constants/disasterUi';
import { DISASTER_TYPE_OPTIONS } from '../../types/profile';
import { disasterStyles } from './disasterStyles';
import { getAllDisasters, haversineMeters, subscribeDisastersRealtime } from '../../services/disasterService';
import { useDisasterStore } from '../../store/disasterStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import type { DisasterSeverity } from '../../types/disaster';

const NEARBY_TOAST_KM = 45;

const SEVERITY_OPTIONS: { value: DisasterSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Crit' },
];

export default function DisasterMapScreen() {
  const filters = useDisasterStore((s) => s.filters);
  const disasters = useDisasterStore((s) => s.disasters);
  const setDisasters = useDisasterStore((s) => s.setDisasters);
  const upsertDisaster = useDisasterStore((s) => s.upsertDisaster);
  const setFilter = useDisasterStore((s) => s.setFilter);
  const isLoading = useDisasterStore((s) => s.isLoading);
  const setLoading = useDisasterStore((s) => s.setLoading);
  const showToast = useToastStore((s) => s.show);
  const authUserId = useAuthStore((s) => s.user?.id);

  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const unsubRef = useRef<(() => void) | null>(null);

  const filtered = useMemo(() => {
    let rows = disasters.filter(
      (d) => d.status !== 'resolved' && d.status !== 'rejected' && d.status !== 'false_report',
    );
    if (filters.disaster_type) rows = rows.filter((d) => d.disaster_type === filters.disaster_type);
    if (filters.severity) rows = rows.filter((d) => d.severity === filters.severity);
    return rows;
  }, [disasters, filters.disaster_type, filters.severity]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllDisasters({
        status: [
          'verified',
          'reported',
          'under_verification',
          'response_in_progress',
          'false_report',
          'resolved',
        ],
      });
      setDisasters(rows);
    } catch (e) {
      console.warn('[DisasterMapScreen] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [setDisasters, setLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setUserCoord({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = subscribeDisastersRealtime(({ eventType, row }) => {
      if (!row) return;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        upsertDisaster(row);
        if (eventType === 'INSERT') {
          if (authUserId && row.reporter_user_id === authUserId) return;
          if (userCoord) {
            const m = haversineMeters(
              userCoord.latitude,
              userCoord.longitude,
              row.latitude,
              row.longitude,
            );
            if (m / 1000 <= NEARBY_TOAST_KM) showToast('New disaster reported nearby');
          } else {
            showToast('New disaster reported nearby');
          }
        }
      }
    });
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [upsertDisaster, showToast, userCoord, authUserId]);

  const initialRegion = useMemo(() => {
    if (userCoord) {
      return {
        ...userCoord,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };
    }
    return {
      latitude: 23.8103,
      longitude: 90.4125,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
  }, [userCoord]);

  const openDetail = (id: string) => {
    router.push(`/(main)/disasters/detail/${id}`);
  };

  return (
    <SafeAreaView style={disasterStyles.screenBg} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Live map</Text>
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'map' && styles.modeBtnOn]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.modeText, viewMode === 'map' && styles.modeTextOn]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'list' && styles.modeBtnOn]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.modeText, viewMode === 'list' && styles.modeTextOn]}>List</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => void load()} style={styles.iconBtn}>
          <Ionicons name="refresh" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={{ maxHeight: 48, marginBottom: 8 }}
      >
        <TouchableOpacity
          style={[styles.chip, !filters.disaster_type && styles.chipOn]}
          onPress={() => setFilter({ disaster_type: undefined })}
        >
          <Text style={[styles.chipText, !filters.disaster_type && styles.chipTextOn]}>All types</Text>
        </TouchableOpacity>
        {DISASTER_TYPE_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, filters.disaster_type === t.value && styles.chipOn]}
            onPress={() => setFilter({ disaster_type: t.value })}
          >
            <Text style={[styles.chipText, filters.disaster_type === t.value && styles.chipTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={{ maxHeight: 44, marginBottom: 6 }}
      >
        <TouchableOpacity
          style={[styles.chip, !filters.severity && styles.chipOn]}
          onPress={() => setFilter({ severity: undefined })}
        >
          <Text style={[styles.chipText, !filters.severity && styles.chipTextOn]}>All severity</Text>
        </TouchableOpacity>
        {SEVERITY_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, filters.severity === s.value && styles.chipOn]}
            onPress={() => setFilter({ severity: s.value })}
          >
            <Text style={[styles.chipText, filters.severity === s.value && styles.chipTextOn]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {viewMode === 'map' ? (
        <View style={styles.mapWrap}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            showsUserLocation
          >
            {filtered.map((d) => (
              <Marker
                key={d.id}
                coordinate={{ latitude: d.latitude, longitude: d.longitude }}
                pinColor={SEVERITY_MARKER_COLORS[d.severity]}
                onCalloutPress={() => openDetail(d.id)}
                onPress={() => openDetail(d.id)}
              />
            ))}
          </MapView>

          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.9}
            onPress={() => router.push('/(main)/disasters/report')}
          >
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.fabGrad}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18, gap: 10 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No reports found for current filters.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.reportCard} onPress={() => openDetail(item.id)} activeOpacity={0.85}>
                  <View style={styles.reportTopRow}>
                    <Text style={styles.reportType}>{String(item.disaster_type).replace(/_/g, ' ')}</Text>
                    <View style={[styles.statusPill, item.status === 'reported' ? styles.reportedPill : styles.verifiedPill]}>
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportMeta}>
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </Text>
                  <Text numberOfLines={2} style={styles.reportBody}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      <Text style={styles.legendNote}>
        Showing reported + verified reports for authenticated users
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 12,
  },
  screenTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  modeBtnOn: {
    backgroundColor: '#EFF6FF',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeTextOn: {
    color: Colors.primary,
  },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextOn: { color: Colors.primary },

  mapWrap: { flex: 1, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  listWrap: { flex: 1, marginBottom: 12 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,250,252,0.65)',
    zIndex: 2,
  },
  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  reportTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reportType: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textTransform: 'capitalize' },
  reportMeta: { fontSize: 12, color: Colors.textSecondary },
  reportBody: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  reportedPill: { backgroundColor: '#FEF3C7' },
  verifiedPill: { backgroundColor: '#DCFCE7' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
  emptyText: { textAlign: 'center', marginTop: 40, color: Colors.textSecondary },

  fab: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 3,
  },
  fabGrad: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  legendNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
});
