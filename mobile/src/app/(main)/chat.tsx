import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';

export default function ChatPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
      <Text style={styles.title}>Community chat</Text>
      <Text style={styles.sub}>This space will connect neighbors and responders — coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
