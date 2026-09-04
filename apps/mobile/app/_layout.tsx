import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { requestNotificationPermissions } from '../src/notifications';

// Side-effect import: initializes i18next before any screen renders.
// NOTE: RTL languages (fa, ar — see src/i18n) only fully mirror the layout
// after I18nManager.forceRTL() + an app restart, which isn't wired up yet.
// Track as a follow-up before shipping fa/ar as selectable languages.
import '../src/i18n';

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: 'PurEvents' }} />
        <Stack.Screen name="event/new" options={{ title: 'New Event', presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
