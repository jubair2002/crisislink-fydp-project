import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../store/toastStore';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

export function ToastHost() {
  const { colors } = useTheme();
  const message = useToastStore((s) => s.message);
  const durationMs = useToastStore((s) => s.durationMs);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const styles = useThemedStyles((c) => ({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 9999,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      maxWidth: '100%',
      backgroundColor: c.elevated,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
    text: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.textPrimary,
      lineHeight: 18,
    },
  }));

  useEffect(() => {
    if (!message) return;

    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(durationMs),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => hide());

    return () => {
      opacity.setValue(0);
    };
  }, [message, durationMs, hide, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + 8, opacity },
      ]}
    >
      <View style={styles.bar}>
        <Ionicons name="notifications-outline" size={18} color={colors.primary} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
