import { validateAccountInput } from '../account-validation';

const base = {
  name: 'HDFC Savings',
  type: 'bank',
  initialBalancePaise: 100000,
};

describe('validateAccountInput — valid inputs', () => {
  it.each([
    ['bank', 'bank'],
    ['upi', 'upi'],
    ['cash', 'cash'],
  ] as const)('accepts a valid %s account', (label, type) => {
    const result = validateAccountInput({ ...base, type });
    expect(result).toEqual({
      valid: true,
      name: 'HDFC Savings',
      type,
      initialBalancePaise: 100000,
    });
  });

  it('accepts zero opening balance', () => {
    const result = validateAccountInput({ ...base, initialBalancePaise: 0 });
    expect(result.valid).toBe(true);
  });

  it('trims surrounding whitespace from names', () => {
    const result = validateAccountInput({ ...base, name: '  Wallet  ' });
    expect(result.valid && result.name).toBe('Wallet');
  });

  it('accepts a name at the DB limit (80 chars)', () => {
    const result = validateAccountInput({ ...base, name: 'a'.repeat(80) });
    expect(result.valid).toBe(true);
  });
});

describe('validateAccountInput — rejections', () => {
  it('rejects an empty name', () => {
    const result = validateAccountInput({ ...base, name: '' });
    expect(!result.valid && result.field === 'name').toBe(true);
  });

  it('rejects a whitespace-only name', () => {
    const result = validateAccountInput({ ...base, name: '   ' });
    expect(!result.valid && result.field === 'name').toBe(true);
  });

  it('rejects names beyond the DB constraint (81 chars)', () => {
    const result = validateAccountInput({ ...base, name: 'a'.repeat(81) });
    expect(!result.valid && result.field === 'name').toBe(true);
  });

  it('rejects an invalid account type', () => {
    const result = validateAccountInput({ ...base, type: 'crypto' });
    expect(!result.valid && result.field === 'type').toBe(true);
  });

  it('rejects a negative opening balance', () => {
    const result = validateAccountInput({ ...base, initialBalancePaise: -1 });
    expect(!result.valid && result.field === 'initialBalance').toBe(true);
  });

  it('rejects non-integer paise (decimal paise unsupported)', () => {
    const result = validateAccountInput({ ...base, initialBalancePaise: 10.5 });
    expect(!result.valid && result.field === 'initialBalance').toBe(true);
  });

  it('rejects non-numeric opening balance input types', () => {
    const result = validateAccountInput({
      ...base,
      initialBalancePaise: '1000' as unknown as number,
    });
    expect(!result.valid && result.field === 'initialBalance').toBe(true);
  });

  it('rejects non-string names', () => {
    const result = validateAccountInput({ ...base, name: undefined });
    expect(!result.valid && result.field === 'name').toBe(true);
  });
});
