import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
} from 'react-native';
import { BlurView } from 'expo-blur';

const SIZE = 44;

type Props = Pick<TouchableOpacityProps, 'onPress' | 'disabled'> & {
  children: React.ReactNode;
  accessibilityLabel?: string;
};

/** Circular frosted control (blur on native; soft glass fallback on web). */
export function HeaderGlassCircleButton({
  onPress,
  disabled,
  children,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.touch}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <View style={styles.circle}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFillObject, styles.webGlass]} />
        ) : (
          <BlurView intensity={52} tint="light" style={StyleSheet.absoluteFillObject} />
        )}
        <View style={styles.iconLayer} pointerEvents="none">
          {children}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  webGlass: {
    backgroundColor: 'rgba(248, 250, 252, 0.92)',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
