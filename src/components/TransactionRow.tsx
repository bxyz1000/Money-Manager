import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionListItem } from '@/features/transactions/transaction.service';
import { formatPaiseAsINR } from '@/utils/money';
import { colors, radius, shadowElevation, spacing, typography } from './theme';

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
    <Pressable
      style={({ pressed }) => [
        styles.card,
        shadowElevation(2),
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${txn.type} ${formatPaiseAsINR(txn.amountPaise)} on ${title}`}
      accessibilityRole="button"
    >
      {/* Specular Top-Edge Razor Highlight */}
      <View style={styles.topHighlightEdge} pointerEvents="none" />

      {/* Left Avatar with Colored Glowing Tint */}
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

      {/* Right: Prominent Amount & Date */}
      <View style={styles.rightInfo}>
        <Text style={[styles.amount, { color: meta.color }]}>
          {meta.prefix}
          {formatPaiseAsINR(txn.amountPaise)}
        </Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: typography.body + 1,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarGlyph: {
    fontSize: 16,
    fontWeight: '700',
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
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption + 1,
    marginTop: 3,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  topHighlightEdge: {
    backgroundColor: colors.specularBorderTop,
    height: 1.5,
    left: 0,
    opacity: 0.85,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
