import type { AccountType } from '@/types/domain';
import { assertValidPaise } from '@/utils/money';

/**
 * Account creation/edit validation.
 *
 * Single source of truth for field rules; the UI calls this for inline field
 * errors AND the service re-validates defensively before touching Supabase.
 * Money values arrive as integer paise parsed by utils/money.parseAmountToPaise
 * (never parseFloat).
 */

export interface AccountInputFields {
  name: unknown;
  type: unknown;
  initialBalancePaise: unknown;
}

export type AccountField = 'name' | 'type' | 'initialBalance';

export type AccountValidationResult =
  | { valid: true; name: string; type: AccountType; initialBalancePaise: number }
  | { valid: false; field: AccountField; message: string };

const ACCOUNT_TYPES: readonly AccountType[] = ['bank', 'upi', 'cash'];

/** Mirrors the DB CHECK: length(btrim(name)) between 1 and 80. */
const NAME_MAX_LENGTH = 80;

function isAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * Validates raw input fields. Returns the cleaned values on success or a
 * field-scoped message suitable for direct display under the offending input.
 */
export function validateAccountInput(input: AccountInputFields): AccountValidationResult {
  if (typeof input.name !== 'string') {
    return { valid: false, field: 'name', message: 'Account name is required.' };
  }
  const name = input.name.trim();
  if (name.length === 0) {
    return { valid: false, field: 'name', message: 'Account name is required.' };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return {
      valid: false,
      field: 'name',
      message: `Account name must be ${NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!isAccountType(input.type)) {
    return { valid: false, field: 'type', message: 'Choose Bank, UPI or Cash.' };
  }

  if (typeof input.initialBalancePaise !== 'number') {
    return {
      valid: false,
      field: 'initialBalance',
      message: 'Opening balance must be a valid amount.',
    };
  }
  try {
    assertValidPaise(input.initialBalancePaise);
  } catch {
    return {
      valid: false,
      field: 'initialBalance',
      message: 'Opening balance must be a whole number of paise.',
    };
  }
  // Mirrors the DB CHECK (initial_balance_paise >= 0).
  if (input.initialBalancePaise < 0) {
    return {
      valid: false,
      field: 'initialBalance',
      message: 'Opening balance cannot be negative.',
    };
  }

  return { valid: true, name, type: input.type, initialBalancePaise: input.initialBalancePaise };
}
