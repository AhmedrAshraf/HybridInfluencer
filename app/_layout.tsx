import { useEffect, useState } from 'react';
import { Slot, Stack, useRouter } from 'expo-router';
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
  const { user, loading } = useApp();

  useEffect(() => {
    window.frameworkReady?.();

    if (!loading) {
      setAppIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    window.frameworkReady?.();
  }, [user, appIsReady, loading, router]);

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