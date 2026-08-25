# src/features/accounts

Account management: bank / UPI / cash accounts, balances and archives.

Rules:
- Balances are derived from the opening balance plus transaction legs —
  never stored as mutable counters in the client or the database.
- Opening balance (`initial_balance_paise`) lives on the account row; it is
  never recorded as an income transaction.
- All Supabase access goes through repository/service modules, not components.
