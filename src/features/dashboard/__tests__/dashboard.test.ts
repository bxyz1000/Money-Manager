import {
  filterTransactions,
  recentTransactions,
  savingsFraction,
  totalBalancePaise,
  type LedgerFilter,
} from '../dashboard';

const accounts = [
  { balancePaise: 450000 },
  { balancePaise: 150000 },
  { balancePaise: 120000 },
];

const txns = [
  { id: '1', type: 'expense' as const, amountPaise: 100 },
  { id: '2', type: 'income' as const, amountPaise: 200 },
  { id: '3', type: 'transfer' as const, amountPaise: 300 },
  { id: '4', type: 'expense' as const, amountPaise: 400 },
];

describe('totalBalancePaise', () => {
  it('sums authoritative account balances exactly', () => {
    expect(totalBalancePaise(accounts)).toBe(720000);
  });

  it('returns zero for no accounts', () => {
    expect(totalBalancePaise([])).toBe(0);
  });
});

describe('savingsFraction', () => {
  it('computes kept fraction of income', () => {
    // income 500k, expense 300k → net 200k → 0.4
    expect(savingsFraction(500000, 300000)).toBeCloseTo(0.4, 10);
  });

  it('clamps overspending to zero', () => {
    expect(savingsFraction(100000, 250000)).toBe(0);
  });

  it('returns full fraction when nothing is spent', () => {
    expect(savingsFraction(100000, 0)).toBe(1);
  });

  it('returns zero when there is no income yet (ring shows track)', () => {
    expect(savingsFraction(0, 0)).toBe(0);
  });
});

describe('filterTransactions', () => {
  it("'all' passes everything through", () => {
    expect(filterTransactions(txns as never[], 'all')).toHaveLength(4);
  });

  it('filters each ledger type', () => {
    expect(filterTransactions(txns, 'expense')).toHaveLength(2);
    expect(filterTransactions(txns, 'income')).toHaveLength(1);
    expect(filterTransactions(txns, 'transfer')).toHaveLength(1);
  });

  it('does not mutate the source array for "all"', () => {
    const copy = filterTransactions(txns as never[], 'all');
    expect(copy).not.toBe(txns);
  });

  it('recentTransactions slices newest-first without mutating', () => {
    const sliced = recentTransactions([1, 2, 3, 4, 5], 2);
    expect(sliced).toEqual([1, 2]);
    expect(recentTransactions([1], 5)).toEqual([1]);
  });
});

describe('LedgerFilter type usage sanity', () => {
  it('accepts the documented filter values', () => {
    const values: LedgerFilter[] = ['all', 'income', 'expense', 'transfer'];
    expect(values).toHaveLength(4);
  });
});
