# src/features/transactions

Transaction capture and listing: income, expense and transfers.

Invariants (enforced by DB constraints and service code):
- Amounts are positive integers in paise (`utils/money.ts` is the only
  money chokepoint).
- A transfer is ONE row carrying both legs (`accountId` source,
  `toAccountId` destination). Transfers never count as expenses and never
  change total net worth.
