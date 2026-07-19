# E6 — Shared Household Finance / Expenses (implementation plan)

Status: **planned** (not built). This is a new data domain that touches storage,
the native contract, and UI on both surfaces, and it handles money — so it gets a
written plan before code.

## Goal
Let household members track shared expenses ("who paid / who owes"), settle up,
and watch per-category monthly budgets. Tie into the projects module (which
already tracks estimated vs actual cost).

## Data model (`src/lib/types.ts`)
```ts
export interface Expense {
  id: string
  householdId: string
  description: string
  amount: number            // stored in cents to avoid float drift
  currency?: string         // default 'USD'
  category: string          // reuse a small enum: Groceries, Utilities, Rent, …
  paidBy: string            // member display name (or userId)
  splitBetween: string[]    // members sharing the cost; [] = whole household
  date: string              // 'YYYY-MM-DD'
  createdAt: number
  note?: string
  settled?: boolean
}

export interface Budget {
  id: string
  householdId: string
  category: string
  monthlyLimit: number      // cents
  createdAt: number
}
```

## Money handling rules (do not skip)
- **Store integer cents**, never floats. Parse user input with a dedicated
  `parseMoney(str): number|null` (reject NaN, negative, > 1e9).
- Format for display with `Intl.NumberFormat`, never string concatenation.
- Settlement math is integer-only; the last cent of an uneven split goes to the
  payer (documented, deterministic) so balances always sum to zero.

## Settlement algorithm (pure, unit-tested)
`computeBalances(expenses, members): Map<member, netCents>` — for each expense,
credit `paidBy` the full amount and debit each member in `splitBetween` their
share (`amount / n`, remainder to payer). Then `suggestSettlements(balances)`
greedily matches the largest creditor with the largest debtor until all net to
zero. Put both in `src/lib/finance.ts` with a Vitest suite covering: even split,
uneven split remainder, multi-payer, already-settled exclusion, single member.

## Storage
- Standalone: two new `useKV` collections, `expenses` and `budgets`
  (household-scoped). `/api/data` already accepts new keys; add Zod validators in
  `server/validation.js` (`buildHouseholdDataValidators`) so bad money can't be
  written (`amount: z.number().int().nonnegative()`).
- CM parity: add `expenses` + `budgets` to `NATIVE_HOUSEHOLD_KEYS` (server.js)
  and to `HouseholdData` + the dashboard reduce in the CM client, then a
  `FinanceSection`.

## UI
- New "Money" tab (behind an `enabled-tabs` flag so households can hide it):
  - Add-expense form (amount, category, paid-by, split, date, note).
  - List grouped by month with a running total.
  - **Balances panel**: "Alex owes Sam $12.50", with a "Settle up" action that
    marks the relevant expenses settled.
  - **Budgets**: per-category monthly limit with a progress bar that turns amber
    ≥80% and red ≥100% (reuse the leaderboard bar pattern).
- Dashboard: a compact "This month" spend tile + any over-budget warning; feed
  the Today-at-a-glance card when a budget is exceeded.

## Cross-surface + rollout
- Ship standalone first (fastest feedback), then CM parity via the contract keys.
- Respect the whole-collection last-write-wins caveat: expenses are append-heavy,
  so this is where item-level endpoints (see the review's architectural note)
  would most reduce clobber risk — worth doing alongside E6.

## Estimated effort
~2–3 focused days: 0.5d model + finance.ts + tests, 1d standalone UI, 0.5d
validators/contract, 0.5–1d CM parity + polish.
