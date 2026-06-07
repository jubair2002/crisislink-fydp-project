import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="volunteer" />
      <Stack.Screen name="support" />
    </Stack>
  );
}
