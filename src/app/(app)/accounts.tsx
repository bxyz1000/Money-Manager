import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AccountWithBalance } from '@/features/accounts/account.service';
import { formatPaiseAsINR, sumPaise } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { colors, radius, spacing } from '@/components/theme';

/**
 * Accounts — the protected landing screen (first real product UI).
 * Balances come straight from the account_balances SQL view via the service;
 * no UI-side balance arithmetic.
 */

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  upi: 'UPI',
  cash: 'Cash',
};

export default function AccountsScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const status = useSessionStore((state) => state.status);
  const accounts = useAccountsStore((state) => state.accounts);
  const listStatus = useAccountsStore((state) => state.status);
  const errorMessage = useAccountsStore((state) => state.errorMessage);
  const load = useAccountsStore((state) => state.load);

  // Hooks must run unconditionally — computed before any early return.
  const totalPaise = useMemo(
    () => sumPaise(...accounts.map((account) => account.balancePaise)),
    [accounts],
  );

  useEffect(() => {
    if (status === 'authenticated' && listStatus === 'idle') {
      void load();
    }
  }, [status, listStatus, load]);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  function renderItem({ item }: { item: AccountWithBalance }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: '/(app)/edit-account', params: { id: item.id } })}
      >
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.accountType}>{TYPE_LABELS[item.type] ?? item.type}</Text>
          </View>
          <Text style={styles.accountBalance}>{formatPaiseAsINR(item.balancePaise)}</Text>
        </View>
      </Pressable>
    );
  }

  const isEmpty = listStatus === 'ready' && accounts.length === 0;

  return (
    <View style={[styles.container, insets]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Accounts</Text>
        <Pressable onPress={() => router.push('/(app)/transactions')}>
          <Text style={styles.headerLink}>Transactions</Text>
        </Pressable>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Balance</Text>
        <Text style={styles.totalValue}>{formatPaiseAsINR(totalPaise)}</Text>
      </View>

      {!!errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No accounts yet</Text>
          <Text style={styles.emptyBody}>
            Add your first Bank, UPI or Cash account to start tracking money.
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={listStatus === 'loading'} onRefresh={() => void load()} />
          }
        />
      )}

      <Pressable style={styles.addButton} onPress={() => router.push('/(app)/add-account')}>
        <Text style={styles.addButtonText}>+ Add Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    paddingVertical: 14,
  },
  addButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  accountName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyBody: {
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#fdeceb',
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
  },
  headerLink: {
    color: colors.primary,
    fontWeight: '600',
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
    paddingBottom: spacing.md,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  totalLabel: {
    color: '#d6e7ff',
    fontSize: 13,
  },
  totalValue: {
    color: colors.primaryText,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});

