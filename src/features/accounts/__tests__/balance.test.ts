import { MoneyError } from '@/utils/money';

import {
  computeAccountBalances,
  computeTotalNetWorth,
  type BalanceLedgerTransaction,
} from '../balance';

const BANK = 'bank-1';
const UPI = 'upi-1';
const CASH = 'cash-1';

function accounts(...specs: [string, number][]) {
  return specs.map(([id, initialBalancePaise]) => ({ id, initialBalancePaise }));
}

function txn(partial: Omit<BalanceLedgerTransaction, 'id'>): BalanceLedgerTransaction {
  return { id: 'txn-' + Math.random().toString(36).slice(2), ...partial };
}

describe('computeAccountBalances — opening balance scenarios', () => {
  it('opening balance only: balance equals the opening amount', () => {
    const balances = computeAccountBalances(accounts([BANK, 250000]), []);
    expect(balances.get(BANK)).toBe(250000);
  });

  it('zero opening balance is supported', () => {
    const balances = computeAccountBalances(accounts([BANK, 0]), []);
    expect(balances.get(BANK)).toBe(0);
  });

  it('opening balance + income', () => {
    const balances = computeAccountBalances(accounts([BANK, 100000]), [
      txn({ type: 'income', amountPaise: 50000, accountId: BANK, toAccountId: null }),
    ]);
    expect(balances.get(BANK)).toBe(150000);
  });

  it('opening balance + expense', () => {
    const balances = computeAccountBalances(accounts([BANK, 100000]), [
      txn({ type: 'expense', amountPaise: 30000, accountId: BANK, toAccountId: null }),
    ]);
    expect(balances.get(BANK)).toBe(70000);
  });

  it('opening balance + transfer: source drops, destination rises by the same amount', () => {
    // Bank → UPI ₹1000 (₹500 opening each)
    const balances = computeAccountBalances(
      accounts([BANK, 50000], [UPI, 50000]),
      [txn({ type: 'transfer', amountPaise: 100000, accountId: BANK, toAccountId: UPI })],
    );
    expect(balances.get(BANK)).toBe(-50000);
    expect(balances.get(UPI)).toBe(150000);
    // Net worth unchanged despite the negative source balance.
    expect(computeTotalNetWorth(balances)).toBe(100000);
  });
});

describe('net worth invariants', () => {
  const threeAccounts = accounts([BANK, 100000], [UPI, 20000], [CASH, 5000]);

  it('transfers preserve total net worth regardless of direction or count', () => {
    const before = computeTotalNetWorth(computeAccountBalances(threeAccounts, []));

    const transfers = [
      txn({ type: 'transfer', amountPaise: 40000, accountId: BANK, toAccountId: UPI }),
      txn({ type: 'transfer', amountPaise: 12000, accountId: UPI, toAccountId: CASH }),
      txn({ type: 'transfer', amountPaise: 3000, accountId: CASH, toAccountId: BANK }),
    ];
    const after = computeTotalNetWorth(computeAccountBalances(threeAccounts, transfers));

    expect(after).toBe(before);
    expect(after).toBe(125000);
  });

  it('income and expenses DO change net worth; opening balance counts toward it', () => {
    const withActivity = computeAccountBalances(threeAccounts, [
      txn({ type: 'income', amountPaise: 60000, accountId: BANK, toAccountId: null }),
      txn({ type: 'expense', amountPaise: 25000, accountId: CASH, toAccountId: null }),
    ]);
    // Opening 125000 + 60000 - 25000
    expect(computeTotalNetWorth(withActivity)).toBe(160000);
  });
});

describe('guard rails mirroring the DB constraints', () => {
  it('rejects a transfer without a distinct destination', () => {
    expect(() =>
      computeAccountBalances(accounts([BANK, 100]), [
        txn({ type: 'transfer', amountPaise: 50, accountId: BANK, toAccountId: null }),
      ]),
    ).toThrow(/distinct from its source/);
    expect(() =>
      computeAccountBalances(accounts([BANK, 100]), [
        txn({ type: 'transfer', amountPaise: 50, accountId: BANK, toAccountId: BANK }),
      ]),
    ).toThrow(/distinct from its source/);
  });

  it('rejects non-positive and non-integer amounts', () => {
    expect(() =>
      computeAccountBalances(accounts([BANK, 0]), [
        txn({ type: 'expense', amountPaise: 0, accountId: BANK, toAccountId: null }),
      ]),
    ).toThrow(/positive/);
    expect(() =>
      computeAccountBalances(accounts([BANK, 0]), [
        txn({ type: 'expense', amountPaise: 10.5, accountId: BANK, toAccountId: null }),
      ]),
    ).toThrow(MoneyError);
  });

  it('rejects transactions referencing unknown accounts', () => {
    expect(() =>
      computeAccountBalances(accounts([BANK, 100]), [
        txn({ type: 'income', amountPaise: 50, accountId: 'ghost', toAccountId: null }),
      ]),
    ).toThrow(/unknown account/);
  });

  it('rejects negative opening balances', () => {
    expect(() => computeAccountBalances(accounts([BANK, -1]), [])).toThrow(MoneyError);
  });
});
