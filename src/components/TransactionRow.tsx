import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionListItem } from '@/features/transactions/transaction.service';
import { formatPaiseAsINR } from '@/utils/money';
import { colors, glass, radius, spacing } from './theme';

/**
 * Premium translucent transaction card shared by Home (recent) and Expenses
 * (full history). Pure presentation — all figures are pre-computed by the
 * service layer; sign/color mapping is presentation, not arithmetic.
 */

function amountPrefix(type: string): string {
  if (type === 'income') return '+';
  if (type === 'expense') return '−';
  return '↔ ';
}

function amountColor(type: string): string {
  if (type === 'income') return colors.success;
  if (type === 'expense') return colors.danger;
  return colors.accentBright;
}

function typeBadge(type: string): string {
  if (type === 'income') return '↓';
  if (type === 'expense') return '↑';
  return '↔';
}

interface TransactionRowProps {
  txn: TransactionListItem;
  onPress?: () => void;
  disabled?: boolean;
}

export function TransactionRow({ txn, onPress, disabled }: TransactionRowProps) {
  const title =
    txn.type === 'transfer' && txn.toAccountName
      ? `${txn.accountName} → ${txn.toAccountName}`
      : txn.categoryName ?? txn.type.charAt(0).toUpperCase() + txn.type.slice(1);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${txn.type} ${formatPaiseAsINR(txn.amountPaise)} on ${title}`}
      accessibilityRole="button"
    >
      <View style={[styles.badge, { borderColor: amountColor(txn.type) }]}>
        <Text style={[styles.badgeText, { color: amountColor(txn.type) }]}>
          {typeBadge(txn.type)}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {txn.type === 'transfer' ? txn.accountName : txn.accountName}
          {!!txn.note ? ` · ${txn.note}` : ''}
        </Text>
        <Text style={styles.date}>{new Date(txn.occurredAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor(txn.type) }]}>
        {amountPrefix(txn.type)}
        {formatPaiseAsINR(txn.amountPaise)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    ...glass.card,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  info: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
