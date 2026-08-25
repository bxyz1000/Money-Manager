import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSessionStore } from '@/stores/session.store';

/**
 * Root layout.
 *
 * While the persisted session is being restored (status === 'initializing')
 * NOTHING routes render — this guarantees protected financial content can
 * never flash before the authentication state is known.
 */
export default function RootLayout() {
  const status = useSessionStore((state) => state.status);
  const initialize = useSessionStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status === 'initializing') {
    return (
      <View style={styles.bootstrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  bootstrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
