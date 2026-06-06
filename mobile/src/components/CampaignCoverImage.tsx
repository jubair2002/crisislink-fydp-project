import React from 'react';
import { View, Image, StyleSheet, type ViewStyle, type ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

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
      <Ionicons name="heart" size={32} color="#93C5FD" />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
