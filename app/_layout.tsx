import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../app/context/useContext';
import NotificationProvider from '@/hooks/NotificationProvider';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

function RootLayoutInner() {
  const router = useRouter();
  const { user } = useApp();
  console.log("🚀 ~ RootLayoutInner ~ user:", user)

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
      <NotificationProvider />
      <RootLayoutInner />
    </AppProvider>
  );
}
