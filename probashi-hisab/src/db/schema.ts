/**
 * SQLite schema. Money columns are INTEGER minor units; rates are INTEGER ×1e6.
 * Migrations are append-only: add a new entry, never edit an old one.
 * Full description: docs/DATABASE.md
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id     TEXT PRIMARY KEY NOT NULL,
    scope  TEXT NOT NULL CHECK (scope IN ('income','expense_abroad','expense_home','remittance')),
    grp    TEXT NOT NULL CHECK (grp IN ('personal','family','social','asset','income')),
    bn     TEXT NOT NULL,
    en     TEXT NOT NULL,
    icon   TEXT NOT NULL,
    sort   INTEGER NOT NULL DEFAULT 0,
    custom INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS debts (
    id            TEXT PRIMARY KEY NOT NULL,
    direction     TEXT NOT NULL CHECK (direction IN ('lent','borrowed')),
    person        TEXT NOT NULL,
    wallet        TEXT NOT NULL CHECK (wallet IN ('abroad','home')),
    currency      TEXT NOT NULL,
    due_date      TEXT,
    monthly_minor INTEGER NOT NULL DEFAULT 0,
    note          TEXT,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id            TEXT PRIMARY KEY NOT NULL,
    name          TEXT NOT NULL,
    icon          TEXT NOT NULL,
    currency      TEXT NOT NULL,
    target_minor  INTEGER NOT NULL CHECK (target_minor >= 0),
    opening_minor INTEGER NOT NULL DEFAULT 0,
    target_date   TEXT,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id             TEXT PRIMARY KEY NOT NULL,
    kind           TEXT NOT NULL CHECK (kind IN ('income','expense','remittance','debt_given',
                     'debt_collected','debt_taken','debt_repaid','goal_deposit','goal_withdraw')),
    wallet         TEXT NOT NULL CHECK (wallet IN ('abroad','home')),
    date           TEXT NOT NULL,
    amount_minor   INTEGER NOT NULL CHECK (amount_minor > 0),
    currency       TEXT NOT NULL,
    rate_micro     INTEGER NOT NULL CHECK (rate_micro > 0),
    bdt_minor      INTEGER NOT NULL,
    base_currency  TEXT NOT NULL,
    base_minor     INTEGER NOT NULL,
    fee_bdt_minor  INTEGER NOT NULL DEFAULT 0,
    fee_base_minor INTEGER NOT NULL DEFAULT 0,
    category_id    TEXT REFERENCES categories(id) ON DELETE SET NULL,
    person         TEXT,
    method         TEXT,
    reference      TEXT,
    note           TEXT,
    debt_id        TEXT REFERENCES debts(id) ON DELETE CASCADE,
    goal_id        TEXT REFERENCES goals(id) ON DELETE CASCADE,
    created_at     INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_debt ON transactions(debt_id);
  CREATE INDEX IF NOT EXISTS idx_tx_goal ON transactions(goal_id);

  CREATE TABLE IF NOT EXISTS budgets (
    category_id TEXT PRIMARY KEY NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_minor INTEGER NOT NULL CHECK (limit_minor >= 0),
    currency    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    currency   TEXT NOT NULL,
    date       TEXT NOT NULL,
    rate_micro INTEGER NOT NULL CHECK (rate_micro > 0),
    source     TEXT NOT NULL DEFAULT 'manual',
    PRIMARY KEY (currency, date)
  );
  `,
];
