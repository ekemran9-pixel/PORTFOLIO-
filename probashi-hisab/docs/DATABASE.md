# Database

SQLite, file `probashi-hisab.db`, created on the device. Schema and migrations: `src/db/schema.ts`
(`PRAGMA user_version` tracks the applied migration; migrations are append-only).
Money columns are `INTEGER` minor units; rates are `INTEGER` ×1,000,000; dates are `TEXT` `YYYY-MM-DD`.

```
settings(key PK, value JSON)

categories(id PK, scope, grp, bn, en, icon, sort, custom)
   scope ∈ income | expense_abroad | expense_home | remittance
   grp   ∈ personal | family | social | asset | income

debts(id PK, direction lent|borrowed, person, wallet abroad|home, currency,
      due_date?, monthly_minor, note?, created_at)

goals(id PK, name, icon, currency, target_minor, opening_minor, target_date?, created_at)

transactions(id PK, kind, wallet, date,
             amount_minor > 0, currency, rate_micro > 0,      -- as entered
             bdt_minor, base_currency, base_minor,            -- frozen conversions
             fee_bdt_minor, fee_base_minor,                   -- remittance fee
             category_id → categories  ON DELETE SET NULL,
             person?, method?, reference?, note?,
             debt_id → debts  ON DELETE CASCADE,
             goal_id → goals  ON DELETE CASCADE,
             created_at)
   kind ∈ income | expense | remittance | debt_given | debt_collected |
          debt_taken | debt_repaid | goal_deposit | goal_withdraw
   indexes: date, debt_id, goal_id

budgets(category_id PK → categories, limit_minor, currency)

exchange_rates(currency, date, rate_micro, source, PK(currency, date))   -- history of typed rates
```

Mapping to the entities in the brief: Profile/Countries/Currencies → `settings` + static tables in
`src/domain/money.ts`; Income/Expense/Remittance/Loan payments/Savings movements → `transactions.kind`;
Recipients/Family members → `transactions.person` (free text with suggestions; a people table is on the roadmap);
Recurring transactions and Notifications → not created yet (Phase 4).

`CHECK` constraints reject zero/negative amounts and unknown kinds at the database level
(test: *"refuses invalid rows at the database level"*).
