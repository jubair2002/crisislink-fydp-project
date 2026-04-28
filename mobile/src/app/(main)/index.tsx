import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

export default function DashboardScreen() {
  const { user, profile, logout } = useAuthStore();
  const role = profile?.role ?? 'citizen';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.name}>{profile?.name ?? user?.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Ionicons
            name={role === 'volunteer' ? 'people' : 'person'}
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.roleText}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
        </View>
      </View>

      <View style={styles.placeholder}>
        <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
        <Text style={styles.placeholderTitle}>Dashboard Coming Soon</Text>
        <Text style={styles.placeholderSub}>
          Disaster alerts, volunteer tasks, and donation campaigns will appear here.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 56, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 32,
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
  },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholderTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  placeholderSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: 14, backgroundColor: '#FEF2F2',
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
});
