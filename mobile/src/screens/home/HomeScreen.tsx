import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import CitizenHomeScreen from './CitizenHomeScreen';
import VolunteerHomeScreen from './VolunteerHomeScreen';
import { SectionSkeleton } from './homeShared';

function FullHomeSkeleton() {
  return (
    <SafeAreaView style={styles.skelWrap} edges={['top']}>
      <View style={styles.skelHeader}>
        <View style={styles.skelAvatar} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[styles.skelLine, { width: '40%' }]} />
          <View style={[styles.skelLine, { width: '65%' }]} />
        </View>
        <View style={styles.skelBell} />
      </View>
      <SectionSkeleton rows={4} />
      <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const profile = useAuthStore((s) => s.profile);

  if (isLoading || !profile) {
    return <FullHomeSkeleton />;
  }

  if (profile.role === 'volunteer') {
    return <VolunteerHomeScreen />;
  }

  return <CitizenHomeScreen />;
}

const styles = StyleSheet.create({
  skelWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  skelAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0',
  },
  skelBell: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#E2E8F0' },
  skelLine: { height: 14, borderRadius: 7, backgroundColor: '#E2E8F0' },
});
