import type { Paise } from '@/utils/money';

/**
 * Domain model — mirrors the PostgreSQL schema in
 * supabase/migrations/0001_initial_schema.sql.
 *
 * All monetary fields are Paise (integer minor units). See utils/money.ts.
 * Dates are ISO 8601 strings; period starts are "YYYY-MM-DD".
 */

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

/** V1 account types. */
export type AccountType = 'bank' | 'upi' | 'cash';

/**
 * V1 transaction types.
 *
 * Transfer semantics: a transfer is a SINGLE row carrying both legs
 * (`accountId` = source/debit leg, `toAccountId` = destination/credit leg).
 * One atomic row makes it impossible for the two legs of a transfer to
 * diverge. Transfers move money between accounts and are excluded by
 * definition from income/expense aggregation.
 */
export type TransactionType = 'income' | 'expense' | 'transfer';

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SavingsGoalStatus = 'active' | 'achieved' | 'archived';
export type AiInsightKind = 'summary' | 'tip' | 'anomaly';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  currencyCode: 'INR';
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currencyCode: 'INR';
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  /** Always positive; direction comes from type + account legs. */
  amountPaise: Paise;
  /**
   * income/expense: the single affected account.
   * transfer: the SOURCE account (money leaves this account).
   */
  accountId: string;
  /** transfer only: the DESTINATION account. Must differ from accountId. */
  toAccountId: string | null;
  categoryId: string | null;
  occurredAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringPayment {
  id: string;
  userId: string;
  name: string;
  amountPaise: Paise;
  frequency: RecurringFrequency;
  nextDueDate: string;
  accountId: string;
  categoryId: string | null;
  autoDebit: boolean;
  isActive: boolean;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmountPaise: Paise;
  savedAmountPaise: Paise;
  targetDate: string | null;
  status: SavingsGoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySummary {
  id: string;
  userId: string;
  /** First day of the covered month, "YYYY-MM-DD". */
  periodStart: string;
  totalIncomePaise: Paise;
  totalExpensePaise: Paise;
  /** Total moved via transfers out of tracked accounts (not an expense). */
  totalTransferredPaise: Paise;
  netSavingsPaise: Paise;
  computedAt: string;
}

export interface AiInsight {
  id: string;
  userId: string;
  kind: AiInsightKind;
  periodStart: string | null;
  content: string;
  /** Identifier of the generating model (e.g. Gemini version). */
  model: string | null;
  createdAt: string;
}
