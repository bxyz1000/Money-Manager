import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { TransactionListItem } from '@/features/transactions/transaction.service';
import { formatPaiseAsINR } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { useTransactionsStore } from '@/stores/transactions.store';
import { colors, radius, spacing } from '@/components/theme';

/**
 * Transaction history — newest-first ledger with current-month totals.
 * All figures come from the service layer (view-derived balances, ranged
 * monthly aggregation); the screen performs zero financial arithmetic.
 */

const TYPE_LABELS: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

function describe(txn: TransactionListItem): string {
  if (txn.type === 'transfer' && txn.toAccountName) {
    return `${txn.accountName} → ${txn.toAccountName}`;
  }
  return txn.accountName;
}

function amountPrefix(type: string): string {
  if (type === 'income') return '+';
  if (type === 'expense') return '−';
  return ''; // transfer: neutral
}

function amountColor(type: string): string {
  if (type === 'income') return colors.success;
  if (type === 'expense') return colors.danger;
  return colors.text;
}

export default function TransactionsScreen() {
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

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      if (listStatus === 'idle') {
        void load();
      }
      // Accounts feed the account picker on the add/edit screens and must be
      // present even if the user lands here directly.
      if (accountsStatus === 'idle') {
        void loadAccounts();
      }
    }
  }, [sessionStatus, listStatus, accountsStatus, load, loadAccounts]);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const isEmpty = listStatus === 'ready' && transactions.length === 0;

  function renderItem({ item }: { item: TransactionListItem }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({ pathname: '/(app)/edit-transaction', params: { id: item.id } })
        }
      >
        <View style={styles.cardLeft}>
          <Text style={styles.txnTitle}>
            {TYPE_LABELS[item.type] ?? item.type}
            {item.categoryName ? ` · ${item.categoryName}` : ''}
          </Text>
          <Text style={styles.txnSubtitle} numberOfLines={1}>
            {describe(item)}
          </Text>
          {!!item.note && (
            <Text style={styles.txnNote} numberOfLines={1}>
              {item.note}
            </Text>
          )}
          <Text style={styles.txnDate}>{new Date(item.occurredAt).toLocaleString()}</Text>
        </View>
        <Text style={[styles.txnAmount, { color: amountColor(item.type) }]}>
          {amountPrefix(item.type)}
          {formatPaiseAsINR(item.amountPaise)}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, insets]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transactions</Text>
        <Pressable onPress={() => router.push('/(app)/accounts')}>
          <Text style={styles.headerLink}>Accounts</Text>
        </Pressable>
      </View>

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
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyBody}>
            Record income, expenses and transfers to build your ledger.
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={listStatus === 'loading'} onRefresh={() => void load()} />
          }
        />
      )}

      <Pressable style={styles.addButton} onPress={() => router.push('/(app)/add-transaction')}>
        <Text style={styles.addButtonText}>+ Add Transaction</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardLeft: {
    flex: 1,
    marginRight: spacing.md,
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
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
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  txnDate: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  txnNote: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  txnSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  txnTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});



