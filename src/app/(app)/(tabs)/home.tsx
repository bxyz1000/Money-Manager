import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BalanceRing } from '@/components/BalanceRing';
import { FlowRibbon } from '@/components/FlowRibbon';
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
  recentTransactions,
  savingsFraction,
  totalBalancePaise,
} from '@/features/dashboard/dashboard';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAccountsStore } from '@/stores/accounts.store';
import { useSessionStore } from '@/stores/session.store';
import { useTransactionsStore } from '@/stores/transactions.store';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useScreenInsets();

  const sessionStatus = useSessionStore((state) => state.status);
  const email = useSessionStore((state) => state.email);
  const displayName = useSessionStore((state) => state.displayName);
  const accounts = useAccountsStore((state) => state.accounts);
  const accountsStatus = useAccountsStore((state) => state.status);
  const loadAccounts = useAccountsStore((state) => state.load);
  const transactions = useTransactionsStore((state) => state.transactions);
  const txnStatus = useTransactionsStore((state) => state.status);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const monthIncomePaise = useTransactionsStore((state) => state.monthIncomePaise);
  const monthExpensePaise = useTransactionsStore((state) => state.monthExpensePaise);

  const [entranceAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entranceAnim]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (accountsStatus === 'idle' || accountsStatus === 'error') void loadAccounts();
    if (txnStatus === 'idle' || txnStatus === 'error') void loadTransactions();
  }, [sessionStatus, accountsStatus, txnStatus, loadAccounts, loadTransactions]);

  if (sessionStatus !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const total = totalBalancePaise(accounts);
  const fraction = savingsFraction(monthIncomePaise, monthExpensePaise);
  const recent = recentTransactions(transactions, 6);
  const emailPrefix = email ? (email.split('@')[0] ?? 'User') : 'User';
  const userGreetingName = displayName || emailPrefix;
  const initial = userGreetingName.trim().charAt(0).toUpperCase();

  function openAdd(type: 'income' | 'expense' | 'transfer'): void {
    router.push({ pathname: '/(app)/add-transaction', params: { type } });
  }

  return (
    <View style={styles.root}>
      {/* Hyper-Bright Electric Cyan Liquid River with Moving Light Nodes */}
      <FlowRibbon width="100%" height="100%" flip opacity={0.88} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, insets]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
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
          {/* Header Row (Avatar + Greeting + Search & Notifications) */}
          <View style={styles.headerRow}>
            <Pressable
              accessibilityLabel="Profile"
              onPress={() => router.push('/(app)/(tabs)/profile')}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Hello {userGreetingName}</Text>
              <Text style={styles.welcomeBack}>Welcome Back</Text>
            </View>

            {/* Quick Header Utility Icons */}
            <View style={styles.headerIconsRow}>
              <Pressable
                accessibilityLabel="Search"
                onPress={() => router.push('/(app)/(tabs)/expenses')}
                style={styles.headerIconBtn}
              >
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Accounts"
                onPress={() => router.push('/(app)/(tabs)/accounts')}
                style={styles.headerIconBtn}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Hero Balance Card with Hyper-Luminous Cyan Vortex Ring */}
          <View style={[styles.ringCard, shadowElevation(2)]}>
            <BalanceRing
              fraction={fraction}
              centerLabel={formatTotal(total)}
              onAddPress={() => openAdd('expense')}
            />
          </View>

          {/* Quick Action Pill Buttons ("Send" / "Receive" / "Transfer") */}
          <View style={styles.quickActionRow}>
            <Pressable
              accessibilityLabel="Send Expense"
              style={({ pressed }) => [
                styles.actionPill,
                glass.card,
                shadowElevation(1),
                pressed && styles.pressed,
              ]}
              onPress={() => openAdd('expense')}
            >
              <Text style={styles.actionPillText}>Send</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Receive Income"
              style={({ pressed }) => [
                styles.actionPill,
                glass.card,
                shadowElevation(1),
                pressed && styles.pressed,
              ]}
              onPress={() => openAdd('income')}
            >
              <Text style={styles.actionPillText}>Receive</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Transfer Money"
              style={({ pressed }) => [
                styles.actionPill,
                glass.card,
                shadowElevation(1),
                pressed && styles.pressed,
              ]}
              onPress={() => openAdd('transfer')}
            >
              <Text style={styles.actionPillText}>Transfer</Text>
            </Pressable>
          </View>

          {/* Recent Transactions Section with Date / Filter Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.dateSelectorRow}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.datePillText}>Recent ∨</Text>
              </View>
            </View>

            <Pressable onPress={() => router.push('/(app)/(tabs)/expenses')}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          {/* Recent Transactions List with Top-Lit Specular Cards */}
          <View style={styles.recentList}>
            {recent.length === 0 ? (
              <View style={[styles.emptyCard, glass.card]}>
                <Text style={styles.emptyText}>Your recent transactions will appear here.</Text>
              </View>
            ) : (
              recent.map((txn) => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/edit-transaction',
                      params: { id: txn.id },
                    })
                  }
                />
              ))
            )}
          </View>
        </Animated.View>
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
  actionPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: 14,
  },
  actionPillText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.neonBlue,
    borderColor: colors.specularBorderTop,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  avatarText: {
    color: colors.primaryText,
    fontSize: typography.title,
    fontWeight: '800',
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  datePillText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  dateSelectorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    fontWeight: '500',
  },
  headerIconBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerIconsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  recentList: {
    gap: spacing.sm,
  },
  ringCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  viewAll: {
    color: colors.electricCyan,
    fontSize: typography.caption + 1,
    fontWeight: '700',
  },
  welcomeBack: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
});
