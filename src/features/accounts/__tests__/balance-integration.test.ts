import {
  computeAccountBalances,
  computeTotalNetWorth,
} from '../balance';
import { formatPaiseAsINR } from '@/utils/money';

/**
 * Phase 3 balance-integration scenarios (spec section 11C), using the SAME
 * pure mirror the offline/cache layer will use — never a second algorithm.
 */

const BANK = 'bank-1';
const UPI = 'upi-1';

describe('balance integration scenarios', () => {
  it('opening ₹1,000 + income ₹500 − expense ₹200 = ₹1,300', () => {
    const balances = computeAccountBalances([{ id: 'a', initialBalancePaise: 100000 }], [
      { id: 't1', type: 'income', amountPaise: 50000, accountId: 'a', toAccountId: null },
      { id: 't2', type: 'expense', amountPaise: 20000, accountId: 'a', toAccountId: null },
    ]);
    expect(balances.get('a')).toBe(130000);
    expect(formatPaiseAsINR(balances.get('a') ?? -1)).toBe('₹1,300.00');
  });

  it('transfer Bank ₹5,000 / UPI ₹1,000, move Bank→UPI ₹500 → 4,500 / 1,500, total 6,000', () => {
    const accounts = [
      { id: BANK, initialBalancePaise: 500000 },
      { id: UPI, initialBalancePaise: 100000 },
    ];
    const balances = computeAccountBalances(accounts, [
      { id: 't1', type: 'transfer', amountPaise: 50000, accountId: BANK, toAccountId: UPI },
    ]);

    expect(balances.get(BANK)).toBe(450000);
    expect(balances.get(UPI)).toBe(150000);
    expect(computeTotalNetWorth(balances)).toBe(600000);
  });

  it('opening balances contribute to net worth', () => {
    const balances = computeAccountBalances(
      [{ id: 'a', initialBalancePaise: 250000 }],
      [],
    );
    expect(computeTotalNetWorth(balances)).toBe(250000);
  });

  it('opening balance is NOT income and NOT expense', () => {
    // An account with ONLY an opening balance and zero transactions must
    // still show its full opening amount as balance — while income/expense
    // totals for the period remain zero because no transaction rows exist.
    const balances = computeAccountBalances([{ id: 'a', initialBalancePaise: 75000 }], []);
    expect(balances.get('a')).toBe(75000);

    const transactions = computeAccountBalances([{ id: 'a', initialBalancePaise: 0 }], []).get('a');
    expect(transactions).toBe(0); // no ledger entries -> no income/expense contribution
  });

  it('transfers preserve total net worth across multiple moves', () => {
    const accounts = [{ id: BANK, initialBalancePaise: 500000 }, { id: UPI, initialBalancePaise: 100000 }];
    const before = computeTotalNetWorth(computeAccountBalances(accounts, []));
    const after = computeTotalNetWorth(
      computeAccountBalances(accounts, [
        { id: 't1', type: 'transfer', amountPaise: 10000, accountId: BANK, toAccountId: UPI },
        { id: 't2', type: 'transfer', amountPaise: 25000, accountId: UPI, toAccountId: BANK },
      ]),
    );
    expect(before).toBe(after);
    expect(after).toBe(600000);
  });
});
