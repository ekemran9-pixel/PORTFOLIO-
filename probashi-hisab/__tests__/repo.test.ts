import { DatabaseSync } from 'node:sqlite';

import type { SqlDriver, SqlValue } from '../src/db/driver';
import { Repo } from '../src/db/repo';
import { DEFAULT_CATEGORIES } from '../src/domain/categories';
import { summarize, monthPeriod } from '../src/domain/summary';
import { sheetData } from './helpers';

function memoryDriver(): SqlDriver {
  const db = new DatabaseSync(':memory:');
  return {
    exec: async (sql) => void db.exec(sql),
    run: async (sql, params: SqlValue[] = []) => void db.prepare(sql).run(...params),
    all: async <T>(sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as T[],
  };
}

describe('Repo (real SQLite, in memory)', () => {
  it('migrates, seeds categories and is safe to init twice', async () => {
    const driver = memoryDriver();
    const repo = new Repo(driver);
    await repo.init();
    await repo.init();
    const data = await repo.loadAll();
    expect(data.categories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(data.settings.onboarded).toBe(false);
    expect(data.txs).toEqual([]);
  });

  it('round-trips every entity and reproduces the same summary after reload', async () => {
    const repo = new Repo(memoryDriver());
    await repo.init();
    const src = sheetData();
    await repo.saveSettings(src.settings);
    for (const d of src.debts) await repo.upsertDebt(d);
    for (const t of src.txs) await repo.upsertTx(t);
    await repo.upsertGoal({ id: 'g1', name: 'জমি', icon: 'map-outline', currency: 'SAR', targetMinor: 5_000_000, openingMinor: 0, targetDate: null, createdAt: 1 });
    await repo.setBudget({ categoryId: 'exp_food', limitMinor: 60_000, currency: 'SAR' });

    const data = await repo.loadAll();
    expect(data.settings).toEqual(src.settings);
    expect(data.txs).toHaveLength(src.txs.length);
    expect(data.txs.find((t) => t.person === 'মা')).toMatchObject({ wallet: 'home', bdtMinor: 1_000_000 });
    expect(data.goals[0].name).toBe('জমি');
    expect(data.budgets).toEqual([{ categoryId: 'exp_food', limitMinor: 60_000, currency: 'SAR' }]);
    const p = monthPeriod('2026-11');
    expect(summarize(data.txs, data.categories, data.settings, p)).toEqual(
      summarize(src.txs, src.categories, src.settings, p),
    );
  });

  it('edits, deletes, cascades and wipes', async () => {
    const repo = new Repo(memoryDriver());
    await repo.init();
    const src = sheetData();
    for (const d of src.debts) await repo.upsertDebt(d);
    for (const t of src.txs) await repo.upsertTx(t);

    const salary = src.txs.find((t) => t.kind === 'income')!;
    await repo.upsertTx({ ...salary, amountMinor: 450_000, baseMinor: 450_000, bdtMinor: 14_580_000 });
    await repo.deleteTx(src.txs.find((t) => t.categoryId === 'exp_mobile')!.id);
    await repo.deleteDebt('d_rizwan'); // removes its 1,800 SAR transaction too
    await repo.setBudget({ categoryId: 'exp_food', limitMinor: 0, currency: 'SAR' });

    let data = await repo.loadAll();
    expect(data.txs).toHaveLength(src.txs.length - 2);
    expect(data.txs.find((t) => t.id === salary.id)!.amountMinor).toBe(450_000);
    expect(data.txs.some((t) => t.debtId === 'd_rizwan')).toBe(false);

    await repo.wipe();
    data = await repo.loadAll();
    expect(data.txs).toEqual([]);
    expect(data.debts).toEqual([]);
    expect(data.categories).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('refuses invalid rows at the database level', async () => {
    const repo = new Repo(memoryDriver());
    await repo.init();
    const t = sheetData().txs[1];
    await expect(repo.upsertTx({ ...t, amountMinor: 0 })).rejects.toThrow();
    await expect(repo.upsertTx({ ...t, kind: 'bogus' as never })).rejects.toThrow();
  });
});
