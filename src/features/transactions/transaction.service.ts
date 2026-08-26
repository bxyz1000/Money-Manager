import type { Transaction } from '@/types/domain';
import type { Paise } from '@/utils/money';
import { logDev } from '@/utils/logger';
import { supabase } from '@/services/supabase.client';

import { validateTransactionInput, type TransactionInputFields } from './transaction-validation';
import { computeMonthlyTotals, monthRangeUtc } from './monthly';

/**
 * Transaction repository/service — the ONLY module touching Supabase for the
 * ledger. UI/stores never import supabase-js.
 *
 * TRANSFER ATOMICITY: the schema represents a transfer as ONE row carrying
 * both legs (account_id = source, to_account_id = destination) guarded by
 * CHECK transactions_transfer_legs. Every write below is therefore a single
 * atomic statement — there is no multi-row transfer sequence that could
 * partially fail. Balances stay derived (account_balances view); nothing here
 * mutates balances directly.
 *
 * OWNERSHIP: user_id never accepted from callers — RLS (auth.uid() = user_id)
 * scopes every read/write to the authenticated session.
 */

export interface TransactionInput {
  type: Transaction['type'];
  amountPaise: Paise;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  /** ISO timestamp of when the money movement happened. */
  occurredAt: string;
}

/** Domain row enriched for display; names resolved server-side data, not UI logic. */
export interface TransactionListItem extends Transaction {
  accountName: string;
  toAccountName: string | null;
  categoryName: string | null;
}

export type TransactionErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'network'
  | 'not_found'
  | 'unknown';

export class TransactionServiceError extends Error {
  readonly code: TransactionErrorCode;
  /** Safe to render directly in the UI. */
  readonly userMessage: string;

  constructor(code: TransactionErrorCode, userMessage: string) {
    super(userMessage);
    this.name = 'TransactionServiceError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const TRANSACTION_USER_MESSAGES: Record<TransactionErrorCode, string> = {
  validation: 'Please check the entered details.',
  unauthorized: 'Your session has expired. Please sign in again.',
  network: 'Network problem. Check your connection and try again.',
  not_found: 'This transaction no longer exists.',
  unknown: 'Something went wrong. Please try again.',
};

interface TransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount_paise: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  occurred_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as Transaction['type'],
    amountPaise: row.amount_paise,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    categoryId: row.category_id,
    occurredAt: row.occurred_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps any thrown value into a TransactionServiceError; raw errors stay internal. */
export function mapTransactionError(error: unknown): TransactionServiceError {
  if (error instanceof TransactionServiceError) {
    return error;
  }
  if (error instanceof TypeError) {
    console.error('[MoneyManager] Transaction network failure:', error);
    logDev('transactions network failure', { reason: String(error.message) });
    return new TransactionServiceError('network', TRANSACTION_USER_MESSAGES.network);
  }

  const postgrest = error as {
    code?: string | null;
    message?: string;
    details?: string;
    hint?: string;
  } | null;
  const pgCode = postgrest?.code ?? '';
  const postgrestMessage = postgrest?.message ?? '';

  console.error('[MoneyManager] Supabase Transaction Error:', {
    code: pgCode,
    message: postgrestMessage,
    details: postgrest?.details,
    hint: postgrest?.hint,
    raw: error,
  });

  if (pgCode === 'PGRST301' || postgrestMessage.includes('JWT') || postgrestMessage.includes('token')) {
    logDev('transactions unauthorized (expired JWT)');
    return new TransactionServiceError('unauthorized', TRANSACTION_USER_MESSAGES.unauthorized);
  }

  const displayMsg = postgrestMessage || TRANSACTION_USER_MESSAGES.unknown;
  logDev('transactions unexpected error', { pgCode, message: postgrestMessage });
  return new TransactionServiceError('unknown', displayMsg);
}

/** Awaits a query; maps failures. `singleMissIsNotFound` maps PGRST116 to not_found. */
async function throwMapped(
  promise: PromiseLike<{
    data: unknown;
    error: { code?: string | null; message?: string } | null;
  }>,
  options?: { singleMissIsNotFound?: boolean },
): Promise<unknown> {
  let result: { data: unknown; error: { code?: string | null; message?: string } | null };
  try {
    result = await promise;
  } catch (thrown) {
    throw mapTransactionError(thrown);
  }
  if (result.error) {
    if (
      options?.singleMissIsNotFound &&
      result.error.code === 'PGRST116' // no rows for .single()
    ) {
      logDev('transaction not found');
      throw new TransactionServiceError(
        'not_found',
        TRANSACTION_USER_MESSAGES.not_found,
      );
    }
    throw mapTransactionError(result.error);
  }
  return result.data;
}


function toPayload(input: TransactionInputFields): {
  type: string;
  amount_paise: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  note: string | null;
  occurred_at: string;
} {
  const validation = validateTransactionInput(input);
  if (!validation.valid) {
    throw new TransactionServiceError('validation', validation.message);
  }
  return {
    type: validation.type,
    amount_paise: validation.amountPaise,
    account_id: validation.accountId,
    to_account_id: validation.toAccountId,
    category_id: validation.categoryId,
    note: validation.note,
    occurred_at: validation.occurredAt,
  };
}

/** Newest-first page of the signed-in user's ledger, enriched for display. */
export async function listTransactions(limit = 200): Promise<TransactionListItem[]> {
  const rows = (await throwMapped(
    supabase
      .from('transactions')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit),
  )) as TransactionRow[] | null;

  // Resolve display names via small lookup queries — keeps PostgREST embed
  // aliasing out of the picture and works for archived accounts too.
  const accountRows = (await throwMapped(
    supabase.from('accounts').select('id,name'),
  )) as { id: string; name: string }[] | null;
  const categoryRows = (await throwMapped(
    supabase.from('categories').select('id,name'),
  )) as { id: string; name: string }[] | null;

  const accountNames = new Map<string, string>(
    (accountRows ?? []).map((row) => [row.id, row.name]),
  );
  const categoryNames = new Map<string, string>(
    (categoryRows ?? []).map((row) => [row.id, row.name]),
  );

  return (rows ?? []).map((row) => ({
    ...mapTransactionRow(row),
    accountName: accountNames.get(row.account_id) ?? 'Unknown account',
    toAccountName: row.to_account_id
      ? (accountNames.get(row.to_account_id) ?? 'Unknown account')
      : null,
    categoryName: row.category_id
      ? (categoryNames.get(row.category_id) ?? null)
      : null,
  }));
}

export async function getTransaction(id: string): Promise<Transaction> {
  const data = (await throwMapped(
    supabase.from('transactions').select('*').eq('id', id).single(),
    { singleMissIsNotFound: true },
  )) as TransactionRow;
  return mapTransactionRow(data);
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const payload = toPayload(input);
  console.log('[MoneyManager] Creating transaction with payload:', JSON.stringify(payload));
  const data = (await throwMapped(
    supabase.from('transactions').insert(payload).select().single(),
  )) as TransactionRow;
  console.log('[MoneyManager] Transaction created successfully:', data.id);
  return mapTransactionRow(data);
}

/**
 * Full-entity update. The caller supplies the COMPLETE edited transaction
 * (type, amount, legs, category, note, date); the payload is re-validated as
 * a whole, so a type change re-applies transfer-leg rules automatically.
 * Because a transfer is one atomic row, any combination of edits (type swap,
 * leg changes, amount changes) remains a single atomic statement.
 */
export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const payload = toPayload(input);
  const data = (await throwMapped(
    supabase.from('transactions').update(payload).eq('id', id).select().single(),
    { singleMissIsNotFound: true },
  )) as TransactionRow;
  return mapTransactionRow(data);
}

/**
 * Deletes the row outright. Balances and monthly aggregates are derived, so
 * they reflect the deletion automatically — nothing else to unwind.
 */
export async function deleteTransaction(id: string): Promise<void> {
  await throwMapped(
    supabase.from('transactions').delete().eq('id', id).select().single(),
    { singleMissIsNotFound: true },
  );
}

export interface MonthlyTotals {
  incomePaise: Paise;
  expensePaise: Paise;
  netPaise: Paise;
}

/**
 * Income/expense/net for the calendar month starting `monthStart`
 * ('YYYY-MM-DD'). Transfers are fetched in range but excluded from all three
 * figures by computeMonthlyTotals. Aggregation runs here (service layer) over
 * a ranged projection query — never in UI or stores.
 */
export async function getMonthlyTotals(monthStart: string): Promise<MonthlyTotals> {
  const { startIso, endIso } = monthRangeUtc(monthStart);

  const rows = (await throwMapped(
    supabase
      .from('transactions')
      .select('type,amount_paise')
      .gte('occurred_at', startIso)
      .lt('occurred_at', endIso),
  )) as { type: string; amount_paise: number }[] | null;

  return computeMonthlyTotals(
    (rows ?? []).map((r) => ({
      type: r.type as Transaction['type'],
      amountPaise: r.amount_paise,
    })),
  );
}

export const transactionService = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getMonthlyTotals,
};

