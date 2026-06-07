import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { MAP_DARK_STYLE, type ThemeColors } from '../../constants/themes';
import { startTask } from '../../services/taskService';

interface TaskNavigationScreenProps {
  taskId: string;
  destination: { latitude: number; longitude: number };
  onBack?: () => void;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { flex: 1, fontSize: 22, fontWeight: '800', color: c.textPrimary },
    sub: { color: c.textSecondary },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapWrap: {
      flex: 1,
      margin: 16,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    map: { flex: 1 },
    arrivalBtn: {
      marginHorizontal: 16,
      marginBottom: 20,
      borderRadius: 10,
      backgroundColor: c.success,
      paddingVertical: 12,
      alignItems: 'center',
    },
    arrivalText: { color: c.onPrimary, fontWeight: '800' },
  });

export default function TaskNavigationScreen({ taskId, destination, onBack }: TaskNavigationScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(true);
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [arrived, setArrived] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let mounted = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10_000,
            distanceInterval: 10,
          },
          (position) => {
            if (!mounted) return;
            setUserCoord({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [refreshTick]);

  const distKm = useMemo(() => {
    if (!userCoord) return null;
    return distanceKm(
      userCoord.latitude,
      userCoord.longitude,
      destination.latitude,
      destination.longitude,
    );
  }, [destination.latitude, destination.longitude, userCoord]);

  const onArrive = async () => {
    await startTask(taskId);
    setArrived(true);
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (onBack ? onBack() : router.back())}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Task Navigation</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setRefreshTick((x) => x + 1)}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>Distance: {distKm === null ? 'Unknown' : `${distKm.toFixed(2)} km`}</Text>
      </View>
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          customMapStyle={isDark ? MAP_DARK_STYLE : undefined}
          initialRegion={{
            latitude: userCoord?.latitude ?? destination.latitude,
            longitude: userCoord?.longitude ?? destination.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          showsUserLocation
        >
          <Marker coordinate={destination} title="Task location" />
          {userCoord && (
            <Polyline coordinates={[userCoord, destination]} strokeColor={colors.primary} strokeWidth={3} />
          )}
        </MapView>
      </View>
      <TouchableOpacity style={styles.arrivalBtn} onPress={onArrive} disabled={arrived}>
        <Text style={styles.arrivalText}>{arrived ? 'Arrived - Task Started' : 'Mark Arrival'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
