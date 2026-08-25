import { computeMonthlyTotals, monthRangeUtc, currentMonthStart } from '../monthly';
import { computeAccountBalances, computeTotalNetWorth } from '@/features/accounts/balance';

/**
 * Phase 4 financial-behavior scenarios. All values are exact integer paise.
 * Balance math uses the established pure mirror (features/accounts/balance.ts)
 * — the same algorithm as the authoritative account_balances SQL view.
 */

const BANK = 'bank-1';
const UPI = 'upi-1';

describe('monthly aggregation', () => {
  it('spec example: income 50k, expense 30k, transfer 10k → income 50k, expense 30k, net 20k', () => {
    const totals = computeMonthlyTotals([
      { type: 'income', amountPaise: 5000000 },
      { type: 'expense', amountPaise: 3000000 },
      { type: 'transfer', amountPaise: 1000000 },
    ]);
    expect(totals).toEqual({
      incomePaise: 5000000,
      expensePaise: 3000000,
      netPaise: 2000000,
    });
  });

  it('transfers alone produce zero income and zero expense', () => {
    const totals = computeMonthlyTotals([
      { type: 'transfer', amountPaise: 999999 },
      { type: 'transfer', amountPaise: 1 },
    ]);
    expect(totals.incomePaise).toBe(0);
    expect(totals.expensePaise).toBe(0);
    expect(totals.netPaise).toBe(0);
  });

  it('monthRangeUtc produces a half-open UTC month window', () => {
    const { startIso, endIso } = monthRangeUtc('2026-01-01');
    expect(startIso).toBe('2026-01-01T00:00:00.000Z');
    expect(endIso).toBe('2026-02-01T00:00:00.000Z');
    expect(new Date(endIso).getTime() - new Date(startIso).getTime()).toBe(31 * 86400000);
  });

  it('currentMonthStart returns a first-of-month YYYY-MM-DD string', () => {
    expect(currentMonthStart()).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('financial behavior — spec scenarios', () => {
  it('Test 3: opening 10,000 + income 5,000 − expense 2,000, transfer 1,000 → total 13,000; income 5,000; expense 2,000; transfer contributes 0 to both', () => {
    const ledger = [
      { id: 'i1', type: 'income' as const, amountPaise: 500000, accountId: BANK, toAccountId: null },
      { id: 'e1', type: 'expense' as const, amountPaise: 200000, accountId: BANK, toAccountId: null },
    ];

    // Two-account variant so the transfer has somewhere to go:
    const twoAccounts = [
      { id: BANK, initialBalancePaise: 1000000 },
      { id: UPI, initialBalancePaise: 0 },
    ];
    const withTransfer = [
      ...ledger,
      { id: 't1', type: 'transfer' as const, amountPaise: 100000, accountId: BANK, toAccountId: UPI },
    ];

    const balances = computeAccountBalances(twoAccounts, withTransfer);
    // Bank: 10,000 + 5,000 − 2,000 − 1,000 = 12,000; UPI: 0 + 1,000 = 1,000
    expect(balances.get(BANK)).toBe(1200000);
    expect(balances.get(UPI)).toBe(100000);
    expect(computeTotalNetWorth(balances)).toBe(1300000); // ₹13,000

    const totals = computeMonthlyTotals(withTransfer);
    expect(totals.incomePaise).toBe(500000); // ₹5,000 — transfer contributes nothing
    expect(totals.expensePaise).toBe(200000); // ₹2,000
    expect(totals.netPaise).toBe(300000);
  });

  it('Test 4: opening balance is neither income nor expense (zero-ledger account keeps full opening amount)', () => {
    const balances = computeAccountBalances([{ id: 'a', initialBalancePaise: 75000 }], []);
    expect(balances.get('a')).toBe(75000);

    // With an empty ledger there are no income/expense rows at all:
    const totals = computeMonthlyTotals([]);
    expect(totals.incomePaise).toBe(0);
    expect(totals.expensePaise).toBe(0);
  });

  it('Test 5: transfers never change total net worth', () => {
    const accounts = [
      { id: BANK, initialBalancePaise: 500000 },
      { id: UPI, initialBalancePaise: 100000 },
    ];
    const before = computeTotalNetWorth(computeAccountBalances(accounts, []));
    const after = computeTotalNetWorth(
      computeAccountBalances(accounts, [
        { id: 't1', type: 'transfer', amountPaise: 12345, accountId: BANK, toAccountId: UPI },
        { id: 't2', type: 'transfer', amountPaise: 54321, accountId: UPI, toAccountId: BANK },
      ]),
    );
    expect(before).toBe(after);
  });
});
