import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, glass, radius, spacing, typography } from '@/components/theme';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useSessionStore } from '@/stores/session.store';

/**
 * Profile — session identity and sign-out. Deliberately minimal; profile
 * customization belongs to a later phase.
 */
export default function ProfileScreen() {
  const insets = useScreenInsets();
  const status = useSessionStore((state) => state.status);
  const email = useSessionStore((state) => state.email);
  const userId = useSessionStore((state) => state.userId);
  const signOut = useSessionStore((state) => state.signOut);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={[styles.container, insets]}>
      <Text style={styles.title}>Profile</Text>

      <View style={[styles.card, glass.card]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(email ?? 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.email}>{email ?? 'Signed in'}</Text>
        {!!userId && <Text style={styles.userId}>ID: {userId}</Text>}
      </View>

      <Pressable
        accessibilityLabel="Sign out of Money Manager"
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        onPress={() => void signOut()}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 72,
  },
  avatarText: {
    color: colors.primaryText,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  card: {
    ...glass.card,
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  email: {
    color: colors.text,
    fontSize: typography.body + 1,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  userId: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
