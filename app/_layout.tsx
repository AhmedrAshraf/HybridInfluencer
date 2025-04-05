import { useEffect, useState } from 'react';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
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
  const [appIsReady, setAppIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useApp();

  useEffect(() => {
    window.frameworkReady?.();

    if (!loading) {
      setAppIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && appIsReady) {
      const inAuthGroup = segments[0] === '(auth)';
      
      // If no user is logged in and we're not in the auth group, redirect to login
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
      
      // If we have a user and we're in the auth group, redirect to home
      if (user && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, appIsReady, segments]);

  if (!appIsReady || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size={50} />
      </View>
    );
  }

  return (
    <>
      <Slot />
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