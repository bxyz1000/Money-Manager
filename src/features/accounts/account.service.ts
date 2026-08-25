import type { Account, AccountType } from '@/types/domain';
import { logDev } from '@/utils/logger';
import { supabase } from '@/services/supabase.client';

import { validateAccountInput } from './account-validation';

/**
 * Account repository/service — the ONLY module that touches Supabase for
 * accounts. UI and stores never import supabase-js directly.
 *
 * OWNERSHIP: user_id is NEVER accepted from callers. Ownership is determined
 * server-side by RLS (auth.uid() = user_id); rows are written/read for the
 * authenticated session only.
 *
 * BALANCES: displayed balances come from the authoritative `account_balances`
 * SQL view (which folds in initial_balance_paise). This module only joins
 * account rows with their balance rows; no balance arithmetic happens here.
 *
 * OFFLINE BOUNDARY: this phase is Supabase-backed only. The planned SQLite
 * cache/sync layer does not exist yet; when it arrives it will wrap or replace
 * these repository functions without changing store/UI contracts.
 */

export interface AccountInput {
  name: string;
  type: AccountType;
  /** Opening balance in integer paise (>= 0). Immutable after creation. */
  initialBalancePaise: number;
}

export interface AccountWithBalance extends Account {
  /** Derived from public.account_balances (authoritative). */
  balancePaise: number;
}

export type AccountErrorCode =
  | 'duplicate_name'
  | 'unauthorized'
  | 'network'
  | 'validation'
  | 'not_found'
  | 'unknown';

export class AccountServiceError extends Error {
  readonly code: AccountErrorCode;
  /** Safe to render directly in the UI. */
  readonly userMessage: string;

  constructor(code: AccountErrorCode, userMessage: string) {
    super(userMessage);
    this.name = 'AccountServiceError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const ACCOUNT_USER_MESSAGES: Record<AccountErrorCode, string> = {
  duplicate_name: 'You already have an account with this name.',
  unauthorized: 'Your session has expired. Please sign in again.',
  network: 'Network problem. Check your connection and try again.',
  validation: 'Please check the entered details.',
  not_found: 'This account no longer exists.',
  unknown: 'Something went wrong. Please try again.',
};

interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency_code: string;
  initial_balance_paise: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

function mapAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as AccountType,
    currencyCode: row.currency_code as 'INR',
    initialBalancePaise: row.initial_balance_paise,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps any thrown value into an AccountServiceError; raw errors stay internal. */
export function mapAccountError(error: unknown): AccountServiceError {
  if (error instanceof AccountServiceError) {
    return error;
  }
  if (error instanceof TypeError) {
    logDev('accounts network failure', { reason: String(error.message) });
    return new AccountServiceError('network', ACCOUNT_USER_MESSAGES.network);
  }

  const postgrest = error as { code?: string | null; message?: string } | null;
  const pgCode = postgrest?.code ?? '';

  if (pgCode === '23505' || postgrest?.message?.includes('duplicate key')) {
    // unique (user_id, name) on accounts — graceful duplicate handling.
    logDev('accounts duplicate name');
    return new AccountServiceError('duplicate_name', ACCOUNT_USER_MESSAGES.duplicate_name);
  }
  if (pgCode === 'PGRST301' || postgrest?.message?.includes('JWT')) {
    logDev('accounts unauthorized (expired JWT)');
    return new AccountServiceError('unauthorized', ACCOUNT_USER_MESSAGES.unauthorized);
  }

  logDev('accounts unexpected error', { pgCode });
  return new AccountServiceError('unknown', ACCOUNT_USER_MESSAGES.unknown);
}

async function throwMapped(
  promise: PromiseLike<{
    data: unknown;
    error: { code?: string | null; message?: string } | null;
  }>,
): Promise<unknown> {
  let result: { data: unknown; error: { code?: string | null; message?: string } | null };
  try {
    // Fetch-level failures (offline, DNS, timeouts) surface as rejections;
    // API-level failures arrive as { error }. Both are mapped identically.
    result = await promise;
  } catch (thrown) {
    throw mapAccountError(thrown);
  }
  if (result.error) {
    throw mapAccountError(result.error);
  }
  return result.data;
}

/**
 * Active (non-archived) accounts for the signed-in user, each with its
 * authoritative derived balance. Ordered by creation.
 */
export async function listActiveAccounts(): Promise<AccountWithBalance[]> {
  const accountData = (await throwMapped(
    supabase
      .from('accounts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: true }),
  )) as AccountRow[] | null;

  const balanceData = (await throwMapped(
    supabase.from('account_balances').select('account_id,balance_paise'),
  )) as { account_id: string; balance_paise: number }[] | null;

  const balanceById = new Map<string, number>(
    (balanceData ?? []).map((row) => [row.account_id, Number(row.balance_paise)]),
  );

  return (accountData ?? []).map((row) => ({
    ...mapAccountRow(row),
    balancePaise: balanceById.get(row.id) ?? 0,
  }));
}

export async function createAccount(input: AccountInput): Promise<Account> {
  // Defensive re-validation at the service boundary; the UI validates first
  // for inline field errors.
  const validation = validateAccountInput(input);
  if (!validation.valid) {
    throw new AccountServiceError('validation', validation.message);
  }

  const data = (await throwMapped(
    supabase
      .from('accounts')
      .insert({
        name: validation.name,
        type: validation.type,
        initial_balance_paise: validation.initialBalancePaise,
      })
      .select()
      .single(),
  )) as AccountRow;

  return mapAccountRow(data);
}

export interface AccountUpdatePatch {
  name?: string;
  type?: AccountType;
}

/**
 * Edits name and/or type. initial_balance_paise is deliberately NOT editable:
 * opening balance represents historical financial state and may only be
 * changed later through an explicit adjustment mechanism.
 */
export async function updateAccount(id: string, patch: AccountUpdatePatch): Promise<Account> {
  const payload: { name?: string; type?: AccountType } = {};
  if (patch.name !== undefined) {
    const validation = validateAccountInput({
      name: patch.name,
      type: patch.type ?? 'bank',
      initialBalancePaise: 0,
    });
    if (!validation.valid) {
      if (validation.field === 'name') {
        throw new AccountServiceError('validation', validation.message);
      }
    } else {
      payload.name = validation.name;
    }
  }
  if (patch.type !== undefined) {
    payload.type = patch.type;
  }
  if (Object.keys(payload).length === 0) {
    throw new AccountServiceError('validation', 'Nothing to update.');
  }

  const data = (await throwMapped(
    supabase.from('accounts').update(payload).eq('id', id).select().single(),
  )) as AccountRow;

  return mapAccountRow(data);
}

/**
 * Soft-archives an account: sets is_archived = true, preserving the account
 * row and all transaction history. Never hard-deletes.
 */
export async function archiveAccount(id: string): Promise<void> {
  await throwMapped(
    supabase.from('accounts').update({ is_archived: true }).eq('id', id).select().single(),
  );
}

export const accountService = {
  listActiveAccounts,
  createAccount,
  updateAccount,
  archiveAccount,
};

