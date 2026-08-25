import type { TransactionType } from '@/types/domain';
import { assertValidPaise, MoneyError, sumPaise, type Paise } from '@/utils/money';

/**
 * TypeScript mirror of the `public.account_balances` SQL view.
 *
 * The authoritative definition is the view in
 * supabase/migrations/0001_initial_schema.sql. This function implements the
 * exact same rules so clients (and the future SQLite cache) can compute
 * balances offline; if the view ever changes, this file MUST change with it.
 *
 *   balance = initial_balance_paise        -- opening balance on the ACCOUNT
 *             + income - expenses          -- ledger deltas
 *             - outgoing transfers + incoming transfers
 *
 * Opening balance is an account attribute, never an income/expense
 * transaction, and transfers cancel out of total net worth.
 */

export interface AccountWithOpeningBalance {
  id: string;
  initialBalancePaise: Paise;
}

export interface BalanceLedgerTransaction {
  id: string;
  type: TransactionType;
  /** Positive paise, mirroring the DB CHECK (amount_paise > 0). */
  amountPaise: Paise;
  accountId: string;
  toAccountId: string | null;
}

/** Computes derived balances for every account. Mirrors the SQL view. */
export function computeAccountBalances(
  accounts: readonly AccountWithOpeningBalance[],
  transactions: readonly BalanceLedgerTransaction[],
): Map<string, Paise> {
  const balances = new Map<string, Paise>();
  for (const account of accounts) {
    assertValidPaise(account.initialBalancePaise);
    // Mirrors the DB CHECK (initial_balance_paise >= 0).
    if (account.initialBalancePaise < 0) {
      throw new MoneyError(
        `Opening balance must be zero or positive. Account ${account.id}: ${account.initialBalancePaise}`,
      );
    }
    balances.set(account.id, account.initialBalancePaise);
  }

  for (const txn of transactions) {
    assertValidPaise(txn.amountPaise);
    if (txn.amountPaise <= 0) {
      throw new MoneyError(`Transaction ${txn.id} must carry a positive amount.`);
    }
    const source = balances.get(txn.accountId);
    if (source === undefined) {
      throw new MoneyError(`Transaction ${txn.id} references unknown account ${txn.accountId}.`);
    }

    switch (txn.type) {
      case 'income': {
        balances.set(txn.accountId, source + txn.amountPaise);
        break;
      }
      case 'expense': {
        balances.set(txn.accountId, source - txn.amountPaise);
        break;
      }
      case 'transfer': {
        if (txn.toAccountId === null || txn.toAccountId === txn.accountId) {
          throw new MoneyError(
            `Transfer ${txn.id} must have a destination distinct from its source.`,
          );
        }
        const destination = balances.get(txn.toAccountId);
        if (destination === undefined) {
          throw new MoneyError(
            `Transfer ${txn.id} references unknown destination account ${txn.toAccountId}.`,
          );
        }
        // One atomic row, two legs — exactly like the DB constraint enforces.
        balances.set(txn.accountId, source - txn.amountPaise);
        balances.set(txn.toAccountId, destination + txn.amountPaise);
        break;
      }
      default: {
        throw new MoneyError(`Unknown transaction type on ${txn.id}.`);
      }
    }
  }

  return balances;
}

/**
 * Total net worth across all accounts. Transfers cancel pairwise by
 * construction (see computeAccountBalances), so moving money between
 * accounts never changes this figure.
 */
export function computeTotalNetWorth(balances: ReadonlyMap<string, Paise>): Paise {
  return sumPaise(...balances.values());
}
