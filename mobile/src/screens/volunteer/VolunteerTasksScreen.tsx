import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';

type ComingSoonRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
};

const SECTIONS: ComingSoonRow[] = [
  {
    icon: 'clipboard-outline',
    title: 'Assigned tasks',
    subtitle: 'Accept and complete missions tied to verified disasters.',
  },
  {
    icon: 'navigate-outline',
    title: 'Field navigation',
    subtitle: 'Turn-by-turn routing to incident sites from the live map.',
  },
  {
    icon: 'people-outline',
    title: 'Team coordination',
    subtitle: 'See who else is responding and split coverage zones.',
  },
  {
    icon: 'bar-chart-outline',
    title: 'Impact summary',
    subtitle: 'Hours volunteered and outcomes logged after verification.',
  },
];

export default function VolunteerTasksScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="hammer-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Volunteer tasks</Text>
          <Text style={styles.heroSub}>
            Your assignment inbox and response tools will live here. We&apos;re finishing the backend
            hooks next.
          </Text>
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={14} color="#92400E" />
            <Text style={styles.pillText}>Coming soon</Text>
          </View>
        </View>

        {SECTIONS.map((row) => (
          <View key={row.title} style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name={row.icon} size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{row.title}</Text>
              <Text style={styles.cardSub}>{row.subtitle}</Text>
              <Text style={styles.cardSoon}>Coming soon</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  hero: {
    paddingVertical: 20,
    gap: 10,
    alignItems: 'flex-start',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillText: { fontSize: 12, fontWeight: '800', color: '#92400E' },

  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  cardSoon: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
