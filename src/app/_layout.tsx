import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/stores/session.store';

/**
 * Root layout. Providers will be added here as features come online.
 * No product UI belongs in this file.
 */
export default function RootLayout() {
  const initialize = useSessionStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
