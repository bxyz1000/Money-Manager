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
import { GlassButton, GlassCard } from '@/components/GlassCard';
import { HeroRadialGlow } from '@/components/HeroRadialGlow';
import { TransactionRow } from '@/components/TransactionRow';
import {
  colors,
  radius,
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
          {/* Header Row */}
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
              <GlassButton
                accessibilityLabel="Search"
                onPress={() => router.push('/(app)/(tabs)/expenses')}
                style={styles.headerIconBtn}
                borderRadius={radius.pill}
                intensity={40}
              >
                <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
              </GlassButton>
              <GlassButton
                accessibilityLabel="Accounts"
                onPress={() => router.push('/(app)/(tabs)/accounts')}
                style={styles.headerIconBtn}
                borderRadius={radius.pill}
                intensity={40}
              >
                <Ionicons name="notifications-outline" size={19} color={colors.textSecondary} />
              </GlassButton>
            </View>
          </View>

          {/* Hero Balance Section with Centered Soft Radial Glow */}
          <View style={styles.heroSection}>
            <HeroRadialGlow size={320} />
            <BalanceRing
              fraction={fraction}
              centerLabel={formatTotal(total)}
              onAddPress={() => openAdd('expense')}
            />
          </View>

          {/* Frosted Glass Action Buttons ("Send" / "Receive" / "Transfer") */}
          <View style={styles.quickActionRow}>
            <GlassButton
              accessibilityLabel="Send Expense"
              style={styles.actionPill}
              intensity={50}
              borderRadius={radius.md}
              onPress={() => openAdd('expense')}
            >
              <View style={styles.actionPillContent}>
                <Text style={styles.actionPillText}>Send</Text>
              </View>
            </GlassButton>

            <GlassButton
              accessibilityLabel="Receive Income"
              style={styles.actionPill}
              intensity={50}
              borderRadius={radius.md}
              onPress={() => openAdd('income')}
            >
              <View style={styles.actionPillContent}>
                <Text style={styles.actionPillText}>Receive</Text>
              </View>
            </GlassButton>

            <GlassButton
              accessibilityLabel="Transfer Money"
              style={styles.actionPill}
              intensity={50}
              borderRadius={radius.md}
              onPress={() => openAdd('transfer')}
            >
              <View style={styles.actionPillContent}>
                <Text style={styles.actionPillText}>Transfer</Text>
              </View>
            </GlassButton>
          </View>

          {/* Recent Transactions Section Header with Generous Spacing */}
          <View style={styles.sectionHeader}>
            <View style={styles.dateSelectorRow}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              <GlassCard style={styles.datePill} intensity={40} borderRadius={radius.pill}>
                <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.datePillText}>Today ∨</Text>
              </GlassCard>
            </View>

            <Pressable onPress={() => router.push('/(app)/(tabs)/expenses')}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          {/* Frosted Glass Transactions List */}
          <View style={styles.recentList}>
            {recent.length === 0 ? (
              <GlassCard style={styles.emptyCard} intensity={45} borderRadius={radius.md}>
                <Text style={styles.emptyText}>Your recent transactions will appear here.</Text>
              </GlassCard>
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

/** Indian-grouped rupee formatting. */
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
    flex: 1,
  },
  actionPillContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionPillText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '500',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 112, 243, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  avatarText: {
    color: colors.primaryText,
    fontSize: typography.title,
    fontWeight: '600',
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
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  datePillText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '500',
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
    fontWeight: '400',
  },
  headerIconBtn: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerIconsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.sectionGap,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sectionGap,
    position: 'relative',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sectionGap,
  },
  recentList: {
    gap: spacing.sm + 2,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md + 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  viewAll: {
    color: colors.electricCyan,
    fontSize: typography.caption + 1,
    fontWeight: '500',
  },
  welcomeBack: {
    color: colors.text,
    fontSize: typography.title + 1,
    fontWeight: '600',
  },
});
