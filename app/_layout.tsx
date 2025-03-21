import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../app/context/useContext';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

function RootLayoutInner() {
  const router = useRouter();
  const { user } = useApp();

  useEffect(() => {
    window.frameworkReady?.();

    if (user === undefined) return;

    if (!user) {
      router.replace('/auth/signUp');
    } else {
      router.replace('/(tabs)');
    }
  }, [user]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutInner />
    </AppProvider>
  );
}
