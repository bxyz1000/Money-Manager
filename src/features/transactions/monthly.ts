import type { TransactionType } from '@/types/domain';
import { sumPaise, type Paise } from '@/utils/money';

/**
 * Monthly aggregation — the SINGLE client-side source of truth for
 * month income/expense/net figures.
 *
 * Rules (non-negotiable):
 * - income  -> income total
 * - expense -> expense total
 * - transfer -> NEITHER (transfers move money; they never distort monthly stats)
 *
 * The service feeds this helper with a month-range query result so we never
 * load unbounded history into memory. PostgreSQL remains authoritative for
 * balances (account_balances view); these totals are reporting figures only.
 */

export interface MonthTotals {
  incomePaise: Paise;
  expensePaise: Paise;
  /** income − expense. Transfers contribute nothing. */
  netPaise: Paise;
}

export interface AggregatableTransaction {
  type: TransactionType;
  amountPaise: Paise;
}

/** Pure aggregation over already-fetched transactions. */
export function computeMonthlyTotals(
  transactions: readonly AggregatableTransaction[],
): MonthTotals {
  let income = 0;
  let expense = 0;

  for (const txn of transactions) {
    if (txn.type === 'income') {
      income += txn.amountPaise;
    } else if (txn.type === 'expense') {
      expense += txn.amountPaise;
    }
    // transfers intentionally ignored
  }

  return {
    incomePaise: sumPaise(income),
    expensePaise: sumPaise(expense),
    netPaise: sumPaise(income) - sumPaise(expense),
  };
}

/**
 * Half-open [startISO, endISO) range covering the calendar month that
 * `monthStart` ('YYYY-MM-DD', first day of month) belongs to.
 */
export function monthRangeUtc(monthStart: string): { startIso: string; endIso: string } {
  const start = new Date(`${monthStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid month start: ${monthStart}`);
  }
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** 'YYYY-MM-DD' of the current UTC month — used as the default period key. */
export function currentMonthStart(): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}
