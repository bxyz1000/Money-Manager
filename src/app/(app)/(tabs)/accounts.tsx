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

import { FlowRibbon } from '@/components/FlowRibbon';
import type { AccountWithBalance } from '@/features/accounts/account.service';
import { formatPaiseAsINR, sumPaise } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import {
  colors,
  glass,
  radius,
  shadowElevation,
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
    bgColor: 'rgba(0, 240, 255, 0.14)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
    color: colors.electricCyan,
  },
  upi: {
    label: 'UPI / Wallet',
    icon: '⚡',
    bgColor: 'rgba(61, 220, 151, 0.14)',
    borderColor: 'rgba(61, 220, 151, 0.35)',
    color: colors.success,
  },
  cash: {
    label: 'Cash in Hand',
    icon: '💵',
    bgColor: 'rgba(255, 197, 92, 0.14)',
    borderColor: 'rgba(255, 197, 92, 0.35)',
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
      bgColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          shadowElevation(2),
          pressed && styles.cardPressed,
        ]}
        onPress={() =>
          router.push({ pathname: '/(app)/edit-account', params: { id: item.id } })
        }
      >
        {/* Specular Top-Edge Razor Highlight */}
        <View style={styles.topHighlightEdge} pointerEvents="none" />

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

        {/* Balance */}
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
      </Pressable>
    );
  }

  const isEmpty = listStatus === 'ready' && accounts.length === 0;

  return (
    <View style={styles.root}>
      {/* Hyper-Bright Electric Cyan Liquid River with Moving Light Nodes */}
      <FlowRibbon width="100%" height="100%" flip opacity={0.88} />

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

          {/* Hero Total Balance Card (matching Home depth & radial glow) */}
          <View style={[styles.totalCard, shadowElevation(3)]}>
            <View style={styles.topHighlightEdge} pointerEvents="none" />
            <View style={styles.totalGlowCircle} />
            <Text style={styles.totalLabel}>TOTAL NET WORTH</Text>
            <Text style={styles.totalValue}>{formatPaiseAsINR(totalPaise)}</Text>
            <View style={styles.accountCountPill}>
              <Text style={styles.accountCountText}>
                {accounts.length} {accounts.length === 1 ? 'active account' : 'active accounts'}
              </Text>
            </View>
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
            <View style={[styles.emptyCard, glass.card]}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptyBody}>
                Add your first Bank, UPI or Cash account to begin tracking balances.
              </Text>
            </View>
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

          {/* Add Account CTA */}
          <Pressable
            accessibilityLabel="Add new account"
            style={({ pressed }) => [
              styles.addButton,
              shadowElevation(2),
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(app)/add-account')}
          >
            <Text style={styles.addButtonText}>+ Add Account</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accountBalance: {
    color: colors.text,
    fontSize: typography.body + 1,
    fontWeight: '800',
  },
  accountCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  accountCountText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  accountIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  accountIconText: {
    fontSize: 20,
  },
  accountName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  accountType: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    marginTop: 2,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.neonBlue,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 14,
  },
  addButtonText: {
    color: colors.primaryText,
    fontSize: typography.body + 1,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(13, 19, 33, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    position: 'relative',
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
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
    alignItems: 'center',
    backgroundColor: 'rgba(13, 19, 33, 0.82)',
    borderColor: colors.border,
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    marginTop: spacing.xl,
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
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
    fontWeight: '800',
  },
  topHighlightEdge: {
    backgroundColor: colors.specularBorderTop,
    height: 1.5,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  totalCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(13, 19, 33, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    position: 'relative',
  },
  totalGlowCircle: {
    backgroundColor: 'rgba(0, 240, 255, 0.18)',
    borderRadius: 120,
    height: 180,
    position: 'absolute',
    top: -40,
    width: 180,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    letterSpacing: 2,
  },
  totalValue: {
    color: colors.text,
    fontSize: typography.balance,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: spacing.xs,
    textShadowColor: 'rgba(0, 240, 255, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
