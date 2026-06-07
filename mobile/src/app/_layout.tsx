import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { ToastHost } from '../components/ToastHost';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { I18nProvider } from '../i18n/I18nContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import {
  registerForPushNotifications,
  setupNotificationNavigation,
} from '../services/pushNotificationService';
import { flushPendingMessages } from '../services/chatService';
import { startNotificationListener } from '../services/notificationService';

function SplashScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    splash: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    splashText: {
      fontSize: 22,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1,
    },
  }));

  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.splashText}>CrisisLink Network</Text>
    </View>
  );
}

function SplashOverlay() {
  const styles = useThemedStyles((c) => ({
    splashOverlay: {
      backgroundColor: c.background,
      zIndex: 999,
    },
  }));

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.splashOverlay]} pointerEvents="auto">
      <SplashScreen />
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
    if (!user?.id) return;
    registerForPushNotifications(user.id).catch(() => {});
    flushPendingMessages(user.id).catch(() => {});
    const unsubPush = setupNotificationNavigation();
    const unsubNotif = startNotificationListener(user.id);
    return () => {
      unsubPush();
      unsubNotif();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      useSettingsStore.getState().reset();
      return;
    }
    const isVolunteer = profile?.role === 'volunteer';
    useSettingsStore.getState().initialize(user.id, isVolunteer).catch(() => {});
  }, [user?.id, profile?.role]);

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
      <ThemeProvider>
        <I18nProvider>
          <Slot />
          {isLoading ? <SplashOverlay /> : null}
          <ToastHost />
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
