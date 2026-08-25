import { TransactionServiceError, transactionService } from '../transaction.service';

/**
 * Transaction service tests — Supabase mocked at the client boundary.
 * No network, no real DB. The query-builder mock reproduces supabase-js's
 * thenable chain semantics faithfully (callbacks must be invoked).
 */

type PostgrestResult = { data: unknown; error: { code?: string; message?: string } | null };

function makeBuilder(result: PostgrestResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'gte', 'lt', 'insert', 'update', 'delete', 'single']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (
    onFulfilled: (value: PostgrestResult) => unknown,
    onRejected: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

const mockBuilders: Record<string, ReturnType<typeof makeBuilder>> = {};

const mockFrom = jest.fn((table: string) => {
  if (!mockBuilders[table]) {
    throw new Error(`Unexpected table in test: ${table}`);
  }
  return mockBuilders[table];
});

jest.mock('@/services/supabase.client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

function txnRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'txn-1',
    user_id: 'user-1',
    type: 'expense',
    amount_paise: 20000,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-1',
    occurred_at: '2026-01-15T10:00:00.000Z',
    note: 'Lunch',
    created_at: '2026-01-15T10:05:00.000Z',
    updated_at: '2026-01-15T10:05:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockBuilders)) delete mockBuilders[key];
});

const validExpense = {
  type: 'expense' as const,
  amountPaise: 20000,
  accountId: 'acc-1',
  occurredAt: '2026-01-15T10:00:00.000Z',
};

describe('createTransaction', () => {
  it('creates an income with snake_case payload (no to_account_id)', async () => {
    const builder = makeBuilder({
      data: txnRow({ type: 'income', amount_paise: 500000 }),
      error: null,
    });
    mockBuilders['transactions'] = builder;

    await transactionService.createTransaction({
      type: 'income',
      amountPaise: 500000,
      accountId: 'acc-1',
      occurredAt: '2026-01-15T10:00:00.000Z',
    });

    const inserted = (builder['insert'] as jest.Mock).mock.calls[0][0];
    expect(inserted).toEqual({
      type: 'income',
      amount_paise: 500000,
      account_id: 'acc-1',
      to_account_id: null,
      category_id: null,
      note: null,
      occurred_at: '2026-01-15T10:00:00.000Z',
    });
  });

  it('creates an expense', async () => {
    const builder = makeBuilder({ data: txnRow(), error: null });
    mockBuilders['transactions'] = builder;

    const created = await transactionService.createTransaction(validExpense);
    expect(created).toMatchObject({ id: 'txn-1', type: 'expense', amountPaise: 20000 });
  });

  it('creates a transfer with both legs in ONE atomic row', async () => {
    const builder = makeBuilder({
      data: txnRow({ type: 'transfer', account_id: 'acc-1', to_account_id: 'acc-2' }),
      error: null,
    });
    mockBuilders['transactions'] = builder;

    await transactionService.createTransaction({
      type: 'transfer',
      amountPaise: 50000,
      accountId: 'acc-1',
      toAccountId: 'acc-2',
      occurredAt: '2026-01-15T10:00:00.000Z',
    });

    // Exactly one insert carrying both legs — atomicity by construction.
    expect(builder['insert']).toHaveBeenCalledTimes(1);
    expect((builder['insert'] as jest.Mock).mock.calls[0][0]).toMatchObject({
      type: 'transfer',
      account_id: 'acc-1',
      to_account_id: 'acc-2',
    });
  });

  it('rejects invalid input before touching Supabase', async () => {
    mockBuilders['transactions'] = makeBuilder({ data: null, error: null });

    await expect(
      transactionService.createTransaction({ ...validExpense, amountPaise: 0 }),
    ).rejects.toBeInstanceOf(TransactionServiceError);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('updateTransaction / deleteTransaction', () => {
  it('sends a full validated payload on update', async () => {
    const builder = makeBuilder({ data: txnRow({ type: 'income' }), error: null });
    mockBuilders['transactions'] = builder;

    await transactionService.updateTransaction('txn-1', {
      type: 'income',
      amountPaise: 30000,
      accountId: 'acc-2',
      occurredAt: '2026-01-16T09:00:00.000Z',
    });

    const updated = (builder['update'] as jest.Mock).mock.calls[0][0];
    expect(updated).toMatchObject({
      type: 'income',
      amount_paise: 30000,
      account_id: 'acc-2',
      to_account_id: null,
    });
  });

  it('maps a .single() miss on update to not_found', async () => {
    mockBuilders['transactions'] = makeBuilder({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested' },
    });

    await expect(transactionService.updateTransaction('gone', validExpense)).rejects.toMatchObject(
      { code: 'not_found' },
    );
  });

  it('performs delete and maps a miss to not_found', async () => {
    mockBuilders['transactions'] = makeBuilder({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested' },
    });

    await expect(transactionService.deleteTransaction('gone')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('listTransactions', () => {
  it('enriches rows with account/category display names', async () => {
    mockBuilders['transactions'] = makeBuilder({
      data: [
        txnRow(),
        txnRow({
          id: 'txn-2',
          type: 'transfer',
          account_id: 'acc-1',
          to_account_id: 'acc-archived',
          category_id: null,
        }),
      ],
      error: null,
    });
    mockBuilders['accounts'] = makeBuilder({
      data: [
        { id: 'acc-1', name: 'HDFC' },
        { id: 'acc-archived', name: 'Old Bank' }, // archived accounts still resolve
      ],
      error: null,
    });
    mockBuilders['categories'] = makeBuilder({
      data: [{ id: 'cat-1', name: 'Food' }],
      error: null,
    });

    const items = await transactionService.listTransactions();

    expect(items[0]).toMatchObject({
      accountName: 'HDFC',
      categoryName: 'Food',
      note: 'Lunch',
    });
    expect(items[1]).toMatchObject({
      accountName: 'HDFC',
      toAccountName: 'Old Bank',
      categoryName: null,
    });
  });

  it('falls back to placeholder names when lookups miss', async () => {
    mockBuilders['transactions'] = makeBuilder({ data: [txnRow()], error: null });
    mockBuilders['accounts'] = makeBuilder({ data: [], error: null });
    mockBuilders['categories'] = makeBuilder({ data: [], error: null });

    const items = await transactionService.listTransactions();
    expect(items[0]?.accountName).toBe('Unknown account');
  });
});

describe('getMonthlyTotals', () => {
  it('aggregates income/expense and excludes transfers', async () => {
    mockBuilders['transactions'] = makeBuilder({
      data: [
        { type: 'income', amount_paise: 5000000 },
        { type: 'expense', amount_paise: 3000000 },
        { type: 'transfer', amount_paise: 1000000 },
        { type: 'expense', amount_paise: 100000 },
      ],
      error: null,
    });

    const totals = await transactionService.getMonthlyTotals('2026-01-01');
    expect(totals).toEqual({
      incomePaise: 5000000,
      expensePaise: 3100000,
      netPaise: 1900000,
    });
  });
});

describe('error mapping', () => {
  it('maps network TypeErrors', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockBuilders['transactions'] = builder;
    mockBuilders['accounts'] = makeBuilder({ data: [], error: null });
    mockBuilders['categories'] = makeBuilder({ data: [], error: null });
    builder.then = (
      onFulfilled: (value: PostgrestResult) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) => Promise.reject(new TypeError('Network request failed')).then(onFulfilled, onRejected);

    await expect(transactionService.listTransactions()).rejects.toMatchObject({
      code: 'network',
      userMessage: /Network problem/,
    });
  });

  it('maps JWT failures to unauthorized', async () => {
    mockBuilders['transactions'] = makeBuilder({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired' },
    });
    mockBuilders['accounts'] = makeBuilder({ data: [], error: null });
    mockBuilders['categories'] = makeBuilder({ data: [], error: null });

    await expect(transactionService.listTransactions()).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('maps get misses to not_found', async () => {
    mockBuilders['transactions'] = makeBuilder({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested' },
    });

    await expect(transactionService.getTransaction('gone')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});



