import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalanceRing } from '@/components/BalanceRing';
import { FlowRibbon } from '@/components/FlowRibbon';
import { TransactionRow } from '@/components/TransactionRow';
import { colors, glass, radius, spacing, typography } from '@/components/theme';
import {
  recentTransactions,
  savingsFraction,
  totalBalancePaise,
} from '@/features/dashboard/dashboard';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { useTransactionsStore } from '@/stores/transactions.store';

/**
 * Home / Dashboard — premium dark landing (Phase 5).
 *
 * Data sources: accounts store (authoritative account_balances view) and
 * transactions store (ledger + service-side monthly aggregation). The ring
 * fraction is the month's savings rate; the only presentation math here is
 * the pure helpers in features/dashboard.
 */

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const QUICK_ACTIONS: { label: string; type: 'income' | 'expense' | 'transfer' }[] = [
  { label: '+ Add Money', type: 'income' },
  { label: '↔ Transfer', type: 'transfer' },
  { label: '− Expense', type: 'expense' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const sessionStatus = useSessionStore((state) => state.status);
  const email = useSessionStore((state) => state.email);
  const accounts = useAccountsStore((state) => state.accounts);
  const accountsStatus = useAccountsStore((state) => state.status);
  const loadAccounts = useAccountsStore((state) => state.load);
  const transactions = useTransactionsStore((state) => state.transactions);
  const txnStatus = useTransactionsStore((state) => state.status);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const monthIncomePaise = useTransactionsStore((state) => state.monthIncomePaise);
  const monthExpensePaise = useTransactionsStore((state) => state.monthExpensePaise);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (accountsStatus === 'idle') void loadAccounts();
    if (txnStatus === 'idle') void loadTransactions();
  }, [sessionStatus, accountsStatus, txnStatus, loadAccounts, loadTransactions]);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const total = totalBalancePaise(accounts);
  const fraction = savingsFraction(monthIncomePaise, monthExpensePaise);
  const recent = recentTransactions(transactions, 5);
  const initial = (email ?? 'U').trim().charAt(0).toUpperCase();

  function openAdd(type: 'income' | 'expense' | 'transfer'): void {
    router.push({ pathname: '/(app)/add-transaction', params: { type } });
  }

// PART1_END
  return (
    <View style={styles.root}>
      <FlowRibbon width="100%" height="100%" flip opacity={0.45} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, insets]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Profile"
          onPress={() => router.push('/(app)/(tabs)/profile')}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.userName}>{email ?? 'Welcome'}</Text>
        </View>
      </View>

      <View style={[styles.ringCard, glass.card]}>
        <BalanceRing fraction={fraction} centerLabel={formatTotal(total)} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              +{formatTotal(monthIncomePaise)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              −{formatTotal(monthExpensePaise)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.type}
            accessibilityLabel={action.label}
            style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
            onPress={() => openAdd(action.type)}
          >
            <Text style={styles.quickText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Pressable onPress={() => router.push('/(app)/(tabs)/expenses')}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      <View style={styles.recentList}>
        {recent.length === 0 ? (
          <Text style={styles.emptyText}>Your recent transactions will appear here.</Text>
        ) : (
          recent.map((txn) => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              onPress={() =>
                router.push({ pathname: '/(app)/edit-transaction', params: { id: txn.id } })
              }
            />
          ))
        )}
      </View>
      </ScrollView>
    </View>
  );
}

/** Compact total formatting for the ring counter (whole rupees, no paise). */
function formatTotal(paise: number): string {
  const rupees = Math.round(paise / 100);
  const negative = rupees < 0;
  let grouped = String(Math.abs(rupees));
  if (grouped.length > 3) {
    const last3 = grouped.slice(-3);
    const rest = grouped.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }
  return `${negative ? '-' : ''}₹${grouped}`;
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  avatarText: {
    color: colors.primaryText,
    fontSize: typography.title,
    fontWeight: '700',
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  quickButton: {
    ...glass.card,
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  recentList: {
    gap: spacing.sm,
  },
  ringCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statRow: {
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    width: '100%',
  },
  userName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  viewAll: {
    color: colors.primary,
    fontWeight: '600',
  },
});


