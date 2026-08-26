import { StyleSheet, Text, View } from 'react-native';

import type { TransactionListItem } from '@/features/transactions/transaction.service';
import { formatPaiseAsINR } from '@/utils/money';
import { GlassButton } from './GlassCard';
import { colors, radius, spacing, typography } from './theme';

interface TransactionRowProps {
  txn: TransactionListItem;
  onPress?: () => void;
  disabled?: boolean;
}

function getTransactionMeta(type: string) {
  switch (type) {
    case 'income':
      return {
        prefix: '+',
        color: colors.success,
        bgColor: colors.incomeTint,
        borderColor: colors.incomeBorder,
        glyph: '↓',
      };
    case 'expense':
      return {
        prefix: '−',
        color: colors.danger,
        bgColor: colors.expenseTint,
        borderColor: colors.expenseBorder,
        glyph: '↑',
      };
    case 'transfer':
    default:
      return {
        prefix: '↔ ',
        color: colors.electricCyan,
        bgColor: colors.transferTint,
        borderColor: colors.transferBorder,
        glyph: '↔',
      };
  }
}

export function TransactionRow({ txn, onPress, disabled }: TransactionRowProps) {
  const meta = getTransactionMeta(txn.type);
  const title =
    txn.type === 'transfer' && txn.toAccountName
      ? `${txn.accountName} → ${txn.toAccountName}`
      : txn.categoryName ?? txn.type.charAt(0).toUpperCase() + txn.type.slice(1);

  const formattedDate = new Date(txn.occurredAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const subtitle = [txn.accountName, txn.note].filter(Boolean).join(' · ');

  return (
    <GlassButton
      onPress={onPress}
      disabled={disabled}
      intensity={45}
      borderRadius={radius.md}
      accessibilityLabel={`${txn.type} ${formatPaiseAsINR(txn.amountPaise)} on ${title}`}
    >
      <View style={styles.cardContent}>
        {/* Left Icon Badge with Frosted Tint */}
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: meta.bgColor,
              borderColor: meta.borderColor,
            },
          ]}
        >
          <Text style={[styles.avatarGlyph, { color: meta.color }]}>
            {txn.categoryName ? txn.categoryName.charAt(0).toUpperCase() : meta.glyph}
          </Text>
        </View>

        {/* Center: Title & Subtitle */}
        <View style={styles.centerInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || formattedDate}
          </Text>
        </View>

        {/* Right: Amount & Date (Regular/Medium weight) */}
        <View style={styles.rightInfo}>
          <Text style={[styles.amount, { color: meta.color }]}>
            {meta.prefix}
            {formatPaiseAsINR(txn.amountPaise)}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>
    </GlassButton>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: typography.body + 1,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarGlyph: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  centerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  date: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
    textAlign: 'right',
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    marginTop: 2,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '500',
  },
});
