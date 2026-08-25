import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSessionStore } from '@/stores/session.store';

/**
 * Protected placeholder screen.
 *
 * Deliberately minimal bootstrap route proving authenticated routing works.
 * NO product UI lives here — Money/Expenses/etc. arrive in later phases.
 */
export default function HomeScreen() {
  const status = useSessionStore((state) => state.status);
  const email = useSessionStore((state) => state.email);
  const signOut = useSessionStore((state) => state.signOut);

  // Route protection: unauthenticated (or session lost/expired mid-flight)
  // never renders a single frame of this area.
  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signed in</Text>
      <Text style={styles.subtitle}>{email ?? '(email not available)'}</Text>
      <Text style={styles.note}>
        Protected area placeholder. Financial features arrive in later phases.
      </Text>
      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#b3261e',
    borderRadius: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  note: {
    color: '#666666',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#444444',
    fontSize: 15,
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
