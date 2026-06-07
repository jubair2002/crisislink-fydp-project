import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

export default function MainLayout() {
  const role = useAuthStore((s) => s.profile?.role);
  const isVolunteer = role === 'volunteer';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="disasters"
        options={{
          title: 'Disasters',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campaigns',
          href: isVolunteer ? null : '/campaigns',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          href: isVolunteer ? '/tasks' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Routable from the notification bell on the dashboard, but
          hidden from the tab bar itself. */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
