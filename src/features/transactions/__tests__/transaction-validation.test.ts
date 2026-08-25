import { validateTransactionInput } from '../transaction-validation';

const base = {
  type: 'expense',
  amountPaise: 25000,
  accountId: 'acc-1',
  occurredAt: '2026-01-15T10:00:00.000Z',
};

describe('validateTransactionInput — valid inputs', () => {
  it('accepts a valid income', () => {
    const result = validateTransactionInput({ ...base, type: 'income' });
    expect(result.valid).toBe(true);
  });

  it('accepts a valid expense', () => {
    const result = validateTransactionInput(base);
    expect(result.valid && result.amountPaise === 25000).toBe(true);
  });

  it('accepts a valid transfer with distinct legs', () => {
    const result = validateTransactionInput({
      ...base,
      type: 'transfer',
      accountId: 'acc-1',
      toAccountId: 'acc-2',
    });
    expect(result.valid && result.toAccountId === 'acc-2').toBe(true);
  });

  it('normalises note whitespace and drops empty notes to null', () => {
    const result = validateTransactionInput({ ...base, note: '   ' });
    expect(result.valid && result.note).toBeNull();
  });

  it('accepts a note at the DB limit (500 chars)', () => {
    const result = validateTransactionInput({ ...base, note: 'a'.repeat(500) });
    expect(result.valid).toBe(true);
  });
});

describe('validateTransactionInput — amount rules (DB: amount_paise > 0)', () => {
  it('rejects zero amounts', () => {
    const result = validateTransactionInput({ ...base, amountPaise: 0 });
    expect(!result.valid && result.field === 'amount').toBe(true);
  });

  it('rejects negative amounts', () => {
    const result = validateTransactionInput({ ...base, amountPaise: -100 });
    expect(!result.valid && result.field === 'amount').toBe(true);
  });

  it('rejects non-integer paise', () => {
    const result = validateTransactionInput({ ...base, amountPaise: 99.5 });
    expect(!result.valid && result.field === 'amount').toBe(true);
  });

  it('rejects non-numeric amounts', () => {
    const result = validateTransactionInput({
      ...base,
      amountPaise: '500' as unknown as number,
    });
    expect(!result.valid && result.field === 'amount').toBe(true);
  });
});

describe('validateTransactionInput — type and leg rules', () => {
  it('rejects invalid types', () => {
    const result = validateTransactionInput({ ...base, type: 'payment' });
    expect(!result.valid && result.field === 'type').toBe(true);
  });

  it('requires an account', () => {
    const result = validateTransactionInput({ ...base, accountId: '' });
    expect(!result.valid && result.field === 'accountId').toBe(true);
  });

  it('rejects a transfer without a destination', () => {
    const result = validateTransactionInput({
      ...base,
      type: 'transfer',
      toAccountId: null,
    });
    expect(!result.valid && result.field === 'toAccountId').toBe(true);
  });

  it('rejects a transfer where source equals destination', () => {
    const result = validateTransactionInput({
      ...base,
      type: 'transfer',
      accountId: 'acc-1',
      toAccountId: 'acc-1',
    });
    expect(
      !result.valid && result.field === 'toAccountId' && /different/.test(result.message),
    ).toBe(true);
  });

  it('rejects a destination account on income/expense (DB CHECK parity)', () => {
    const result = validateTransactionInput({ ...base, toAccountId: 'acc-9' });
    expect(!result.valid && result.field === 'toAccountId').toBe(true);
  });
});

describe('validateTransactionInput — dates and notes', () => {
  it('rejects invalid dates', () => {
    const result = validateTransactionInput({ ...base, occurredAt: 'not-a-date' });
    expect(!result.valid && result.field === 'occurredAt').toBe(true);
  });

  it('rejects notes beyond the DB limit (501 chars)', () => {
    const result = validateTransactionInput({ ...base, note: 'a'.repeat(501) });
    expect(!result.valid && result.field === 'note').toBe(true);
  });
});
