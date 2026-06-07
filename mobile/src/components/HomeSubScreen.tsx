import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

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
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.background },
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
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backSpacer: { width: 42 },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    scroll: { flexGrow: 1, padding: 24 },
    placeholder: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 48,
    },
    placeholderText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
    },
  }));

  const body = children ?? (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Coming soon.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBackToHome}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
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
