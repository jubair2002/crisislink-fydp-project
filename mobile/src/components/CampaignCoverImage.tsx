import React from 'react';
import { View, Image, type ViewStyle, type ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  uri?: string | null;
  height?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  rounded?: number;
};

export function CampaignCoverImage({
  uri,
  height = 140,
  style,
  imageStyle,
  rounded = 12,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    placeholder: {
      width: '100%',
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }));

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          { height, borderRadius: rounded, width: '100%' },
          imageStyle,
          style as ImageStyle,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { height, borderRadius: rounded },
        style,
      ]}
    >
      <Ionicons name="heart" size={32} color={colors.primary} />
    </View>
  );
}
