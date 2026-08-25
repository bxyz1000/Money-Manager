-- ============================================================================
-- Migration 0001: initial schema for Money Manager
--
-- MONEY REPRESENTATION (approved decision):
--   All monetary values are BIGINT integers in minor units (paise).
--   No floating-point arithmetic anywhere in the stack. Amounts are always
--   positive; direction comes from transaction type + account legs.
--
-- TRANSFER MODEL (designed to prevent transfers becoming expenses or
-- corrupting balances):
--   A transfer is a SINGLE transactions row carrying both legs:
--     - account_id    = source account      (money leaves)
--     - to_account_id = destination account (money arrives)
--   One atomic row makes it impossible for legs to diverge. CHECK
--   constraints enforce:
--     - transfer rows MUST have a destination account different from source
--     - income/expense rows MUST NOT have a destination account
--   Account balances are NEVER stored as mutable counters; they are derived
--   from the ledger via the public.account_balances view, so no sequence of
--   writes can "corrupt" a balance — worst case the derived sum is stale,
--   never wrong.
--   Transfers are excluded from expense aggregation by construction: any
--   expense total is SUM(amount_paise) WHERE type = 'expense'.
--
-- OPENING BALANCE:
--   Accounts carry initial_balance_paise (BIGINT >= 0) for money already
--   present when the user sets up the app. It is an attribute of the
--   ACCOUNT, not a transaction: it never appears as monthly income, never
--   appears as an expense, and simply seeds the derived balance:
--     balance = initial_balance + income - expenses
--               - outgoing transfers + incoming transfers
--
-- MULTI-TENANCY / SECURITY:
--   Row Level Security is ENABLED AND FORCED on every user-owned table.
--   Every policy is exactly: auth.uid() = user_id. The anon/authenticated
--   roles can only ever touch their own rows. Child tables reference parents
--   through composite foreign keys that include user_id, so even a forged
--   cross-tenant reference is rejected at the FK level.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users (mirrors auth.users; populated by trigger on signup)
-- ---------------------------------------------------------------------------

create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text check (char_length(display_name) <= 80),
  currency_code text not null default 'INR' check (currency_code = 'INR'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger trg_users_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- accounts  (V1 types: bank | upi | cash)
-- ---------------------------------------------------------------------------

create table public.accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  name          text not null check (length(btrim(name)) between 1 and 80),
  type          text not null check (type in ('bank', 'upi', 'cash')),
  currency_code text not null default 'INR' check (currency_code = 'INR'),

  -- Opening balance (money already in the account at setup). Stored on the
  -- account itself — deliberately NOT an income transaction, so it never
  -- pollutes income/expense reporting.
  initial_balance_paise bigint not null default 0 check (initial_balance_paise >= 0),

  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Composite unique keys let child tables reference (user_id, id) so a row
  -- can never point at another tenant's account.
  unique (user_id, name),
  unique (id, user_id)
);

create trigger trg_accounts_updated_at
before update on public.accounts
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 60),
  color       text check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon        text check (char_length(icon) <= 40),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, name),
  unique (id, user_id)
);

create trigger trg_categories_updated_at
before update on public.categories
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions  (income | expense | transfer) — see header for transfer model
-- ---------------------------------------------------------------------------

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  type          text not null check (type in ('income', 'expense', 'transfer')),

  -- Always positive paise. Direction comes from type + account legs.
  amount_paise  bigint not null check (amount_paise > 0),

  account_id    uuid not null,
  to_account_id uuid,

  category_id   uuid,

  occurred_at   timestamptz not null default now(),
  note          text check (char_length(note) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Composite FKs: children may only reference accounts/categories owned by
  -- the same user. Cross-tenant references are impossible by construction.
  foreign key (user_id, account_id) references public.accounts (user_id, id),
  foreign key (user_id, to_account_id) references public.accounts (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id),

  constraint transactions_transfer_legs check (
    (
      type = 'transfer'
      and to_account_id is not null
      and to_account_id <> account_id
    )
    or
    (
      type <> 'transfer'
      and to_account_id is null
    )
  )
);

create index idx_transactions_user_occurred
  on public.transactions (user_id, occurred_at desc);
create index idx_transactions_user_account_occurred
  on public.transactions (user_id, account_id, occurred_at desc);
create index idx_transactions_to_account
  on public.transactions (to_account_id);

create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Derived balances (never stored, therefore never corruptible)
-- ---------------------------------------------------------------------------
-- security_invoker = true makes RLS of the underlying tables apply to
-- whoever queries this view.

create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  -- Opening balance is an account attribute; ledger deltas are added on top.
  a.initial_balance_paise
  + coalesce(sum(
    case
      when t.type = 'income'   and t.account_id = a.id then  t.amount_paise
      when t.type = 'expense'  and t.account_id = a.id then -t.amount_paise
      when t.type = 'transfer' and t.account_id = a.id then -t.amount_paise
      when t.type = 'transfer' and t.to_account_id = a.id then t.amount_paise
      else 0
    end
  ), 0) as balance_paise
from public.accounts a
left join public.transactions t
  on t.user_id = a.user_id
 and (t.account_id = a.id or t.to_account_id = a.id)
group by a.id, a.user_id;

-- Net-worth invariant: SUM(balance_paise) over all accounts equals total net
-- worth; transfer legs cancel out pairwise within that sum.

-- ---------------------------------------------------------------------------
-- recurring_payments
-- ---------------------------------------------------------------------------

create table public.recurring_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  name          text not null check (length(btrim(name)) between 1 and 80),
  amount_paise  bigint not null check (amount_paise > 0),
  frequency     text not null check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date date not null,
  account_id    uuid not null,
  category_id   uuid,
  auto_debit    boolean not null default false,
  is_active     boolean not null default true,
  end_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (id, user_id),
  foreign key (user_id, account_id) references public.accounts (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id),
  constraint recurring_end_after_start check (
    end_date is null or end_date >= next_due_date
  )
);

create index idx_recurring_user_next_due
  on public.recurring_payments (user_id, next_due_date);

create trigger trg_recurring_updated_at
before update on public.recurring_payments
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- savings_goals
-- ---------------------------------------------------------------------------

create table public.savings_goals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  name                text not null check (length(btrim(name)) between 1 and 80),
  target_amount_paise bigint not null check (target_amount_paise > 0),
  saved_amount_paise  bigint not null default 0 check (saved_amount_paise >= 0),
  target_date         date,
  status              text not null default 'active'
                      check (status in ('active', 'achieved', 'archived')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, name)
);

create trigger trg_savings_goals_updated_at
before update on public.savings_goals
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- monthly_summaries
-- ---------------------------------------------------------------------------

create table public.monthly_summaries (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.users (id) on delete cascade,
  period_start            date not null,
  total_income_paise      bigint not null default 0 check (total_income_paise >= 0),
  total_expense_paise     bigint not null default 0 check (total_expense_paise >= 0),
  total_transferred_paise bigint not null default 0 check (total_transferred_paise >= 0),
  net_savings_paise       bigint not null default 0,
  computed_at             timestamptz not null default now(),

  unique (user_id, period_start),

  -- period_start must be the first day of its month
  constraint monthly_period_is_month_start
    check (period_start = date_trunc('month', period_start)::date),

  -- Transfers are tracked separately and never enter income/expense totals.
  -- net = income - expense, enforced at the row level.
  constraint monthly_net_consistency
    check (net_savings_paise = total_income_paise - total_expense_paise)
);

-- ---------------------------------------------------------------------------
-- ai_insights  (Gemini output lands here in a later phase)
-- ---------------------------------------------------------------------------

create table public.ai_insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  kind         text not null check (kind in ('summary', 'tip', 'anomaly')),
  period_start date,
  content      text not null check (char_length(content) between 1 and 10000),
  model        text check (char_length(model) <= 60),
  created_at   timestamptz not null default now()
);

create index idx_ai_insights_user_created
  on public.ai_insights (user_id, created_at desc);

-- ===========================================================================
-- ROW LEVEL SECURITY — every user-owned table, enabled AND forced.
-- Policy shape is identical everywhere: auth.uid() = user_id.
-- ===========================================================================

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'users',
    'accounts',
    'categories',
    'transactions',
    'recurring_payments',
    'savings_goals',
    'monthly_summaries',
    'ai_insights'
  ]
  loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('alter table public.%I force row level security;', tbl);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      tbl || '_owner_all',
      tbl
    );
  end loop;
end;
$$;

comment on table public.transactions is
  'Ledger of income/expense/transfer. Transfers carry both legs in one atomic row (account_id = source, to_account_id = destination); they are never expenses and preserve total net worth.';

comment on view public.account_balances is
  'Derived per-account balances in paise: initial_balance_paise plus signed ledger deltas (income up, expenses down, transfers out/in). Never persisted; recomputed from the ledger so they cannot be corrupted by partial writes.';


