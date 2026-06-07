import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { MAP_DARK_STYLE } from '../../constants/themes';
import type { ThemeColors } from '../../constants/themes';
import { SEVERITY_MARKER_COLORS } from '../../constants/disasterUi';
import { DISASTER_TYPE_OPTIONS } from '../../types/profile';
import { useDisasterStyles } from './disasterStyles';
import { getAllDisasters, haversineMeters, subscribeDisastersRealtime } from '../../services/disasterService';
import { useDisasterStore } from '../../store/disasterStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { DisasterSeverity } from '../../types/disaster';

const NEARBY_TOAST_KM = 45;

const SEVERITY_OPTIONS: { value: DisasterSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Crit' },
];

const createStyles = (c: ThemeColors, isDark: boolean) => ({
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 6,
    gap: 12,
  },
  screenTitle: { flex: 1, fontSize: 22, fontWeight: '800' as const, color: c.textPrimary, letterSpacing: -0.4 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.muted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modeSwitch: {
    flexDirection: 'row' as const,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  modeBtnOn: {
    backgroundColor: c.primarySurface,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: c.textSecondary,
  },
  modeTextOn: {
    color: c.primary,
  },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: 'center' as const },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  chipOn: { borderColor: c.primary, backgroundColor: c.primarySurface },
  chipText: { fontSize: 12, fontWeight: '700' as const, color: c.textSecondary },
  chipTextOn: { color: c.primary },

  mapWrap: { flex: 1, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden' as const },
  listWrap: { flex: 1, marginBottom: 12 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: isDark ? 'rgba(11,18,32,0.75)' : 'rgba(248,250,252,0.65)',
    zIndex: 2,
  },
  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 12,
    gap: 6,
  },
  reportTopRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
  reportType: { fontSize: 14, fontWeight: '800' as const, color: c.textPrimary, textTransform: 'capitalize' as const },
  reportMeta: { fontSize: 12, color: c.textSecondary },
  reportBody: { fontSize: 13, color: c.textPrimary, lineHeight: 18 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  reportedPill: { backgroundColor: c.warningSurface },
  verifiedPill: { backgroundColor: c.successSurface },
  statusPillText: { fontSize: 11, fontWeight: '700' as const, color: c.textPrimary, textTransform: 'capitalize' as const },
  emptyText: { textAlign: 'center' as const, marginTop: 40, color: c.textSecondary },

  fab: {
    position: 'absolute' as const,
    right: 14,
    bottom: 14,
    borderRadius: 28,
    overflow: 'hidden' as const,
    elevation: 8,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 3,
  },
  fabGrad: {
    width: 56,
    height: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});

export default function DisasterMapScreen() {
  const disasterStyles = useDisasterStyles();
  const styles = useThemedStyles(createStyles);
  const { colors, isDark, primaryGradient } = useTheme();

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
          <Ionicons name="refresh" size={18} color={colors.primary} />
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
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            showsUserLocation
            customMapStyle={isDark ? MAP_DARK_STYLE : undefined}
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
            <LinearGradient colors={primaryGradient} style={styles.fabGrad}>
              <Ionicons name="add" size={28} color={colors.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
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

    </SafeAreaView>
  );
}
