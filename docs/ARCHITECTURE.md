# Architecture

## Money representation — DECIDED

All monetary values are **integers in minor units (paise)** end-to-end:
TypeScript `number` (safe integers only), SQLite `INTEGER` (future cache),
PostgreSQL `BIGINT`.

Why not floats: IEEE-754 drift makes sums unreliable for financial data.
Why not PostgreSQL NUMERIC: SQLite has no exact decimal type, and NUMERIC
would force conversions at every client boundary. BIGINT paise keeps one
exact representation across all three layers.

`src/utils/money.ts` is the single money chokepoint. User input is parsed
from strings; rounding is never implicit; `paiseToDecimalRupees()` output is
display-only.

## Balances — DECIDED

Balances are always derived, never stored:

```
balance = initial_balance_paise        -- opening balance on the ACCOUNT,
          + income                     -- never an income transaction
          - expenses
          - outgoing transfers
          + incoming transfers
```

The opening balance is an attribute of the account row (`accounts.initial_
balance_paise`), so it cannot leak into income/expense reporting. The SQL
definition lives in the `account_balances` view; the TypeScript mirror used
by clients/tests lives in `src/features/accounts/balance.ts` — keep them in
sync.

## Transfer model — DECIDED

A transfer is a **single atomic row** in `transactions`:

- `account_id` = source leg (money leaves)
- `to_account_id` = destination leg (money arrives)

CHECK constraints make invalid states unrepresentable: transfers must carry
two distinct accounts; income/expense must carry exactly one. Balances are
never stored as mutable counters — they are derived from the ledger
(`account_balances` view), so they cannot be corrupted by partial writes.
Transfers never enter income/expense totals; net worth is invariant under
transfers by construction.

## Data ownership

PostgreSQL (Supabase) is authoritative. SQLite will be an offline cache +
write queue only — never a second source of truth.

## Layers

```
UI (src/app, features/*/screens)  →  no Supabase/SQLite imports
stores/hooks                      →  state only
services                          →  auth, sync, external APIs
database                          →  SQLite repositories (future)
config                            →  env validation, constants
types                             →  domain model mirroring SQL schema
utils                             →  money, dates, validation
```

## Security

- Only `EXPO_PUBLIC_*` client-safe env vars; anon key ships in bundle.
- Service-role key never exists in this repository or app.
- All tenant isolation via RLS (`auth.uid() = user_id`, forced).
- Tokens persist in SecureStore (Keychain/Keystore), never AsyncStorage.
- No logging of credentials, tokens, keys, or financial payloads.
