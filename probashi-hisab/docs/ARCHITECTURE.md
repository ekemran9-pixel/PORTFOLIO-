# Architecture

## Stack (verified versions, November 2026)

| Concern | Choice | Why |
|---|---|---|
| App | Expo SDK 58, React Native 0.88, React 19, TypeScript 6 (strict) | One codebase for Android now, iOS and web later |
| Navigation | Expo Router (file-based, `src/app`) | Tabs + stack with typed routes |
| Storage | `expo-sqlite` (SQLite; WebAssembly build on web) | Offline-first, relational, transactional |
| State | Zustand | Tiny; one store mirrors the database |
| Validation | Zod (`txInputSchema`) | Shape checks before money parsing |
| Charts | Hand-written on `react-native-svg` | Three small chart types; no heavy chart dependency on budget phones |
| Font | Hind Siliguri (bundled) | Consistent Bengali rendering on every device |
| Tests | Jest (`jest-expo`) + `node:sqlite`, Playwright for the web build | Real SQL in unit tests, real UI in e2e |

Dependencies deliberately **not** added yet: secure storage, biometrics, notifications, file system, any network client.
They arrive with the features that need them (see ROADMAP).

## Layers

```
src/app/      screens (Expo Router). No SQL, no money arithmetic.
src/ui/       design system: theme, components, charts, platform helpers
src/i18n/     bn.ts (source of truth for keys) + en.ts, formatting hook useT()
src/store/    useApp – Zustand store; the only caller of the repository
src/db/       schema + migrations, SqlDriver interface, Repo (all SQL lives here)
src/domain/   pure TypeScript: money, counting rules, summaries, health score,
              projections, insights, CSV. No React, no I/O. Fully unit-tested.
```

Data flow: screen → `useApp` action → `buildTx` (validate + freeze values) → `Repo` (SQLite) → reload →
pure selectors in `domain/summary.ts` → screen. The dataset of one person is small, so the store keeps all rows in
memory and every figure is recomputed from them; there are no cached totals that could drift.

`SqlDriver` (`exec` / `run` / `all`) is the seam for the future: a cloud-sync driver or an encrypted driver can be
added without touching screens or domain code.

## Money

- Amounts are integers in minor units (`420000` = 4,200.00 SAR; KWD/OMR/BHD use 3 decimals).
- Rates are integers ×1,000,000 and always mean *BDT per 1 unit of the currency*.
- Conversion runs on `BigInt` and rounds half-up. No `number` multiplication is used for stored values.
- A transaction stores: original amount + currency, its rate, the BDT value, and the value in the earning currency
  at that time. These four never change afterwards.
- BDT is the reporting currency. The dashboard can also show the earning currency; that view uses the frozen
  earning-currency values, and falls back to BDT ÷ latest rate only for rows recorded under a different earning currency.
- Rates are typed by the user. The app makes no network requests. The date of the last rate is shown in Profile.

## Counting rules (no double counting)

| Kind | Income? | Spending? | Cash abroad | Home account |
|---|---|---|---|---|
| `income` (abroad) | yes | – | + | |
| `expense` (abroad) | – | yes | − | |
| `remittance` | – | fee only¹ | − (amount + fee) | + |
| `expense` (home) | – | yes² | | − |
| `income` (home) | yes² | – | | + |
| `debt_given` / `debt_collected` | – | – | −/+ | −/+ (if lent at home) |
| `debt_taken` / `debt_repaid` | – | – | +/− | +/− |
| `goal_deposit` / `goal_withdraw` | – | – | −/+ | |

¹ In **simple mode** (`trackHome = false`) a remittance with a family-type purpose is counted as spending when sent;
purposes of type *asset* (house, land, savings, investment) are not.
² Only in **home-account mode** (`trackHome = true`). Home expenses in *asset* categories are not consumption.

`net savings = income − (expenses abroad + transfer fees + home consumption)` and
`savings rate = net savings ÷ income`. Implemented in `summarize()`; the rules above are each covered by a test.

## Health score (0–100)

Transparent and shown to the user: savings rate 40, debt burden 20, spending within income 15, cushion 15,
budgets kept 10. Exact thresholds are in `src/domain/insights.ts` and on the dashboard ("কীভাবে হিসাব হয়").
No score is shown without income for the month.

## Decisions

1. **One `transactions` table with a `kind` column** instead of separate income/expense/remittance tables: one ledger,
   one sum for balances, and the counting rule is a single `switch`.
2. **Two tracking modes** rather than forcing family-expense entry on everyone: the owner's sheet tracks home spending,
   many users will not.
3. **Bengali dictionary is the type source** (`Dict = keyof typeof bn`): a missing English key is a compile error.
4. **No interest calculation on debts** in v0.1 — stating it plainly is better than a wrong figure.
5. **CSV export through the system share sheet** on phones: needs no storage permission.
6. **Project lives in `probashi-hisab/` of the existing repository.** This session can only write to
   `ekemran9-pixel/PORTFOLIO-`; a dedicated `probashi-hisab` repository needs the owner to create it (see README).
