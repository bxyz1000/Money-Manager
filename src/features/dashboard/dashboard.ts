import type { TransactionType } from '@/types/domain';
import { sumPaise, type Paise } from '@/utils/money';

/**
 * Dashboard presentation helpers — PURE functions only.
 *
 * These prepare service-provided data for display (totals over authoritative
 * balances from account_balances, month totals from the transaction service's
 * aggregation, list filtering). No financial rules live here; direction and
 * derivation stay in SQL/services.
 */

export function totalBalancePaise(
  accounts: readonly { balancePaise: Paise }[],
): Paise {
  return sumPaise(...accounts.map((account) => account.balancePaise));
}

/**
 * Fraction (0..1) of this month's income that was kept (savings rate).
 * Drives the balance-ring progress. No income yet → 0 (ring shows track only).
 */
export function savingsFraction(incomePaise: Paise, expensePaise: Paise): number {
  if (incomePaise <= 0) {
    return 0;
  }
  const net = incomePaise - expensePaise;
  const fraction = net / incomePaise;
  if (!Number.isFinite(fraction)) {
    return 0;
  }
  return Math.min(1, Math.max(0, fraction));
}

export type LedgerFilter = 'all' | TransactionType;

/** Type filter for the history list ('all' passes everything through). */
export function filterTransactions<T extends { type: TransactionType }>(
  items: readonly T[],
  filter: LedgerFilter,
): T[] {
  if (filter === 'all') {
    return [...items];
  }
  return items.filter((item) => item.type === filter);
}

/** Newest-first slice (items are already newest-first from the service). */
export function recentTransactions<T>(items: readonly T[], count: number): T[] {
  return items.slice(0, Math.max(0, count));
}
