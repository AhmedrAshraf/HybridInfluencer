import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../app/context/useContext';
import NotificationProvider from '@/hooks/NotificationProvider';
import { ActivityIndicator, View } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

function RootLayoutInner() {
  const router = useRouter();
  const { user, loading } = useApp();

  useEffect(() => {
    window.frameworkReady?.();

    if (user === undefined || loading === true) return;

    if (!user) {
      router.replace('/auth/signUp');
    } else {
      router.replace('/(tabs)');
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <ActivityIndicator size={50} />
      </View>
    );
  }

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
