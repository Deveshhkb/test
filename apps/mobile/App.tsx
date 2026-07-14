import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from '@/navigation/RootNavigator';
import { queryClient, asyncStoragePersister } from '@/services/queryClient';
import { attachForegroundHandler } from '@/services/notifications';
import { useAuthStore } from '@/store/authStore';
import { setLocale } from '@/i18n';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const language = useAuthStore((s) => s.user?.language);

  useEffect(() => {
    if (language) setLocale(language);
  }, [language]);

  useEffect(() => {
    const unsubscribe = attachForegroundHandler();
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Fast startup: hide the splash as soon as persisted auth state is ready.
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 3600_000 }}
        >
          <RootNavigator />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
