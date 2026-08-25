import type { TransactionType } from '@/types/domain';
import type { Paise } from '@/utils/money';

/**
 * Transaction validation — shared by UI (inline field errors) and the service
 * (defensive re-validation). Rules mirror supabase/migrations/0001:
 *
 * - amount_paise: BIGINT, CHECK (> 0), integer only
 * - type: income | expense | transfer
 * - transfer: to_account_id NOT NULL and <> account_id (CHECK transactions_transfer_legs)
 * - non-transfer: to_account_id must be absent (same CHECK)
 * - note: char_length <= 500
 * - occurred_at: valid timestamp
 */

export interface TransactionInputFields {
  type: unknown;
  amountPaise: unknown;
  accountId: unknown;
  toAccountId?: unknown;
  categoryId?: unknown;
  note?: unknown;
  occurredAt: unknown;
}

export type TransactionField =
  | 'type'
  | 'amount'
  | 'accountId'
  | 'toAccountId'
  | 'categoryId'
  | 'note'
  | 'occurredAt';

export type TransactionValidationResult =
  | {
      valid: true;
      type: TransactionType;
      amountPaise: Paise;
      accountId: string;
      toAccountId: string | null;
      categoryId: string | null;
      note: string | null;
      occurredAt: string;
    }
  | { valid: false; field: TransactionField; message: string };

const TRANSACTION_TYPES: readonly TransactionType[] = ['income', 'expense', 'transfer'];
/** Mirrors DB CHECK char_length(note) <= 500. */
export const NOTE_MAX_LENGTH = 500;

function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === 'string' && (TRANSACTION_TYPES as readonly string[]).includes(value);
}

function isValidDateString(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Validates a full transaction payload. Account IDs are validated for shape
 * only (non-empty strings); existence/ownership is enforced server-side by
 * composite foreign keys + RLS, never trusted from the client.
 */
export function validateTransactionInput(
  input: TransactionInputFields,
): TransactionValidationResult {
  if (!isTransactionType(input.type)) {
    return { valid: false, field: 'type', message: 'Choose Income, Expense or Transfer.' };
  }
  const type: TransactionType = input.type;

  if (typeof input.amountPaise !== 'number') {
    return { valid: false, field: 'amount', message: 'Enter a valid amount.' };
  }
  if (!Number.isInteger(input.amountPaise)) {
    return {
      valid: false,
      field: 'amount',
      message: 'Amounts are stored as whole paise; the input resolved to a fraction.',
    };
  }
  // Mirrors DB CHECK (amount_paise > 0): zero and negative amounts rejected.
  if (input.amountPaise <= 0) {
    return { valid: false, field: 'amount', message: 'Amount must be greater than zero.' };
  }

  if (typeof input.accountId !== 'string' || input.accountId.trim().length === 0) {
    return {
      valid: false,
      field: 'accountId',
      message: type === 'transfer' ? 'Choose the source account.' : 'Choose an account.',
    };
  }

  // Transfer leg rules mirror CHECK transactions_transfer_legs exactly.
  let toAccountId: string | null = null;
  if (type === 'transfer') {
    if (typeof input.toAccountId !== 'string' || input.toAccountId.trim().length === 0) {
      return { valid: false, field: 'toAccountId', message: 'Choose the destination account.' };
    }
    if (input.toAccountId === input.accountId) {
      return {
        valid: false,
        field: 'toAccountId',
        message: 'Source and destination accounts must be different.',
      };
    }
    toAccountId = input.toAccountId;
  } else if (
    input.toAccountId !== undefined &&
    input.toAccountId !== null &&
    input.toAccountId !== ''
  ) {
    // A destination on an income/expense would violate the DB constraint.
    return {
      valid: false,
      field: 'toAccountId',
      message: 'Only transfers may have a destination account.',
    };
  }

  let categoryId: string | null = null;
  if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== '') {
    if (typeof input.categoryId !== 'string') {
      return { valid: false, field: 'categoryId', message: 'Invalid category.' };
    }
    categoryId = input.categoryId;
  }

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null && input.note !== '') {
    if (typeof input.note !== 'string') {
      return { valid: false, field: 'note', message: 'Invalid note.' };
    }
    const trimmedNote = input.note.trim();
    if (trimmedNote.length === 0) {
      note = null;
    } else if (trimmedNote.length > NOTE_MAX_LENGTH) {
      return {
        valid: false,
        field: 'note',
        message: `Notes are limited to ${NOTE_MAX_LENGTH} characters.`,
      };
    } else {
      note = trimmedNote;
    }
  }

  if (typeof input.occurredAt !== 'string' || !isValidDateString(input.occurredAt)) {
    return { valid: false, field: 'occurredAt', message: 'Enter a valid date.' };
  }

  return {
    valid: true,
    type,
    amountPaise: input.amountPaise,
    accountId: input.accountId.trim(),
    toAccountId,
    categoryId,
    note,
    occurredAt: input.occurredAt,
  };
}
