/**
 * Money utilities — the single chokepoint for all monetary arithmetic.
 *
 * DECISION (approved): all monetary values are integers in minor units
 * (paise) end-to-end — TypeScript, SQLite (future cache), PostgreSQL BIGINT.
 *
 * Rationale:
 * - IEEE-754 floats cannot represent decimal fractions exactly and drift
 *   under summation; that is unacceptable for financial data.
 * - JS numbers exactly represent integers up to Number.MAX_SAFE_INTEGER
 *   (2^53 - 1 ≈ ₹90,071,992,547,409.91), far beyond personal-finance scale.
 *
 * Rules enforced here:
 * - Every exported function validates its inputs are safe integers.
 * - User-entered amounts are parsed from strings (never via parseFloat).
 * - paiseToDecimalRupees() exists ONLY for display formatting; its output
 *   must never be used as an input to further arithmetic.
 */

export type Paise = number;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/** Throws unless `value` is an integer within the safe range. */
export function assertValidPaise(value: number): void {
  if (!Number.isInteger(value)) {
    throw new MoneyError(`Monetary value must be an integer number of paise. Received: ${value}`);
  }
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new MoneyError(`Monetary value exceeds the safe integer range: ${value}`);
  }
}

/**
 * Parses a user-facing amount string into paise.
 * Accepts an optional leading "-" sign, optional thousands separators (","),
 * an optional "₹" prefix and surrounding whitespace.
 * Requires at most two decimal places — rounding is never implicit.
 *
 * Examples: "1234" -> 123400 | "1,234.56" -> 123456 | "-₹10.5" -> -1050
 */
export function parseAmountToPaise(input: string): Paise {
  if (typeof input !== 'string') {
    throw new MoneyError('Amount must be provided as a string.');
  }
  const cleaned = input.trim().replace(/[₹,\s]/g, '');
  if (cleaned.length === 0) {
    throw new MoneyError('Amount must not be empty.');
  }
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new MoneyError(
      `Invalid amount "${input}". Use digits with at most two decimal places, e.g. "1234.56".`,
    );
  }
  const sign = match[1] === '-' ? -1 : 1;
  const whole = match[2] ?? '0';
  const fraction = match[3] ?? '';
  const fractionPaise = Number(fraction.padEnd(2, '0'));
  const result = sign * (Number(whole) * 100 + fractionPaise);
  assertValidPaise(result);
  return result;
}

/** Converts whole rupees (integer only) into paise. */
export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isInteger(rupees)) {
    throw new MoneyError(
      `rupeesToPaise accepts whole rupees only. For fractional input use parseAmountToPaise(). Received: ${rupees}`,
    );
  }
  assertValidPaise(rupees);
  const result = rupees * 100;
  assertValidPaise(result);
  return result;
}

/**
 * Formats paise as an INR string with Indian digit grouping.
 * Examples: 123456 -> "₹1,234.56" | 123456789 -> "₹12,34,567.89" | -50 -> "-₹0.50"
 */
export function formatPaiseAsINR(paise: Paise): string {
  assertValidPaise(paise);
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100);
  const paisa = abs % 100;

  let grouped = String(rupees);
  if (grouped.length > 3) {
    const last3 = grouped.slice(-3);
    const rest = grouped.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }

  return `${negative ? '-' : ''}₹${grouped}.${String(paisa).padStart(2, '0')}`;
}

/** Sums paise values with overflow safety. */
export function sumPaise(...values: readonly Paise[]): Paise {
  let total = 0;
  for (const value of values) {
    assertValidPaise(value);
    total += value;
  }
  assertValidPaise(total);
  return total;
}

/** Subtracts b from a with overflow safety. */
export function subtractPaise(a: Paise, b: Paise): Paise {
  assertValidPaise(a);
  assertValidPaise(b);
  const result = a - b;
  assertValidPaise(result);
  return result;
}

/**
 * DISPLAY ONLY. Converts paise to a decimal rupee float for UI formatting
 * paths that need a number. The result has the same float imprecision we
 * forbid elsewhere and MUST NOT feed back into arithmetic or persistence.
 */
export function paiseToDecimalRupees(paise: Paise): number {
  assertValidPaise(paise);
  return paise / 100;
}
