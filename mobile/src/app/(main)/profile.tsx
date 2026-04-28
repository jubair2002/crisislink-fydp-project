import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { profile } = useAuthStore();
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.name}>{profile?.name ?? 'User'}</Text>
      <Text style={styles.email}>{profile?.email ?? ''}</Text>
      <Text style={styles.sub}>Full profile editing coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  email: { fontSize: 14, color: Colors.textSecondary },
  sub: { fontSize: 13, color: '#94A3B8', marginTop: 8 },
});
