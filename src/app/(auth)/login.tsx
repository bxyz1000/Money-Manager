import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppAuthError } from '@/features/auth/auth-errors';
import { useSessionStore } from '@/stores/session.store';

/**
 * Minimal functional login screen.
 *
 * This is authentication plumbing required by Phase 2 — deliberately plain,
 * NOT product UI. All business logic lives in services/stores; this component
 * only collects input and renders mapped error messages.
 */
export default function LoginScreen() {
  const status = useSessionStore((state) => state.status);
  const signIn = useSessionStore((state) => state.signInWithPassword);
  const signUp = useSessionStore((state) => state.signUp);
  const signInWithGoogle = useSessionStore((state) => state.signInWithGoogle);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Already signed in (restored session or just completed a flow): leave the
  // auth area. Declarative redirect renders nothing else while active.
  if (status === 'authenticated') {
    return <Redirect href="/(app)/home" />;
  }

  async function run(action: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
      if (successMessage) {
        setInfo(successMessage);
      }
    } catch (err) {
      setError(
        err instanceof AppAuthError
          ? err.userMessage
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Money Manager</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={styles.info}>{info}</Text>}

      <Pressable
        style={[styles.button, styles.primary, !canSubmit && styles.disabled]}
        disabled={!canSubmit}
        onPress={() => void run(() => signIn(email.trim(), password))}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondary, !canSubmit && styles.disabled]}
        disabled={!canSubmit}
        onPress={() =>
          void run(
            () => signUp(email.trim(), password),
            'Account created. If email confirmation is enabled, check your inbox before signing in.',
          )
        }
      >
        <Text style={styles.buttonText}>Sign up</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.google, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void run(() => signInWithGoogle())}
      >
        <Text style={styles.buttonText}>Continue with Google</Text>
      </Pressable>

      {busy && <ActivityIndicator style={styles.spinner} />}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    maxWidth: 420,
    padding: 24,
    width: '100%',
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: '#b3261e',
    marginBottom: 8,
  },
  google: {
    backgroundColor: '#5f6368',
  },
  info: {
    color: '#1b72e8',
    marginBottom: 8,
  },
  input: {
    borderColor: '#c9c9c9',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: '#1b72e8',
  },
  secondary: {
    backgroundColor: '#188038',
  },
  spinner: {
    marginTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
});
