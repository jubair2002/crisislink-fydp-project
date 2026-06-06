import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';
import { ToastHost } from '../components/ToastHost';

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.splashText}>CrisisLink Network</Text>
    </View>
  );
}

// Routes inside (auth) that authenticated users are still allowed to visit.
// Used for profile setup, editing, and the volunteer upgrade flow.
const AUTHENTICATED_AUTH_ROUTES = new Set([
  'profile-setup',
  'edit-profile',
  'become-volunteer',
  'change-password',
]);

export default function RootLayout() {
  const { user, profile, isLoading, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // Avoid router.replace before the Stack / Tabs navigator exists (first paint).
    if (!rootNavState?.key) return;

    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inMainGroup = segs[0] === '(main)';
    // The second segment is the screen name within the group, e.g. 'login'.
    const screen = segs[1];

    const isCampaignGuestRoute = inMainGroup && segs[1] === 'campaigns';

    if (!user) {
      if (!inAuthGroup && !isCampaignGuestRoute) router.replace('/(auth)/welcome');
      return;
    }

    // Allow logged-in users to access profile-setup, edit-profile and
    // become-volunteer even though those live under the (auth) group.
    if (inAuthGroup && screen && AUTHENTICATED_AUTH_ROUTES.has(screen)) {
      return;
    }

    // Soft prompt model: if their profile isn't complete yet we still send
    // them to the main app (the dashboard / profile tab show a "Complete
    // your profile" banner that links into the right setup form).
    if (!inMainGroup) router.replace('/(main)/');
  }, [user, profile, isLoading, segments, rootNavState?.key]);

  // Slot must mount on the first render or expo-router throws on early router.replace().
  return (
    <SafeAreaProvider>
      <Slot />
      {isLoading ? (
        <View style={[StyleSheet.absoluteFillObject, styles.splashOverlay]} pointerEvents="auto">
          <SplashScreen />
        </View>
      ) : null}
      <ToastHost />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    backgroundColor: Colors.background,
    zIndex: 999,
  },
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
});
