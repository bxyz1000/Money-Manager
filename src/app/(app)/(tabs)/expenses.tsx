import { Ionicons } from '@expo/vector-icons';
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
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { TransactionRow } from '@/components/TransactionRow';
import {
  colors,
  glass,
  radius,
  shadowElevation,
  spacing,
  typography,
} from '@/components/theme';
import {
  filterTransactions,
  type LedgerFilter,
} from '@/features/dashboard/dashboard';
import { formatPaiseAsINR } from '@/utils/money';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { useTransactionsStore } from '@/stores/transactions.store';

const FILTERS: SegmentOption<LedgerFilter>[] = [
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
  const [entranceAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entranceAnim]);

  const visible = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter],
  );

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (listStatus === 'idle' || listStatus === 'error') void load();
    if (accountsStatus === 'idle' || accountsStatus === 'error') void loadAccounts();
  }, [sessionStatus, listStatus, accountsStatus, load, loadAccounts]);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const isEmpty = listStatus === 'ready' && visible.length === 0;

  return (
    <View style={styles.root}>
      {/* Hyper-Bright Electric Cyan Liquid River with Moving Light Nodes */}
      <FlowRibbon width="100%" height="100%" opacity={0.88} />

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
          {/* Header with Search and Date Pill */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Expenses</Text>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.dateBadgeText}>Today ∨</Text>
            </View>
          </View>

          {/* Top-Lit Specular Monthly Summary Strip */}
          <View style={[styles.summaryCard, shadowElevation(2)]}>
            <View style={styles.topHighlightEdge} pointerEvents="none" />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                +{formatPaiseAsINR(monthIncomePaise)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>
                −{formatPaiseAsINR(monthExpensePaise)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: monthNetPaise >= 0 ? colors.electricCyan : colors.danger },
                ]}
              >
                {formatPaiseAsINR(monthNetPaise)}
              </Text>
            </View>
          </View>

          {/* Animated Segmented Filter Bar */}
          <View style={styles.filterContainer}>
            <SegmentedControl
              options={FILTERS}
              selected={filter}
              onSelect={setFilter}
            />
          </View>

          {/* Error Banner if error exists */}
          {listStatus === 'error' && !!errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => void load()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Transactions List or Conditionally Rendered Empty State */}
          {isEmpty ? (
            <View style={[styles.emptyCard, glass.card]}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                {filter === 'all'
                  ? 'Recorded transactions will appear in this list.'
                  : `No ${filter} transactions found for this period.`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={visible}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TransactionRow
                  txn={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/edit-transaction',
                      params: { id: item.id },
                    })
                  }
                />
              )}
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
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  dateBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    fontWeight: '600',
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
  filterContainer: {
    marginBottom: spacing.md,
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
    paddingBottom: spacing.xxl * 2,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(13, 19, 33, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    position: 'relative',
  },
  summaryDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 32,
    width: 1,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.bodySm,
    fontWeight: '800',
    marginTop: 3,
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
});
