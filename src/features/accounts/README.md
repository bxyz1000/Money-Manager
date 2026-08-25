# src/features/accounts

Account management: bank / UPI / cash accounts, balances and archives.

Rules:
- Balances are derived from transaction legs — never stored as mutable
  counters in the client.
- All Supabase access goes through repository/service modules, not components.
