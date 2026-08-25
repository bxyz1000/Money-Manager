import { AccountServiceError, accountService } from '../account.service';

/**
 * Account service tests — Supabase is mocked at the client boundary
 * (jest.mock of '@/services/supabase.client'). No network, no real DB.
 */

type PostgrestResult = { data: unknown; error: { code?: string; message?: string } | null };

function makeBuilder(result: PostgrestResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'single']) {
    builder[method] = jest.fn(() => builder);
  }
  // Awaitable terminal: supabase-js query builders are thenable.
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

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'HDFC Savings',
    type: 'bank',
    currency_code: 'INR',
    initial_balance_paise: 100000,
    is_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockBuilders)) delete mockBuilders[key];
});

describe('accountService.listActiveAccounts', () => {
  it('joins account rows with authoritative balances from the view', async () => {
    mockBuilders['accounts'] = makeBuilder({
      data: [
        row({ id: 'a1' }),
        row({ id: 'a2', name: 'Google Pay', type: 'upi', initial_balance_paise: 0 }),
      ],
      error: null,
    });
    mockBuilders['account_balances'] = makeBuilder({
      data: [
        { account_id: 'a1', balance_paise: '130000' },
        { account_id: 'a2', balance_paise: 350000 },
      ],
      error: null,
    });

    const accounts = await accountService.listActiveAccounts();

    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toMatchObject({
      id: 'a1',
      name: 'HDFC Savings',
      type: 'bank',
      initialBalancePaise: 100000,
      balancePaise: 130000,
    });
    expect(accounts[1]).toMatchObject({ id: 'a2', type: 'upi', balancePaise: 350000 });
  });

  it('treats a missing view row as zero balance rather than crashing', async () => {
    mockBuilders['accounts'] = makeBuilder({ data: [row({ id: 'a1' })], error: null });
    mockBuilders['account_balances'] = makeBuilder({ data: [], error: null });

    const accounts = await accountService.listActiveAccounts();
    expect(accounts[0]?.balancePaise).toBe(0);
  });

  it('maps a Supabase failure to an AccountServiceError with safe message', async () => {
    mockBuilders['accounts'] = makeBuilder({ data: null, error: { message: 'db exploded' } });
    mockBuilders['account_balances'] = makeBuilder({ data: [], error: null });

    await expect(accountService.listActiveAccounts()).rejects.toMatchObject({
      name: 'AccountServiceError',
      code: 'unknown',
      userMessage: 'Something went wrong. Please try again.',
    });
  });
});

describe('accountService.createAccount', () => {
  it('inserts snake_case payload and maps the returned row', async () => {
    const builder = makeBuilder({
      data: row({ initial_balance_paise: 125050 }),
      error: null,
    });
    mockBuilders['accounts'] = builder;

    const created = await accountService.createAccount({
      name: 'HDFC Savings',
      type: 'bank',
      initialBalancePaise: 125050,
    });

    expect(created).toMatchObject({
      id: 'acc-1',
      name: 'HDFC Savings',
      initialBalancePaise: 125050,
    });
    expect(builder['insert']).toHaveBeenCalledWith({
      name: 'HDFC Savings',
      type: 'bank',
      initial_balance_paise: 125050,
    });
  });

  it('rejects invalid input before touching Supabase', async () => {
    mockBuilders['accounts'] = makeBuilder({ data: null, error: null });

    await expect(
      accountService.createAccount({ name: '', type: 'bank', initialBalancePaise: 0 }),
    ).rejects.toBeInstanceOf(AccountServiceError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('maps unique-violation (23505) to duplicate_name with friendly message', async () => {
    mockBuilders['accounts'] = makeBuilder({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    await expect(
      accountService.createAccount({ name: 'HDFC Savings', type: 'bank', initialBalancePaise: 0 }),
    ).rejects.toMatchObject({ code: 'duplicate_name', userMessage: /already have an account/ });
  });
});

describe('accountService.updateAccount', () => {
  it('sends only provided fields and never initial_balance_paise', async () => {
    const builder = makeBuilder({ data: row({ name: 'Renamed' }), error: null });
    mockBuilders['accounts'] = builder;

    await accountService.updateAccount('acc-1', { name: 'Renamed' });

    expect(builder['update']).toHaveBeenCalledWith({ name: 'Renamed' });
    const updateCalls = JSON.stringify((builder['update'] as jest.Mock).mock.calls);
    expect(updateCalls).not.toContain('initial_balance');
  });

  it('refuses an empty patch without any query', async () => {
    await expect(accountService.updateAccount('acc-1', {})).rejects.toMatchObject({
      code: 'validation',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('accountService.archiveAccount', () => {
  it('performs a soft update setting is_archived=true (never delete)', async () => {
    const builder = makeBuilder({ data: row({ is_archived: true }), error: null });
    mockBuilders['accounts'] = builder;

    await accountService.archiveAccount('acc-1');

    expect(builder['update']).toHaveBeenCalledWith({ is_archived: true });
  });
});

describe('error mapping', () => {
  it('maps network TypeErrors to the network code', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockBuilders['accounts'] = builder;
    mockBuilders['account_balances'] = makeBuilder({ data: [], error: null });
    // Simulate a fetch-level rejection while awaiting the query. The thenable
    // contract requires invoking the passed callbacks (like postgrest-js does).
    builder.then = (
      onFulfilled: (value: PostgrestResult) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) =>
      Promise.reject(new TypeError('Network request failed')).then(onFulfilled, onRejected);

    await expect(accountService.listActiveAccounts()).rejects.toMatchObject({
      code: 'network',
      userMessage: /Network problem/,
    });
  });

  it('maps JWT failures to unauthorized with sign-in guidance', async () => {
    mockBuilders['accounts'] = makeBuilder({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired' },
    });
    mockBuilders['account_balances'] = makeBuilder({ data: [], error: null });

    await expect(accountService.listActiveAccounts()).rejects.toMatchObject({
      code: 'unauthorized',
      userMessage: /session has expired/,
    });
  });
});

