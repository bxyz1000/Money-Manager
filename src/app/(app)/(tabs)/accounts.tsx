import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GlassButton, GlassCard } from '@/components/GlassCard';
import { HeroRadialGlow } from '@/components/HeroRadialGlow';
import type { AccountWithBalance } from '@/features/accounts/account.service';
import { formatPaiseAsINR, sumPaise } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/components/theme';

const TYPE_METAS: Record<
  string,
  { label: string; icon: string; bgColor: string; borderColor: string; color: string }
> = {
  bank: {
    label: 'Bank Account',
    icon: '🏦',
    bgColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: 'rgba(0, 240, 255, 0.25)',
    color: colors.electricCyan,
  },
  upi: {
    label: 'UPI / Wallet',
    icon: '⚡',
    bgColor: 'rgba(61, 220, 151, 0.12)',
    borderColor: 'rgba(61, 220, 151, 0.25)',
    color: colors.success,
  },
  cash: {
    label: 'Cash in Hand',
    icon: '💵',
    bgColor: 'rgba(255, 197, 92, 0.12)',
    borderColor: 'rgba(255, 197, 92, 0.25)',
    color: colors.warning,
  },
};

export default function AccountsScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const status = useSessionStore((state) => state.status);
  const accounts = useAccountsStore((state) => state.accounts);
  const listStatus = useAccountsStore((state) => state.status);
  const errorMessage = useAccountsStore((state) => state.errorMessage);
  const load = useAccountsStore((state) => state.load);

  const [entranceAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entranceAnim]);

  const totalPaise = useMemo(
    () => sumPaise(...accounts.map((account) => account.balancePaise)),
    [accounts],
  );

  useEffect(() => {
    if (status === 'authenticated') {
      if (listStatus === 'idle' || listStatus === 'error') {
        void load();
      }
    }
  }, [status, listStatus, load]);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  function renderItem({ item }: { item: AccountWithBalance }) {
    const meta = TYPE_METAS[item.type] ?? {
      label: item.type,
      icon: '💼',
      bgColor: colors.surfaceGlass,
      borderColor: colors.border,
      color: colors.text,
    };

    return (
      <GlassButton
        onPress={() =>
          router.push({ pathname: '/(app)/edit-account', params: { id: item.id } })
        }
        intensity={45}
        borderRadius={radius.md}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          {/* Left icon badge */}
          <View
            style={[
              styles.accountIconBadge,
              { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
            ]}
          >
            <Text style={styles.accountIconText}>{meta.icon}</Text>
          </View>

          {/* Account Details */}
          <View style={styles.cardCenter}>
            <Text style={styles.accountName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.accountType}>{meta.label}</Text>
          </View>

          {/* Balance (Regular/Medium Weight) */}
          <View style={styles.cardRight}>
            <Text
              style={[
                styles.accountBalance,
                { color: item.balancePaise >= 0 ? colors.text : colors.danger },
              ]}
            >
              {formatPaiseAsINR(item.balancePaise)}
            </Text>
          </View>
        </View>
      </GlassButton>
    );
  }

  const isEmpty = listStatus === 'ready' && accounts.length === 0;

  return (
    <View style={styles.root}>
      <View style={[styles.container, insets]}>
        <Animated.View
          style={{
            flex: 1,
            opacity: entranceAnim,
            transform: [
              {
                translateY: entranceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Accounts</Text>
            <Pressable onPress={() => router.push('/(app)/(tabs)/expenses')}>
              <Text style={styles.headerLink}>Transactions</Text>
            </Pressable>
          </View>

          {/* Hero Net Worth Card with Soft Radial Glow & BlurView */}
          <View style={styles.heroSection}>
            <HeroRadialGlow size={280} />
            <GlassCard style={styles.totalCard} intensity={50} borderRadius={radius.lg}>
              <View style={styles.totalCardContent}>
                <Text style={styles.totalLabel}>TOTAL NET WORTH</Text>
                <Text style={styles.totalValue}>{formatPaiseAsINR(totalPaise)}</Text>
                <GlassCard style={styles.accountCountPill} intensity={40} borderRadius={radius.pill}>
                  <Text style={styles.accountCountText}>
                    {accounts.length} {accounts.length === 1 ? 'active account' : 'active accounts'}
                  </Text>
                </GlassCard>
              </View>
            </GlassCard>
          </View>

          {/* Error Banner only when real active error exists */}
          {listStatus === 'error' && !!errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => void load()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Account List or Empty State */}
          {isEmpty ? (
            <GlassCard style={styles.emptyCard} intensity={45} borderRadius={radius.md}>
              <View style={styles.emptyCardContent}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>No accounts yet</Text>
                <Text style={styles.emptyBody}>
                  Add your first Bank, UPI or Cash account to begin tracking balances.
                </Text>
              </View>
            </GlassCard>
          ) : (
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={listStatus === 'loading'}
                  onRefresh={() => void load()}
                  tintColor={colors.primary}
                />
              }
            />
          )}

          {/* Frosted Glass + Add Account CTA */}
          <GlassButton
            accessibilityLabel="Add new account"
            style={styles.addButton}
            intensity={55}
            borderRadius={radius.md}
            onPress={() => router.push('/(app)/add-account')}
          >
            <View style={styles.addButtonContent}>
              <Text style={styles.addButtonIcon}>+</Text>
              <Text style={styles.addButtonText}>Add Account</Text>
            </View>
          </GlassButton>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accountBalance: {
    color: colors.text,
    fontSize: typography.body + 1,
    fontWeight: '500',
  },
  accountCountPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  accountCountText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '500',
  },
  accountIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountIconText: {
    fontSize: 18,
  },
  accountName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '500',
  },
  accountType: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: 'rgba(0, 112, 243, 0.15)',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  addButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addButtonIcon: {
    color: colors.electricCyan,
    fontSize: 18,
    fontWeight: '500',
  },
  addButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  card: {
    marginBottom: spacing.sm + 2,
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySm,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyCard: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.xl,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
    borderColor: 'rgba(255, 92, 122, 0.35)',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: typography.bodySm,
  },
  headerLink: {
    color: colors.electricCyan,
    fontSize: typography.caption + 1,
    fontWeight: '500',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sectionGap,
    marginTop: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sectionGap,
    position: 'relative',
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading + 2,
    fontWeight: '600',
  },
  totalCard: {
    width: '100%',
  },
  totalCardContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
  },
  totalValue: {
    color: colors.text,
    fontSize: typography.balance - 4,
    fontWeight: '400',
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
});
