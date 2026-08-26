import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, glass, radius, shadowElevation, spacing, typography } from '@/components/theme';
import { AppAuthError } from '@/features/auth/auth-errors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useSessionStore } from '@/stores/session.store';

/**
 * Brand visual emblem: Glowing layered icon with fintech vault / currency motif.
 */
function BrandEmblem() {
  return (
    <View style={styles.brandEmblemContainer}>
      <Svg width={96} height={96} viewBox="0 0 96 96" fill="none">
        <Defs>
          <LinearGradient id="emblemGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primaryGlow} stopOpacity="0.4" />
            <Stop offset="0.6" stopColor={colors.secondaryGlow} stopOpacity="0.2" />
            <Stop offset="1" stopColor="transparent" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7a8aff" />
            <Stop offset="0.5" stopColor={colors.primary} />
            <Stop offset="1" stopColor="#4353ff" />
          </LinearGradient>
          <LinearGradient id="innerGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Ambient glow halo */}
        <Circle cx={48} cy={48} r={46} fill="url(#emblemGlow)" />
        <Circle
          cx={48}
          cy={48}
          r={38}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Central branded badge */}
        <Rect
          x={20}
          y={20}
          width={56}
          height={56}
          rx={16}
          fill="url(#shieldGrad)"
        />
        {/* Highlight inner border */}
        <Rect
          x={21}
          y={21}
          width={54}
          height={54}
          rx={15}
          stroke="url(#innerGlow)"
          strokeWidth={1.5}
          fill="none"
        />

        {/* Currency / Growth glyph */}
        <G transform="translate(32, 28)">
          {/* Rupee / Wealth symbol paths */}
          <Path
            d="M5 8 H27 M5 14 H23 M15 14 C21 14 25 18 25 24 C25 29 20 33 14 33 L6 33 M13 33 L26 44"
            stroke="#ffffff"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
}

/**
 * Standard Google 'G' icon rendered with native SVG vectors.
 */
function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useScreenInsets();
  const status = useSessionStore((state) => state.status);
  const signInAnonymously = useSessionStore((state) => state.signInAnonymously);
  const signInWithGoogle = useSessionStore((state) => state.signInWithGoogle);
  const signInWithPassword = useSessionStore((state) => state.signInWithPassword);
  const signUp = useSessionStore((state) => state.signUp);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  // If authenticated, redirect into the app
  if (status === 'authenticated') {
    return <Redirect href="/(app)/(tabs)/home" />;
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

  const trimmedName = displayName.trim();
  const canContinueName = trimmedName.length > 0 && !busy;
  const canSubmitEmail = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <View style={[styles.root, insets]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand visual & title */}
          <View style={styles.header}>
            <BrandEmblem />
            <Text style={styles.appName}>Money Manager</Text>
            <Text style={styles.appTagline}>
              Track income, expenses & transfers with ease
            </Text>
          </View>

          {/* Messages */}
          {!!error && (
            <View style={styles.alertBoxError}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!!info && (
            <View style={styles.alertBoxInfo}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          )}

          {/* Primary Onboarding Card: Name Input + Continue */}
          <View style={[styles.card, glass.card]}>
            <Text style={styles.sectionLabel}>Get started</Text>
            <Text style={styles.inputHelper}>Enter your name to begin tracking</Text>

            <TextInput
              style={[
                styles.input,
                nameFocused && styles.inputFocused,
                busy && styles.inputDisabled,
              ]}
              placeholder="Your name (e.g. Alex)"
              placeholderTextColor={colors.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={() => {
                if (canContinueName) {
                  void run(() => signInAnonymously(trimmedName));
                }
              }}
            />

            <Pressable
              accessibilityLabel="Continue with entered name"
              style={({ pressed }) => [
                styles.primaryButton,
                !canContinueName && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              disabled={!canContinueName}
              onPress={() => void run(() => signInAnonymously(trimmedName))}
            >
              {busy && trimmedName.length > 0 ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {trimmedName ? `Continue as ${trimmedName}` : 'Continue'}
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Secondary Google Sign-In Option */}
            <Pressable
              accessibilityLabel="Continue with Google"
              style={({ pressed }) => [
                styles.googleButton,
                busy && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              disabled={busy}
              onPress={() => void run(() => signInWithGoogle())}
            >
              <View style={styles.googleButtonContent}>
                <GoogleIcon />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            </Pressable>
          </View>

          {/* Deprioritized Email / Password accordion */}
          <View style={styles.moreOptionsContainer}>
            <Pressable
              style={styles.toggleButton}
              onPress={() => setShowEmailAuth((prev) => !prev)}
            >
              <Text style={styles.toggleButtonText}>
                {showEmailAuth ? '▾ Hide email sign-in' : '▸ More sign-in options'}
              </Text>
            </Pressable>

            {showEmailAuth && (
              <View style={[styles.emailAuthCard, glass.card]}>
                <Text style={styles.emailAuthTitle}>Sign in with Email</Text>

                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                />

                <View style={styles.emailActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emailActionButton,
                      styles.emailSignInButton,
                      !canSubmitEmail && styles.buttonDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                    disabled={!canSubmitEmail}
                    onPress={() => void run(() => signInWithPassword(email.trim(), password))}
                  >
                    <Text style={styles.emailActionText}>Sign In</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.emailActionButton,
                      styles.emailSignUpButton,
                      !canSubmitEmail && styles.buttonDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                    disabled={!canSubmitEmail}
                    onPress={() =>
                      void run(
                        () => signUp(email.trim(), password),
                        'Account created! If confirmation is required, check your inbox.',
                      )
                    }
                  >
                    <Text style={styles.emailActionText}>Sign Up</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  alertBoxError: {
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    borderColor: 'rgba(255, 92, 122, 0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  alertBoxInfo: {
    backgroundColor: 'rgba(110, 124, 255, 0.14)',
    borderColor: 'rgba(110, 124, 255, 0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  appName: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  appTagline: {
    color: colors.textSecondary,
    fontSize: typography.body - 1,
    lineHeight: 20,
    textAlign: 'center',
  },
  brandEmblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  card: {
    ...glass.card,
    ...shadowElevation(2),
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    padding: spacing.xl,
    width: '100%',
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: spacing.lg,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    paddingHorizontal: spacing.md,
    textTransform: 'uppercase',
  },
  emailActionButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: 12,
  },
  emailActionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  emailActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emailAuthCard: {
    ...glass.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    marginTop: spacing.md,
    padding: spacing.lg,
    width: '100%',
  },
  emailAuthTitle: {
    color: colors.text,
    fontSize: typography.title - 2,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emailSignInButton: {
    backgroundColor: colors.primary,
  },
  emailSignUpButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: colors.border,
    borderWidth: 1,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.body - 1,
    textAlign: 'center',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  googleButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  infoText: {
    color: colors.accentBright,
    fontSize: typography.body - 1,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1.2,
    color: colors.text,
    fontSize: typography.body,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputHelper: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    marginBottom: spacing.md,
  },
  keyboardView: {
    flex: 1,
  },
  moreOptionsContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontSize: typography.body + 1,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 440,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: '100%',
  },
  sectionLabel: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleButtonText: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    fontWeight: '500',
  },
});
