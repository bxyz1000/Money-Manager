import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassButton, GlassCard } from '@/components/GlassCard';
import { colors, radius, spacing, typography } from '@/components/theme';
import { AppAuthError } from '@/features/auth/auth-errors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useSessionStore } from '@/stores/session.store';

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

export default function ProfileScreen() {
  const insets = useScreenInsets();
  const status = useSessionStore((state) => state.status);
  const email = useSessionStore((state) => state.email);
  const displayName = useSessionStore((state) => state.displayName);
  const isAnonymous = useSessionStore((state) => state.isAnonymous);
  const userId = useSessionStore((state) => state.userId);
  const linkGoogleAccount = useSessionStore((state) => state.linkGoogleAccount);
  const signOut = useSessionStore((state) => state.signOut);

  const [linkingBusy, setLinkingBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null,
  );

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const emailPrefix = email ? (email.split('@')[0] ?? 'User') : 'User';
  const primaryName = displayName || emailPrefix;
  const avatarChar = primaryName.charAt(0).toUpperCase();

  async function handleLinkGoogle() {
    setLinkingBusy(true);
    setFeedback(null);
    try {
      await linkGoogleAccount();
      setFeedback({
        type: 'success',
        message: 'Google account linked successfully!',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof AppAuthError
            ? err.userMessage
            : 'Could not link Google account. Please try again.',
      });
    } finally {
      setLinkingBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, insets]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Profile & Settings</Text>

      {/* Feedback message */}
      {!!feedback && (
        <View
          style={[
            styles.feedbackBox,
            feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText,
            ]}
          >
            {feedback.message}
          </Text>
        </View>
      )}

      {/* User Card */}
      <GlassCard style={styles.card} intensity={50} borderRadius={radius.lg}>
        <View style={styles.cardContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarChar}</Text>
          </View>
          <Text style={styles.displayName}>{primaryName}</Text>
          <Text style={styles.subtext}>
            {email ? email : isAnonymous ? 'Guest Account' : 'Signed In'}
          </Text>
          {!!userId && <Text style={styles.userId}>ID: {userId}</Text>}
        </View>
      </GlassCard>

      {/* Account Security / Link Google Section */}
      <GlassCard style={styles.card} intensity={50} borderRadius={radius.lg}>
        <View style={styles.cardContent}>
          <Text style={styles.sectionHeading}>Account & Backup</Text>
          {isAnonymous || !email ? (
            <View>
              <Text style={styles.sectionDescription}>
                You are currently using a local guest profile. Link your Google account to sync
                transactions across devices and prevent data loss.
              </Text>

              <GlassButton
                accessibilityLabel="Link Google Account"
                style={styles.googleLinkButton}
                intensity={55}
                borderRadius={radius.md}
                disabled={linkingBusy}
                onPress={() => void handleLinkGoogle()}
              >
                <View style={styles.googleLinkButtonInner}>
                  {linkingBusy ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <View style={styles.googleButtonContent}>
                      <GoogleIcon />
                      <Text style={styles.googleButtonText}>Link Google Account</Text>
                    </View>
                  )}
                </View>
              </GlassButton>
            </View>
          ) : (
            <View style={styles.connectedRow}>
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedBadgeText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>Connected Account</Text>
                <Text style={styles.connectedEmail}>{email}</Text>
              </View>
            </View>
          )}
        </View>
      </GlassCard>

      {/* Sign Out Button */}
      <Pressable
        accessibilityLabel="Sign out of Money Manager"
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        onPress={() => void signOut()}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 112, 243, 0.4)',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 72,
  },
  avatarText: {
    color: colors.primaryText,
    fontSize: typography.heading,
    fontWeight: '600',
  },
  card: {
    marginBottom: spacing.sectionGap - 8,
  },
  cardContent: {
    padding: spacing.xl,
  },
  connectedBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(61, 220, 151, 0.2)',
    borderColor: colors.success,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 28,
  },
  connectedBadgeText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  connectedEmail: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    marginTop: 2,
  },
  connectedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  connectedTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  displayName: {
    color: colors.text,
    fontSize: typography.title + 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  feedbackError: {
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    borderColor: 'rgba(255, 92, 122, 0.35)',
  },
  feedbackErrorText: {
    color: colors.danger,
    fontSize: typography.body - 1,
    textAlign: 'center',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(61, 220, 151, 0.12)',
    borderColor: 'rgba(61, 220, 151, 0.35)',
  },
  feedbackSuccessText: {
    color: colors.success,
    fontSize: typography.body - 1,
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: typography.body - 1,
    textAlign: 'center',
  },
  googleButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '500',
  },
  googleLinkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: spacing.md,
  },
  googleLinkButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: typography.body - 1,
    lineHeight: 20,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  signOutButton: {
    alignItems: 'center',
    borderColor: 'rgba(255, 92, 122, 0.4)',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingVertical: 14,
  },
  signOutText: {
    color: colors.danger,
    fontSize: typography.body,
    fontWeight: '500',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  userId: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.sm,
    opacity: 0.6,
    textAlign: 'center',
  },
});
