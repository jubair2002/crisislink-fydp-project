import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors } from '../constants/colors';

interface HomeSubScreenProps {
  title: string;
  children?: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export function goBackToHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/(main)/');
}

export function HomeSubScreen({
  title,
  children,
  scroll = true,
  contentContainerStyle,
}: HomeSubScreenProps) {
  const body = children ?? (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Coming soon.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBackToHome}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>

      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, contentContainerStyle]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { width: 42 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  scroll: { flexGrow: 1, padding: 24 },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
