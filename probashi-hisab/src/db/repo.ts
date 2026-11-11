import { DEFAULT_CATEGORIES } from '../domain/categories';
import type { CurrencyCode } from '../domain/money';
import {
  DEFAULT_SETTINGS,
  type AppData,
  type Budget,
  type Category,
  type Debt,
  type Goal,
  type Settings,
  type Tx,
} from '../domain/types';
import type { SqlDriver } from './driver';
import { MIGRATIONS } from './schema';

interface TxRow {
  id: string;
  kind: Tx['kind'];
  wallet: Tx['wallet'];
  date: string;
  amount_minor: number;
  currency: CurrencyCode;
  rate_micro: number;
  bdt_minor: number;
  base_currency: CurrencyCode;
  base_minor: number;
  fee_bdt_minor: number;
  fee_base_minor: number;
  category_id: string | null;
  person: string | null;
  method: string | null;
  reference: string | null;
  note: string | null;
  debt_id: string | null;
  goal_id: string | null;
  created_at: number;
}

const toTx = (r: TxRow): Tx => ({
  id: r.id,
  kind: r.kind,
  wallet: r.wallet,
  date: r.date,
  amountMinor: r.amount_minor,
  currency: r.currency,
  rateMicro: r.rate_micro,
  bdtMinor: r.bdt_minor,
  baseCurrency: r.base_currency,
  baseMinor: r.base_minor,
  feeBdtMinor: r.fee_bdt_minor,
  feeBaseMinor: r.fee_base_minor,
  categoryId: r.category_id,
  person: r.person,
  method: r.method,
  reference: r.reference,
  note: r.note,
  debtId: r.debt_id,
  goalId: r.goal_id,
  createdAt: r.created_at,
});

/** All persistence goes through this class; screens never touch SQL. */
export class Repo {
  constructor(private db: SqlDriver) {}

  async init(): Promise<void> {
    await this.db.exec('PRAGMA foreign_keys = ON;');
    const [{ user_version }] = await this.db.all<{ user_version: number }>('PRAGMA user_version');
    for (let v = user_version; v < MIGRATIONS.length; v++) {
      await this.db.exec(`BEGIN; ${MIGRATIONS[v]} PRAGMA user_version = ${v + 1}; COMMIT;`);
    }
    await this.seedCategories();
  }

  private async seedCategories(): Promise<void> {
    for (const c of DEFAULT_CATEGORIES) {
      await this.db.run(
        `INSERT OR IGNORE INTO categories (id, scope, grp, bn, en, icon, sort, custom) VALUES (?,?,?,?,?,?,?,0)`,
        [c.id, c.scope, c.group, c.bn, c.en, c.icon, c.sort],
      );
    }
  }

  async loadAll(): Promise<AppData> {
    const settingRows = await this.db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settings: Settings = { ...DEFAULT_SETTINGS };
    for (const r of settingRows) {
      if (r.key in settings) {
        try {
          (settings as unknown as Record<string, unknown>)[r.key] = JSON.parse(r.value);
        } catch {
          // ignore a corrupt value and keep the default
        }
      }
    }
    const categories = (
      await this.db.all<{
        id: string;
        scope: Category['scope'];
        grp: Category['group'];
        bn: string;
        en: string;
        icon: string;
        sort: number;
        custom: number;
      }>('SELECT * FROM categories ORDER BY scope, sort, bn')
    ).map((r) => ({ id: r.id, scope: r.scope, group: r.grp, bn: r.bn, en: r.en, icon: r.icon, sort: r.sort, custom: !!r.custom }));
    const txs = (await this.db.all<TxRow>('SELECT * FROM transactions ORDER BY date DESC, created_at DESC')).map(toTx);
    const debts = (
      await this.db.all<{
        id: string;
        direction: Debt['direction'];
        person: string;
        wallet: Debt['wallet'];
        currency: CurrencyCode;
        due_date: string | null;
        monthly_minor: number;
        note: string | null;
        created_at: number;
      }>('SELECT * FROM debts ORDER BY created_at DESC')
    ).map((r) => ({
      id: r.id,
      direction: r.direction,
      person: r.person,
      wallet: r.wallet,
      currency: r.currency,
      dueDate: r.due_date,
      monthlyMinor: r.monthly_minor,
      note: r.note,
      createdAt: r.created_at,
    }));
    const goals = (
      await this.db.all<{
        id: string;
        name: string;
        icon: string;
        currency: CurrencyCode;
        target_minor: number;
        opening_minor: number;
        target_date: string | null;
        created_at: number;
      }>('SELECT * FROM goals ORDER BY created_at')
    ).map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      currency: r.currency,
      targetMinor: r.target_minor,
      openingMinor: r.opening_minor,
      targetDate: r.target_date,
      createdAt: r.created_at,
    }));
    const budgets = (
      await this.db.all<{ category_id: string; limit_minor: number; currency: CurrencyCode }>('SELECT * FROM budgets')
    ).map((r) => ({ categoryId: r.category_id, limitMinor: r.limit_minor, currency: r.currency }));
    return { settings, categories, txs, debts, goals, budgets };
  }

  async saveSettings(patch: Partial<Settings>): Promise<void> {
    for (const [k, v] of Object.entries(patch)) {
      await this.db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [k, JSON.stringify(v)],
      );
    }
  }

  async upsertTx(t: Tx): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO transactions
        (id, kind, wallet, date, amount_minor, currency, rate_micro, bdt_minor, base_currency, base_minor,
         fee_bdt_minor, fee_base_minor, category_id, person, method, reference, note, debt_id, goal_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        t.id, t.kind, t.wallet, t.date, t.amountMinor, t.currency, t.rateMicro, t.bdtMinor, t.baseCurrency,
        t.baseMinor, t.feeBdtMinor, t.feeBaseMinor, t.categoryId, t.person, t.method, t.reference, t.note,
        t.debtId, t.goalId, t.createdAt,
      ],
    );
    if (t.currency !== 'BDT') await this.saveRate(t.currency, t.date, t.rateMicro);
  }

  async deleteTx(id: string): Promise<void> {
    await this.db.run('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async saveRate(currency: CurrencyCode, date: string, rateMicro: number, source = 'manual'): Promise<void> {
    await this.db.run(
      `INSERT INTO exchange_rates (currency, date, rate_micro, source) VALUES (?,?,?,?)
       ON CONFLICT(currency, date) DO UPDATE SET rate_micro = excluded.rate_micro, source = excluded.source`,
      [currency, date, rateMicro, source],
    );
  }

  async upsertDebt(d: Debt): Promise<void> {
    await this.db.run(
      `INSERT INTO debts (id, direction, person, wallet, currency, due_date, monthly_minor, note, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET person = excluded.person, due_date = excluded.due_date,
         monthly_minor = excluded.monthly_minor, note = excluded.note`,
      [d.id, d.direction, d.person, d.wallet, d.currency, d.dueDate, d.monthlyMinor, d.note, d.createdAt],
    );
  }

  /** Deletes the debt and (ON DELETE CASCADE) every transaction linked to it. */
  async deleteDebt(id: string): Promise<void> {
    await this.db.run('DELETE FROM debts WHERE id = ?', [id]);
  }

  async upsertGoal(g: Goal): Promise<void> {
    await this.db.run(
      `INSERT INTO goals (id, name, icon, currency, target_minor, opening_minor, target_date, created_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon,
         target_minor = excluded.target_minor, opening_minor = excluded.opening_minor,
         target_date = excluded.target_date`,
      [g.id, g.name, g.icon, g.currency, g.targetMinor, g.openingMinor, g.targetDate, g.createdAt],
    );
  }

  async deleteGoal(id: string): Promise<void> {
    await this.db.run('DELETE FROM goals WHERE id = ?', [id]);
  }

  async setBudget(b: Budget): Promise<void> {
    if (b.limitMinor <= 0) {
      await this.db.run('DELETE FROM budgets WHERE category_id = ?', [b.categoryId]);
      return;
    }
    await this.db.run(
      `INSERT INTO budgets (category_id, limit_minor, currency) VALUES (?,?,?)
       ON CONFLICT(category_id) DO UPDATE SET limit_minor = excluded.limit_minor, currency = excluded.currency`,
      [b.categoryId, b.limitMinor, b.currency],
    );
  }

  async addCategory(c: Category): Promise<void> {
    await this.db.run(
      'INSERT INTO categories (id, scope, grp, bn, en, icon, sort, custom) VALUES (?,?,?,?,?,?,?,1)',
      [c.id, c.scope, c.group, c.bn, c.en, c.icon, c.sort],
    );
  }

  /** Erases every piece of user data. Default categories are re-seeded. */
  async wipe(): Promise<void> {
    await this.db.exec(
      'DELETE FROM transactions; DELETE FROM budgets; DELETE FROM debts; DELETE FROM goals; DELETE FROM exchange_rates; DELETE FROM settings; DELETE FROM categories;',
    );
    await this.seedCategories();
  }
}
