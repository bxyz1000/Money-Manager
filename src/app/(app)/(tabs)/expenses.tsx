import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TransactionRow } from '@/components/TransactionRow';
import { FlowRibbon } from '@/components/FlowRibbon';
import { colors, glass, radius, spacing } from '@/components/theme';
import {
  filterTransactions,
  type LedgerFilter,
} from '@/features/dashboard/dashboard';
import { formatPaiseAsINR } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { useTransactionsStore } from '@/stores/transactions.store';

/**
 * Expenses / ledger view (Reference A visual language).
 * Month summary comes from the service aggregation; the type filter below is
 * presentation-only slicing of already-fetched service data.
 */

const FILTERS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfers' },
];

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const sessionStatus = useSessionStore((state) => state.status);
  const accountsStatus = useAccountsStore((state) => state.status);
  const loadAccounts = useAccountsStore((state) => state.load);

  const transactions = useTransactionsStore((state) => state.transactions);
  const listStatus = useTransactionsStore((state) => state.status);
  const errorMessage = useTransactionsStore((state) => state.errorMessage);
  const load = useTransactionsStore((state) => state.load);
  const monthIncomePaise = useTransactionsStore((state) => state.monthIncomePaise);
  const monthExpensePaise = useTransactionsStore((state) => state.monthExpensePaise);
  const monthNetPaise = useTransactionsStore((state) => state.monthNetPaise);

  const [filter, setFilter] = useState<LedgerFilter>('all');

  const visible = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter],
  );

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (listStatus === 'idle') void load();
    if (accountsStatus === 'idle') void loadAccounts();
  }, [sessionStatus, listStatus, accountsStatus, load, loadAccounts]);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const isEmpty = listStatus === 'ready' && visible.length === 0;

// PART2_END
  return (
    <View style={[styles.container, insets]}>
      <FlowRibbon width="100%" height="100%" opacity={0.85} />
      <Text style={styles.title}>Expenses</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatPaiseAsINR(monthIncomePaise)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {formatPaiseAsINR(monthExpensePaise)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={styles.summaryValue}>{formatPaiseAsINR(monthNetPaise)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const selected = filter === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              onPress={() => setFilter(option.value)}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
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
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>Recorded transactions will appear in this list.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              txn={item}
              onPress={() =>
                router.push({ pathname: '/(app)/edit-transaction', params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={listStatus === 'loading'} onRefresh={() => void load()} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,92,122,0.12)',
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
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipSelectedText: {
    color: colors.primaryText,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: colors.primaryText,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  summaryCard: {
    ...glass.card,
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
});


