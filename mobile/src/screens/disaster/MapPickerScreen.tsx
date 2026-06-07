import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { MAP_DARK_STYLE } from '../../constants/themes';
import type { ThemeColors } from '../../constants/themes';
import { useDisasterStyles } from './disasterStyles';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

const createStyles = (c: ThemeColors) => ({
  root: { flex: 1, backgroundColor: c.background },
  map: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
  },
  coordText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' as const },
});

export default function MapPickerScreen() {
  const disasterStyles = useDisasterStyles();
  const styles = useThemedStyles(createStyles);
  const { colors, isDark, primaryGradient } = useTheme();

  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const initialLat = params.lat != null ? Number(params.lat) : DEFAULT_LAT;
  const initialLng = params.lng != null ? Number(params.lng) : DEFAULT_LNG;

  const [coord, setCoord] = useState({
    latitude: Number.isFinite(initialLat) ? initialLat : DEFAULT_LAT,
    longitude: Number.isFinite(initialLng) ? initialLng : DEFAULT_LNG,
  });

  const confirm = () => {
    router.replace({
      pathname: '/(main)/disasters/report',
      params: {
        pickedLat: String(coord.latitude),
        pickedLng: String(coord.longitude),
      },
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={disasterStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={disasterStyles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={disasterStyles.headerTitle}>Pick location</Text>
      </View>

      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: coord.latitude,
          longitude: coord.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        customMapStyle={isDark ? MAP_DARK_STYLE : undefined}
        onPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
          setCoord({
            latitude: e.nativeEvent.coordinate.latitude,
            longitude: e.nativeEvent.coordinate.longitude,
          })
        }
      >
        <Marker
          coordinate={coord}
          draggable
          onDragEnd={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
            setCoord({
              latitude: e.nativeEvent.coordinate.latitude,
              longitude: e.nativeEvent.coordinate.longitude,
            })
          }
        />
      </MapView>

      <View style={styles.footer}>
        <Text style={styles.coordText}>
          {coord.latitude.toFixed(5)}, {coord.longitude.toFixed(5)}
        </Text>
        <TouchableOpacity style={disasterStyles.primaryBtn} onPress={confirm} activeOpacity={0.88}>
          <LinearGradient colors={primaryGradient} style={disasterStyles.primaryBtnGradientWrap}>
            <Text style={disasterStyles.primaryBtnText}>Confirm location</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
