import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function DisastersScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="warning-outline" size={64} color="#CBD5E1" />
      <Text style={styles.title}>Disaster Map</Text>
      <Text style={styles.sub}>Coming soon — live disaster reports and map view</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
